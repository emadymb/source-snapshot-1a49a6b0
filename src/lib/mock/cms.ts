// Mock CMS store — Pages, BlogPosts, Menus, Theme. Backed by localStorage.
// Simulates workspace-scoped RLS via workspaceId filter helpers.
import { useSyncExternalStore } from "react";

export type PageStatus = "published" | "draft" | "archived";

export type CmsPage = {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  content: string; // HTML from TipTap
  status: PageStatus;
  metaTitle: string;
  metaDescription: string;
  createdBy: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type BlogPost = {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string; // data URL (in-memory)
  categoryId?: string;
  tags: string[];
  status: PageStatus;
  publishedAt?: number;
  authorId: string;
  createdAt: number;
  updatedAt: number;
};

export type MenuItem = {
  id: string;
  label: string;
  url: string;
  children?: MenuItem[];
};

export type Menu = {
  id: string;
  workspaceId: string;
  name: string;
  location: "header" | "footer";
  items: MenuItem[];
  updatedAt: number;
};

export type Theme = {
  id: string;
  workspaceId: string;
  primaryColor: string;
  darkModeEnabled: boolean;
  rtlEnabled: boolean;
};

export type CmsActivity = {
  id: string;
  workspaceId: string;
  actor: string;
  action: string;
  target: string;
  at: number;
};

type State = {
  pages: CmsPage[];
  posts: BlogPost[];
  menus: Menu[];
  themes: Theme[];
  activity: CmsActivity[];
};

const STORAGE_KEY = "fiksu.cms.store.v1";
const WS = "ws_demo";
const USER = "user_super";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF]+/g, (m) => m) // keep arabic
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .slice(0, 80);
}

