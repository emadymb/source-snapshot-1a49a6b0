// CMS server functions — REAL data (Prisma + Postgres RLS).
//
// Every handler resolves the authenticated user from the access cookie and runs
// its queries through withTenant(), so Row Level Security scopes reads/writes to
// the caller's workspace. Mutations are audited into audit_logs.
//
// Returned DTOs mirror the shapes the CMS UI already consumes (lowercase
// status, epoch-ms timestamps) so routes can switch from the mock store with
// minimal churn.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ContentStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
export type UiStatus = "published" | "draft" | "archived";

export interface PageDTO {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: UiStatus;
  metaTitle: string;
  metaDescription: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface PostDTO {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId?: string;
  tags: string[];
  status: UiStatus;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}

const toDbStatus = (s?: UiStatus): ContentStatus =>
  s === "published" ? "PUBLISHED" : s === "archived" ? "ARCHIVED" : "DRAFT";
const fromDbStatus = (s: ContentStatus): UiStatus =>
  s === "PUBLISHED" ? "published" : s === "ARCHIVED" ? "archived" : "draft";
const ms = (d: Date | null | undefined) => (d ? d.getTime() : undefined);

// ---------------------------------------------------------------------------
// Shared server-side helpers (lazy imports keep them off the client bundle)
// ---------------------------------------------------------------------------
async function ctx() {
  const { requireSession, resolveWorkspaceId } = await import("./auth/session.server");
  const session = await requireSession();
  const workspaceId = await resolveWorkspaceId(session.userId, session.role);
  if (!workspaceId) throw new Error("No workspace available for this account.");
  return { session, workspaceId };
}

async function audit(
  userId: string,
  workspaceId: string,
  action: string,
  entity: string,
  entityId: string,
) {
  const { withTenant } = await import("./db.server");
  await withTenant(userId, (tx) =>
    tx.auditLog.create({ data: { userId, workspaceId, action, entity, entityId } }),
  );
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
export const listPages = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; page?: number; pageSize?: number } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<{ items: PageDTO[]; total: number; page: number; pageSize: number }> => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const page = data.page ?? 1;
    const size = data.pageSize ?? 50;
    const where = {
      workspaceId,
      ...(data.q ? { title: { contains: data.q, mode: "insensitive" as const } } : {}),
    };
    return withTenant(session.userId, async (tx) => {
      const [rows, total] = await Promise.all([
        tx.page.findMany({ where, orderBy: { sortOrder: "asc" }, skip: (page - 1) * size, take: size }),
        tx.page.count({ where }),
      ]);
      return {
        items: rows.map((p): PageDTO => ({
          id: p.id, title: p.title, slug: p.slug, content: p.content,
          status: fromDbStatus(p.status), metaTitle: p.metaTitle, metaDescription: p.metaDescription,
          order: p.sortOrder, createdAt: p.createdAt.getTime(), updatedAt: p.updatedAt.getTime(),
        })),
        total, page, pageSize: size,
      };
    });
  });

const pageInput = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  content: z.string().max(200000).optional(),
  status: z.enum(["published", "draft", "archived"]).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(400).optional(),
});

export const createPage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pageInput.parse(d))
  .handler(async ({ data }) => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const created = await withTenant(session.userId, (tx) =>
      tx.page.create({
        data: {
          workspaceId, createdBy: session.userId,
          title: data.title, slug: data.slug || slugify(data.title),
          content: data.content ?? "", status: toDbStatus(data.status),
          metaTitle: data.metaTitle ?? data.title, metaDescription: data.metaDescription ?? "",
        },
      }),
    );
    await audit(session.userId, workspaceId, "create", "page", created.id);
    return { id: created.id };
  });

