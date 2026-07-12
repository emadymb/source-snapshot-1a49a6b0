// Seed script — run with:  bun run db:seed  (after `docker compose up -d` and migrations)
// Creates a demo firm workspace, a demo client workspace, and one user per role.
// Credentials come from src/lib/auth/demo-users.server.ts (single source of truth).

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password.server";
import { DEMO_USERS } from "../src/lib/auth/demo-users.server";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // One user per role, each with its own strong password (shared with demo mode).
  const users = DEMO_USERS.map((u) => ({
    email: u.email, fullName: u.fullName, role: u.role, password: u.password,
  }));

  const created: Record<string, string> = {};
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, isActive: true, emailVerified: true, passwordHash },
      create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash, isActive: true, emailVerified: true },
    });
    created[u.role] = rec.id;
    await prisma.profile.upsert({
      where: { userId: rec.id },
      update: {},
      create: { userId: rec.id, locale: "en" },
    });
  }


  const created: Record<string, string> = {};
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, isActive: true, emailVerified: true, passwordHash },
      create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash, isActive: true, emailVerified: true },
    });
    created[u.role] = rec.id;
    await prisma.profile.upsert({
      where: { userId: rec.id },
      update: {},
      create: { userId: rec.id, locale: "en" },
    });
  }


  // Firm workspace owned by the firm admin.
  const firm = await prisma.workspace.upsert({
    where: { slug: "fiksu-firm" },
    update: {},
    create: { name: "Fiksu Accounting Oy", slug: "fiksu-firm", kind: "FIRM", ownerId: created.FIRM_ADMIN },
  });

  // Client workspace + company owned by the client owner.
  const client = await prisma.workspace.upsert({
    where: { slug: "acme-oy" },
    update: {},
    create: { name: "Acme Oy", slug: "acme-oy", kind: "CLIENT", ownerId: created.CLIENT_OWNER },
  });
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000c0" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-0000000000c0",
      workspaceId: client.id, name: "Acme Oy", businessId: "1234567-8", country: "FI",
    },
  });

  const memberships: Array<[string, string, (typeof users)[number]["role"]]> = [
    [created.FIRM_ADMIN, firm.id, "FIRM_ADMIN"],
    [created.ACCOUNTANT, firm.id, "ACCOUNTANT"],
    [created.CLIENT_OWNER, client.id, "CLIENT_OWNER"],
    [created.CLIENT_EMPLOYEE, client.id, "CLIENT_EMPLOYEE"],
    [created.CLIENT_TEAM_MEMBER, client.id, "CLIENT_TEAM_MEMBER"],
  ];
  for (const [userId, workspaceId, role] of memberships) {
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      update: { role },
      create: { userId, workspaceId, role },
    });
  }

  await prisma.profile.update({
    where: { userId: created.CLIENT_OWNER },
    data: { activeWorkspaceId: client.id, activeCompanyId: company.id },
  });

  // ------------------------------------------------------------------
  // Subscription plans (platform-wide)
  // ------------------------------------------------------------------
  const allModules = ["cms", "accounting", "ai", "hrm", "finvoice", "documents", "reports"];
  const plans = [
    { slug: "starter", name: "Starter", kind: "PAID" as const, interval: "MONTHLY" as const, priceCents: 2900, maxUsers: 3, maxCompanies: 1, maxInvoices: 50, trialDays: 14, entitlements: { modules: ["cms", "accounting", "documents"] } },
    { slug: "growth", name: "Growth", kind: "PAID" as const, interval: "MONTHLY" as const, priceCents: 8900, maxUsers: 10, maxCompanies: 3, maxInvoices: 500, trialDays: 14, entitlements: { modules: ["cms", "accounting", "ai", "hrm", "documents", "reports"] } },
    { slug: "scale", name: "Scale", kind: "PAID" as const, interval: "MONTHLY" as const, priceCents: 24900, maxUsers: 30, maxCompanies: 10, maxInvoices: 5000, trialDays: 0, entitlements: { modules: allModules } },
    { slug: "enterprise", name: "Enterprise", kind: "PRIVATE" as const, interval: "YEARLY" as const, priceCents: 999000, maxUsers: null, maxCompanies: null, maxInvoices: null, trialDays: 0, entitlements: { modules: allModules } },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  const growth = await prisma.subscriptionPlan.findUnique({ where: { slug: "growth" } });
  if (growth) {
    const existingSub = await prisma.subscription.findFirst({ where: { workspaceId: client.id } });
    if (!existingSub) {
      await prisma.subscription.create({
        data: { workspaceId: client.id, companyId: company.id, planId: growth.id, status: "ACTIVE",
          endsAt: new Date(Date.now() + 30 * 864e5) },
      });
    }
  }

  // ------------------------------------------------------------------
  // CMS content (super admin resolves to the firm workspace)
  // ------------------------------------------------------------------
  await prisma.page.deleteMany({ where: { workspaceId: firm.id } });
  await prisma.page.createMany({
    data: [
      { workspaceId: firm.id, createdBy: created.SUPER_ADMIN, title: "Home", slug: "home", status: "PUBLISHED", sortOrder: 0, content: "<h1>Welcome to Fiksu</h1><p>AI-native accounting.</p>", metaTitle: "Fiksu — Home", metaDescription: "AI-native accounting & ERP" },
      { workspaceId: firm.id, createdBy: created.SUPER_ADMIN, title: "About", slug: "about", status: "PUBLISHED", sortOrder: 1, content: "<h2>About Fiksu</h2>", metaTitle: "About", metaDescription: "About us" },
      { workspaceId: firm.id, createdBy: created.SUPER_ADMIN, title: "Pricing", slug: "pricing", status: "PUBLISHED", sortOrder: 2, content: "<h2>Plans</h2>", metaTitle: "Pricing", metaDescription: "Plans" },
      { workspaceId: firm.id, createdBy: created.SUPER_ADMIN, title: "Contact", slug: "contact", status: "DRAFT", sortOrder: 3, content: "<p>hello@fiksu.fi</p>", metaTitle: "Contact", metaDescription: "Contact us" },
    ],
  });
  await prisma.blogPost.deleteMany({ where: { workspaceId: firm.id } });
  await prisma.blogPost.createMany({
    data: [
      { workspaceId: firm.id, authorId: created.SUPER_ADMIN, title: "Finnish VAT explained", slug: "vat-finland", excerpt: "A short guide to Finnish VAT.", content: "<p>Standard rate is 25.5%.</p>", tags: ["tax", "finland"], status: "PUBLISHED", publishedAt: new Date(Date.now() - 3 * 864e5) },
      { workspaceId: firm.id, authorId: created.SUPER_ADMIN, title: "Invoicing best practices", slug: "invoice-best-practices", excerpt: "Speed up your cash cycle.", content: "<p>Send reminders early.</p>", tags: ["invoices"], status: "PUBLISHED", publishedAt: new Date(Date.now() - 6 * 864e5) },
      { workspaceId: firm.id, authorId: created.SUPER_ADMIN, title: "Draft: 2026 roadmap", slug: "roadmap-2026", excerpt: "What's next.", content: "<p>...</p>", tags: ["product"], status: "DRAFT" },
    ],
  });
  await prisma.menu.deleteMany({ where: { workspaceId: firm.id } });
  await prisma.menu.create({
    data: { workspaceId: firm.id, name: "Main Header", location: "header",
      items: [{ label: "Home", url: "/" }, { label: "Pricing", url: "/pricing" }, { label: "Blog", url: "/blog" }] },
  });
  await prisma.theme.upsert({
    where: { workspaceId: firm.id },
    update: {},
    create: { workspaceId: firm.id, primaryColor: "#6366f1", darkModeEnabled: true, rtlEnabled: true },
  });

  // ------------------------------------------------------------------
  // Accounting (client company)
  // ------------------------------------------------------------------
  await prisma.chartOfAccount.deleteMany({ where: { companyId: company.id } });
  await prisma.chartOfAccount.createMany({
    data: [
      { companyId: company.id, code: "1000", name: "Cash", type: "ASSET" },
      { companyId: company.id, code: "1100", name: "Accounts Receivable", type: "ASSET" },
      { companyId: company.id, code: "2000", name: "Accounts Payable", type: "LIABILITY" },
      { companyId: company.id, code: "3000", name: "Equity", type: "EQUITY" },
      { companyId: company.id, code: "4000", name: "Sales Revenue", type: "INCOME" },
      { companyId: company.id, code: "5000", name: "Operating Expenses", type: "EXPENSE" },
    ],
  });
  const cust = await prisma.customer.create({
    data: { companyId: company.id, name: "Nordic Retail Oy", vatId: "FI98765432", country: "FI", email: "billing@nordicretail.fi" },
  });
  const inv = await prisma.invoice.upsert({
    where: { companyId_number: { companyId: company.id, number: "INV-2026-0001" } },
    update: {},
    create: {
      companyId: company.id, customerId: cust.id, number: "INV-2026-0001", status: "SENT",
      dueDate: new Date(Date.now() + 14 * 864e5), subtotalCents: 100000, taxCents: 25500, totalCents: 125500,
      items: { create: [{ description: "Consulting", qty: 10, unitPriceCents: 10000, vatRate: 25.5, lineTotalCents: 100000 }] },
    },
  });
  console.log("Seeded invoice", inv.number);

  // ------------------------------------------------------------------
  // HRM (client workspace)
  // ------------------------------------------------------------------
  const emp = await prisma.employee.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000e1" },
    update: {},
    create: { id: "00000000-0000-0000-0000-0000000000e1", workspaceId: client.id, companyId: company.id,
      userId: created.CLIENT_EMPLOYEE, fullName: "Emma Employee", email: "employee@fiksu.dev",
      department: "Operations", position: "Coordinator", baseSalaryCents: 320000 },
  });
  await prisma.payroll.upsert({
    where: { employeeId_month_year: { employeeId: emp.id, month: 1, year: 2026 } },
    update: {},
    create: { workspaceId: client.id, employeeId: emp.id, month: 1, year: 2026,
      baseCents: 320000, allowancesCents: 20000, deductionsCents: 48000, netCents: 292000, status: "PAID" },
  });
  await prisma.leaveType.deleteMany({ where: { workspaceId: client.id } });
  await prisma.leaveType.createMany({
    data: [
      { workspaceId: client.id, name: "Annual", annualDays: 25 },
      { workspaceId: client.id, name: "Sick", annualDays: 10 },
    ],
  });

  // ------------------------------------------------------------------
  // AI usage logs + a lead
  // ------------------------------------------------------------------
  await prisma.aiUsageLog.createMany({
    data: [
      { workspaceId: client.id, userId: created.CLIENT_OWNER, model: "google/gemini-2.5-flash", kind: "ocr", tokensIn: 1200, tokensOut: 300, costCents: 0.25, latencyMs: 850, success: true },
      { workspaceId: client.id, userId: created.CLIENT_OWNER, model: "deepseek/deepseek-chat", kind: "chat", tokensIn: 800, tokensOut: 450, costCents: 0.12, latencyMs: 1200, success: true },
    ],
  });
  const anyLead = await prisma.lead.findFirst({ where: { workspaceId: firm.id } });
  if (!anyLead) {
    await prisma.lead.create({ data: { workspaceId: firm.id, name: "Website Visitor", email: "lead@example.com", source: "widget", status: "new" } });
  }

  console.log("Seed complete. Login credentials (email / password / role):");
  console.table(users.map((u) => ({ email: u.email, password: u.password, role: u.role })));

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