function seed(): State {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const pages: CmsPage[] = [
    { id: uid("p"), workspaceId: WS, title: "الصفحة الرئيسية", slug: "home", content: "<h1>مرحباً بك في Fiksu</h1><p>منصة المحاسبة الذكية.</p>", status: "published", metaTitle: "Fiksu — Home", metaDescription: "منصة محاسبة ذكية", createdBy: USER, order: 0, createdAt: now - 20 * day, updatedAt: now - day },
    { id: uid("p"), workspaceId: WS, title: "من نحن", slug: "about", content: "<h2>عن Fiksu</h2><p>نحن نبني مستقبل المحاسبة.</p>", status: "published", metaTitle: "About Fiksu", metaDescription: "About us", createdBy: USER, order: 1, createdAt: now - 15 * day, updatedAt: now - 2 * day },
    { id: uid("p"), workspaceId: WS, title: "الأسعار", slug: "pricing", content: "<h2>خططنا</h2><p>ابدأ مجاناً.</p>", status: "published", metaTitle: "Pricing", metaDescription: "Plans", createdBy: USER, order: 2, createdAt: now - 10 * day, updatedAt: now - 3 * day },
    { id: uid("p"), workspaceId: WS, title: "تواصل معنا", slug: "contact", content: "<p>راسلنا على hello@fiksu.fi</p>", status: "draft", metaTitle: "Contact", metaDescription: "Contact us", createdBy: USER, order: 3, createdAt: now - 5 * day, updatedAt: now - day },
  ];
  const posts: BlogPost[] = [
    { id: uid("b"), workspaceId: WS, title: "ماهي ضريبة القيمة المضافة في فنلندا؟", slug: "vat-finland", excerpt: "دليل موجز لضريبة القيمة المضافة الفنلندية.", content: "<p>المعدل القياسي هو 25.5%.</p>", tags: ["ضريبة", "فنلندا"], status: "published", publishedAt: now - 3 * day, authorId: USER, createdAt: now - 4 * day, updatedAt: now - 3 * day },
    { id: uid("b"), workspaceId: WS, title: "أفضل ممارسات إدارة الفواتير", slug: "invoice-best-practices", excerpt: "نصائح لتسريع دورة تحصيل الفواتير.", content: "<p>أرسل التذكيرات مبكراً.</p>", tags: ["فواتير", "نصائح"], status: "published", publishedAt: now - 6 * day, authorId: USER, createdAt: now - 7 * day, updatedAt: now - 6 * day },
    { id: uid("b"), workspaceId: WS, title: "مسودة: خارطة طريق 2026", slug: "roadmap-2026", excerpt: "ما القادم في Fiksu.", content: "<p>...</p>", tags: ["منتج"], status: "draft", authorId: USER, createdAt: now - day, updatedAt: now - day },
  ];
  const menus: Menu[] = [
    {
      id: uid("m"), workspaceId: WS, name: "Main Header", location: "header", updatedAt: now,
      items: [
        { id: uid("mi"), label: "الرئيسية", url: "/" },
        { id: uid("mi"), label: "المنتج", url: "/product", children: [
          { id: uid("mi"), label: "الميزات", url: "/features" },
          { id: uid("mi"), label: "الأسعار", url: "/pricing" },
        ]},
        { id: uid("mi"), label: "المدونة", url: "/blog" },
        { id: uid("mi"), label: "تواصل", url: "/contact" },
      ],
    },
    {
      id: uid("m"), workspaceId: WS, name: "Footer", location: "footer", updatedAt: now,
      items: [
        { id: uid("mi"), label: "الشروط", url: "/terms" },
        { id: uid("mi"), label: "الخصوصية", url: "/privacy" },
      ],
    },
  ];
  const themes: Theme[] = [
    { id: uid("t"), workspaceId: WS, primaryColor: "#6366f1", darkModeEnabled: true, rtlEnabled: true },
  ];
  const activity: CmsActivity[] = [
    { id: uid("a"), workspaceId: WS, actor: "Super Admin", action: "نشر", target: "الصفحة الرئيسية", at: now - day },
    { id: uid("a"), workspaceId: WS, actor: "Super Admin", action: "أنشأ", target: "مقال: خارطة طريق 2026", at: now - day },
    { id: uid("a"), workspaceId: WS, actor: "Super Admin", action: "عدّل", target: "قائمة Main Header", at: now - 2 * day },
  ];
  return { pages, posts, menus, themes, activity };
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

function logActivity(action: string, target: string) {
  const a: CmsActivity = { id: uid("a"), workspaceId: WS, actor: "Super Admin", action, target, at: Date.now() };
  state = { ...state, activity: [a, ...state.activity].slice(0, 100) };
}

// Simulated RLS: workspace scoping. In production this becomes a Postgres policy.
export function canAccessWorkspace(_userId: string, workspaceId: string) {
  return workspaceId === WS;
}

export const cmsStore = {
  getState: () => state,
  subscribe,

  // Pages
  listPages(q?: string) {
    const list = state.pages.filter((p) => canAccessWorkspace(USER, p.workspaceId));
    if (!q) return [...list].sort((a, b) => a.order - b.order);
    const s = q.toLowerCase();
    return list.filter((p) => p.title.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s));
  },
  createPage(input: Partial<CmsPage> & { title: string }) {
    const now = Date.now();
    const page: CmsPage = {
      id: uid("p"),
      workspaceId: WS,
      title: input.title,
      slug: input.slug || slugify(input.title),
      content: input.content || "",
      status: input.status || "draft",
      metaTitle: input.metaTitle || input.title,
      metaDescription: input.metaDescription || "",
      createdBy: USER,
      order: state.pages.length,
      createdAt: now,
      updatedAt: now,
    };
    state = { ...state, pages: [...state.pages, page] };
    logActivity("أنشأ", `صفحة: ${page.title}`);
    persist();
    return page;
  },
  updatePage(id: string, patch: Partial<CmsPage>) {
    state = {
      ...state,
      pages: state.pages.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
    };
    const p = state.pages.find((x) => x.id === id);
    if (p) logActivity("عدّل", `صفحة: ${p.title}`);
    persist();
  },
  deletePage(id: string) {
    const p = state.pages.find((x) => x.id === id);
    state = { ...state, pages: state.pages.filter((x) => x.id !== id) };
    if (p) logActivity("حذف", `صفحة: ${p.title}`);
    persist();
  },
  reorderPages(orderedIds: string[]) {
    const map = new Map(orderedIds.map((id, i) => [id, i]));
    state = {
      ...state,
      pages: state.pages.map((p) => (map.has(p.id) ? { ...p, order: map.get(p.id)! } : p)),
    };
    logActivity("رتّب", "الصفحات");
    persist();
  },

  // Blog
  listPosts(q?: string) {
    const list = state.posts.filter((p) => canAccessWorkspace(USER, p.workspaceId));
    if (!q) return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    const s = q.toLowerCase();
    return list.filter((p) => p.title.toLowerCase().includes(s) || p.tags.some((t) => t.toLowerCase().includes(s)));
  },
  createPost(input: Partial<BlogPost> & { title: string }) {
    const now = Date.now();
    const post: BlogPost = {
      id: uid("b"),
      workspaceId: WS,
      title: input.title,
      slug: input.slug || slugify(input.title),
      excerpt: input.excerpt || "",
      content: input.content || "",
      featuredImage: input.featuredImage,
      tags: input.tags || [],
      status: input.status || "draft",
      publishedAt: input.status === "published" ? now : undefined,
      authorId: USER,
      createdAt: now,
      updatedAt: now,
    };
    state = { ...state, posts: [post, ...state.posts] };
    logActivity("أنشأ", `مقال: ${post.title}`);
    persist();
    return post;
  },
  updatePost(id: string, patch: Partial<BlogPost>) {
    state = {
      ...state,
      posts: state.posts.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch, updatedAt: Date.now() };
        if (patch.status === "published" && !p.publishedAt) next.publishedAt = Date.now();
        return next;
      }),
    };
    const p = state.posts.find((x) => x.id === id);
    if (p) logActivity("عدّل", `مقال: ${p.title}`);
    persist();
  },
  deletePost(id: string) {
    const p = state.posts.find((x) => x.id === id);
    state = { ...state, posts: state.posts.filter((x) => x.id !== id) };
    if (p) logActivity("حذف", `مقال: ${p.title}`);
    persist();
  },

  // Menus
  listMenus() {
    return state.menus.filter((m) => canAccessWorkspace(USER, m.workspaceId));
  },
  updateMenu(id: string, items: MenuItem[]) {
    state = {
      ...state,
      menus: state.menus.map((m) => (m.id === id ? { ...m, items, updatedAt: Date.now() } : m)),
    };
    const m = state.menus.find((x) => x.id === id);
    if (m) logActivity("عدّل", `قائمة ${m.name}`);
    persist();
  },
  addMenuItem(menuId: string, item: Omit<MenuItem, "id">) {
    const it: MenuItem = { ...item, id: uid("mi") };
    state = {
      ...state,
      menus: state.menus.map((m) => (m.id === menuId ? { ...m, items: [...m.items, it], updatedAt: Date.now() } : m)),
    };
    persist();
  },
  removeMenuItem(menuId: string, itemId: string) {
    state = {
      ...state,
      menus: state.menus.map((m) =>
        m.id === menuId ? { ...m, items: m.items.filter((i) => i.id !== itemId), updatedAt: Date.now() } : m,
      ),
    };
    persist();
  },

  reset() { state = seed(); persist(); },
};

export function useCmsStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