export const updatePage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Partial<z.infer<typeof pageInput>> }) => d)
  .handler(async ({ data }) => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const p = data.patch;
    await withTenant(session.userId, (tx) =>
      tx.page.update({
        where: { id: data.id },
        data: {
          ...(p.title !== undefined ? { title: p.title } : {}),
          ...(p.slug !== undefined ? { slug: p.slug } : {}),
          ...(p.content !== undefined ? { content: p.content } : {}),
          ...(p.status !== undefined ? { status: toDbStatus(p.status) } : {}),
          ...(p.metaTitle !== undefined ? { metaTitle: p.metaTitle } : {}),
          ...(p.metaDescription !== undefined ? { metaDescription: p.metaDescription } : {}),
        },
      }),
    );
    await audit(session.userId, workspaceId, "update", "page", data.id);
    return { ok: true };
  });

export const deletePage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.page.delete({ where: { id: data.id } }));
    await audit(session.userId, workspaceId, "delete", "page", data.id);
    return { ok: true };
  });

export const reorderPages = createServerFn({ method: "POST" })
  .inputValidator((d: { orderedIds: string[] }) => d)
  .handler(async ({ data }) => {
    const { session } = await ctx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, async (tx) => {
      for (let i = 0; i < data.orderedIds.length; i++) {
        await tx.page.update({ where: { id: data.orderedIds[i] }, data: { sortOrder: i } });
      }
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------
export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<PostDTO[]> => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const where = {
      workspaceId,
      ...(data.q ? { title: { contains: data.q, mode: "insensitive" as const } } : {}),
    };
    return withTenant(session.userId, async (tx) => {
      const rows = await tx.blogPost.findMany({ where, orderBy: { createdAt: "desc" } });
      return rows.map((b): PostDTO => ({
        id: b.id, title: b.title, slug: b.slug, excerpt: b.excerpt, content: b.content,
        featuredImage: b.featuredImage ?? undefined, categoryId: b.categoryId ?? undefined,
        tags: b.tags, status: fromDbStatus(b.status), publishedAt: ms(b.publishedAt),
        createdAt: b.createdAt.getTime(), updatedAt: b.updatedAt.getTime(),
      }));
    });
  });

const postInput = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().max(200000).optional(),
  featuredImage: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  status: z.enum(["published", "draft", "archived"]).optional(),
});

export const createPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => postInput.parse(d))
  .handler(async ({ data }) => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const status = toDbStatus(data.status);
    const created = await withTenant(session.userId, (tx) =>
      tx.blogPost.create({
        data: {
          workspaceId, authorId: session.userId,
          title: data.title, slug: data.slug || slugify(data.title),
          excerpt: data.excerpt ?? "", content: data.content ?? "",
          featuredImage: data.featuredImage, categoryId: data.categoryId,
          tags: data.tags ?? [], status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
      }),
    );
    await audit(session.userId, workspaceId, "create", "blog_post", created.id);
    return { id: created.id };
  });

export const updatePost = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: z.infer<typeof postInput> }) => d)
  .handler(async ({ data }) => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const p = data.patch;
    await withTenant(session.userId, (tx) =>
      tx.blogPost.update({
        where: { id: data.id },
        data: {
          ...(p.title !== undefined ? { title: p.title } : {}),
          ...(p.slug !== undefined ? { slug: p.slug } : {}),
          ...(p.excerpt !== undefined ? { excerpt: p.excerpt } : {}),
          ...(p.content !== undefined ? { content: p.content } : {}),
          ...(p.featuredImage !== undefined ? { featuredImage: p.featuredImage } : {}),
          ...(p.categoryId !== undefined ? { categoryId: p.categoryId } : {}),
          ...(p.tags !== undefined ? { tags: p.tags } : {}),
          ...(p.status !== undefined
            ? { status: toDbStatus(p.status), publishedAt: p.status === "published" ? new Date() : null }
            : {}),
        },
      }),
    );
    await audit(session.userId, workspaceId, "update", "blog_post", data.id);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.blogPost.delete({ where: { id: data.id } }));
    await audit(session.userId, workspaceId, "delete", "blog_post", data.id);
    return { ok: true };
  });
