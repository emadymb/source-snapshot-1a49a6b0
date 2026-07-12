# Fiksu — Intelligent Accounting & ERP Platform

Fiksu is a full-stack, multi-portal accounting and ERP SaaS built with **TanStack Start** (React 19 + Vite). It bundles a marketing website, an accounting-firm console, a client-facing accounting/ERP portal ("Momken" for clients), and a platform-level super-admin panel into a single type-safe, file-routed application.

> **Two portals · one platform** — *Fiksu for firms. Momken for their clients.*

The UI is fully built and driven by an in-memory mock data layer (no external database required to run), with real server functions wired for AI features and a public proxy to the Finnish Business Information System (YTJ/PRH).

---

## Table of Contents

- [Highlights](#highlights)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Application Portals & Routes](#application-portals--routes)
- [Core Libraries & Domain Logic](#core-libraries--domain-logic)
- [Server Functions & APIs](#server-functions--apis)
- [Internationalization](#internationalization)
- [Entitlements & Plan Gating](#entitlements--plan-gating)
- [Environment Variables](#environment-variables)
- [Embeddable Chat Widget](#embeddable-chat-widget)
- [Notes & Conventions](#notes--conventions)

---

## Highlights

- **Marketing site** — landing, features, pricing, services, integrations, security, legal (privacy/terms/cookies/DPA), help, and a CMS-driven blog.
- **Firm console** (`/firm`) — client book management, engagements, tasks, time tracking, invoicing, documents, staff, roles & permissions, audit trail, and reports for accounting firms.
- **Client portal** (`/client`) — a complete accounting/ERP suite: ledger, invoicing, POS, HRM & payroll, inventory, CRM, loyalty, banking, e-invoicing, AI assistant, receipt scanning, documents, billing, and insights. PWA-installable.
- **Super-admin panel** (`/super`) — SaaS control plane: plans & plan builder, subscriptions, workspaces, users, roles, payment gateways, coupons, invoices, CMS (pages/blog/menus), page builder, email templates, webhooks, announcements, modules catalog, security center, system health, audit, AI usage dashboards, and API docs.
- **AI features** — streaming AI accounting assistant via the Lovable AI Gateway (Gemini), plus client-side OCR receipt scanning with `tesseract.js` and a server-side OCR fallback.
- **Finnish market integration** — public proxy to the YTJ/PRH open data API for business-ID lookup during client registration.
- **Entitlements engine** — a canonical catalog of modules, toggles, quotas, and selects that gate every feature per plan/workspace.
- **Exports** — CSV and PDF export helpers for client data.

---

## Tech Stack

| Area | Technology |
|------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) v1 (SSR + server functions) |
| Router | TanStack Router v1 (file-based routing, auto-generated route tree) |
| UI runtime | React 19 + React DOM 19 |
| Build tool | Vite 8 via `@lovable.dev/vite-tanstack-config` |
| Server target | Nitro (Cloudflare Worker default) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + `tw-animate-css` |
| Components | shadcn/ui (Radix UI primitives) in `src/components/ui` |
| Data fetching | TanStack Query v5 |
| Forms & validation | React Hook Form + Zod v4 (`@hookform/resolvers`) |
| Charts | Recharts |
| AI | `ai` (Vercel AI SDK) + `@ai-sdk/react` + `@ai-sdk/openai-compatible` via Lovable AI Gateway |
| OCR | `tesseract.js` |
| Rich text | TipTap (`@tiptap/react`, `starter-kit`) |
| Drag & drop | `@hello-pangea/dnd` |
| Spreadsheets/export | `xlsx` |
| Dates | `date-fns` |
| Icons | `lucide-react` |
| Toasts | `sonner` |
| Language | TypeScript 5 (strict) |
| Lint/format | ESLint 9 + Prettier |

---

## Getting Started

Prerequisites: **Bun** (recommended) or Node.js 20+.

```bash
# Install dependencies
bun install

# Start the dev server (http://localhost:8080)
bun run dev
```

The app runs against an in-memory mock data layer, so it works out of the box with no database. AI chat requires `LOVABLE_API_KEY` (see [Environment Variables](#environment-variables)); everything else runs without secrets.

---

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Production build (Nitro/Cloudflare target) |
| `bun run build:dev` | Development-mode build (prerender check) |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bun run format` | Format the codebase with Prettier |

---

## Project Structure

```text
src/
├── router.tsx              # Router + QueryClient bootstrap
├── server.ts               # SSR entry / error wrapper
├── start.ts                # Client start (middleware)
├── styles.css              # Tailwind v4 design system (oklch tokens)
├── routeTree.gen.ts        # Auto-generated — do NOT edit
├── routes/                 # File-based routes (see below)
│   └── api/                # Server routes (chat, public YTJ proxy)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── accounting/         # Ledger, Invoices, Expenses, Reports, etc.
│   ├── ai/                 # OcrUploader
│   ├── cms/                # RichEditor (TipTap)
│   ├── client/             # ClientMobileShell, role switcher, exports, dialogs
│   ├── firm/               # FirmShell, PlanEntitlementsDrawer
│   ├── super/              # SuperShell
│   ├── marketing/          # MarketingShell
│   ├── registration/       # ClientRegisterWizard
│   ├── entitlements/       # GateBanner
│   └── screens/            # RichScreen
├── lib/
│   ├── ai-gateway.server.ts   # Lovable AI Gateway provider factory
│   ├── ai.functions.ts        # OCR fallback server fn
│   ├── cms.functions.ts       # CMS pages/posts server fns
│   ├── i18n.tsx               # EN/AR i18n context
│   ├── client-role.tsx        # Client portal RBAC roles
│   ├── entitlements/          # catalog.ts + store.tsx
│   ├── client/export.ts       # CSV/PDF export helpers
│   └── mock/                  # In-memory data stores & providers
└── hooks/
public/
├── widget.js               # Embeddable chat widget
├── manifest.webmanifest    # PWA manifest (client portal)
└── favicon.ico
```

---

## Application Portals & Routes

Routes use TanStack's flat dot-separated file naming (e.g. `client.accounting.pos.tsx` → `/client/accounting/pos`).

### Marketing & Public

`/` · `/about` · `/features` · `/pricing` · `/services` · `/integrations` · `/security` · `/help` · `/contact` · `/blog` · `/blog/$slug` · `/privacy` · `/terms` · `/cookies` · `/dpa` · `/c/$cardNumber` (loyalty/business card)

### Auth & Onboarding

`/login` · `/signup` · `/staff/login` · `/onboarding` · `/setup` · `/admin`

### Client Portal — `/client`

Dashboard (`/client`), Insights, Documents, Banking, Billing (+ `/billing/callback`), Firm billing, Scan (receipts), Tickets, Settings, and the **AI assistant** (`/client/ai`, `/client/ai/chat`).

**Accounting / ERP suite** — `/client/accounting/*`:

`accounts` · `analytics` · `attendance` · `cards` · `cash-boxes` · `commissions` · `contacts` · `crm` · `debt-overrides` · `drafts` · `e-invoices` · `employees` · `expenses` · `inventory` · `journals` · `ledger` · `locations` · `loyalty` · `payroll` · `pos` · `purchases` · `quotations` · `reports` · `salaries` · `sales` · `settings`

### Firm Console — `/firm`

`clients` · `clients-new` · `engagements` · `tasks` · `time` · `invoices` · `documents` · `staff` · `roles` · `reports` · `audit` · `settings`

### Super Admin — `/super`

`plans` · `plan-builder` · `subscriptions` · `workspaces` · `users` · `roles` · `team` · `requests` · `gateways` · `coupons` · `invoices` · `announcements` · `modules` · `security` · `health` · `webhooks` · `emails` · `reports` · `audit` · `settings` · `api-docs` · `clients-new` · **CMS** (`/super/cms` — pages, blog, menus) · **Page builder** · **AI** (`/super/ai`, dashboard, settings).

---

## Core Libraries & Domain Logic

### Mock data layer — `src/lib/mock/`

Provides fully-typed, in-memory stores and React context providers so the whole app is interactive without a backend:

- **`store.ts`** — accounting primitives: `Contact`, `Product`, `Account`, `Invoice`, `Journal`, `Expense`, plus `useStore`, `invoiceTotal`, currency `fmt`.
- **`saas.tsx`** — platform model: `Plan`, `Workspace`, `SubRequest`, `Gateway` with `SaasProvider` / `useSaas`.
- **`firm.tsx`** — firm RBAC & operations: `FirmPermission`, `ALL_PERMISSIONS`, `FirmRole`, `FirmStaff`, `FirmClient`, `Engagement`, `FirmTask`, `FirmInvoice` with `FirmProvider` / `useFirm`.
- **`cms.ts`** — `CmsPage`, `BlogPost`, `Menu`, `Theme`, `slugify`, `canAccessWorkspace`, `useCmsStore`.
- **`ai.ts`** — AI bookkeeping: conversations, `AiModelName`, `MODEL_COSTS`, `estimateCost`, `pickRouteOrder`, usage logs.
- **`audit.tsx`** — audit trail: `AuditEntry`, `AuditProvider` / `useAudit`.

### Roles — `src/lib/client-role.tsx`

Client-portal RBAC with a `ClientRole` type (e.g. `owner`) and `ROLE_META` describing per-role access.

### Exports — `src/lib/client/export.ts`

`toCSV`, `downloadCSV`, and `downloadPDF` helpers used across client screens.

### AI OCR pipeline

Receipt scanning runs in two phases:

1. **Local (browser)** — `OcrUploader` runs `tesseract.js` with `eng+fin` languages. If confidence is high, the result is used directly.
2. **Server fallback cascade** — otherwise `ocrFallback` cascades through models in a configurable, per-workspace order (`deepseek → gemini → claude → gpt`), returning the first successful result. Costs and success rates are tracked in the AI mock store (`MODEL_COSTS`, `estimateCost`, `pickRouteOrder`).

Supported model identifiers: `tesseract`, `deepseek`, `gemini`, `claude`, `gpt`.

### Components of note

- **Shells** — `MarketingShell`, `FirmShell`, `SuperShell`, `ClientMobileShell` provide per-portal navigation/layout.
- **`OcrUploader`** — two-phase receipt OCR with a live cascade trace (per-model ms/cost/success).
- **`RichEditor`** — TipTap-based, RTL-aware editor for CMS content.
- **`ClientRegisterWizard`** — multi-step onboarding (Company → Owner → Workspace → Plan) that uses the YTJ business-ID lookup, with manual entry for non-Finnish companies.

---

## Server Functions & APIs

### AI OCR fallback — `src/lib/ai.functions.ts`

`ocrFallback` — a `POST` `createServerFn` providing a server-side OCR path when in-browser OCR is unavailable.

### CMS — `src/lib/cms.functions.ts`

Server functions for content management: `listPages`, `createPage`, `updatePage`, `deletePage`, `reorderPages`, `listPosts`, `createPost`, `updatePost`, `deletePost`.

### AI chat stream — `src/routes/api/chat.ts`

A server route (`POST /api/chat`) that streams responses from `google/gemini-2.5-flash` through the Lovable AI Gateway. It exposes a `record_expense` tool so the assistant can draft expenses (categories: Meals, Travel, Office, Software, Utilities, Marketing, Other) pending accountant review. Requires `LOVABLE_API_KEY`.

### YTJ / PRH proxy — `src/routes/api/public/ytj.$businessId.ts`

A public route (`GET /api/public/ytj/:businessId`) proxying the [Finnish Business Information System (YTJ/PRH open data)](https://avoindata.prh.fi/ytj_en.html). It normalizes the upstream response, validates the business-ID format (`#######-#`), and falls back to a small mock catalog (Kesko, Nokia, demo company) so the registration wizard works offline. Routes under `/api/public/*` bypass auth on published sites.

### AI Gateway provider — `src/lib/ai-gateway.server.ts`

`createLovableAiGatewayProvider(apiKey)` returns an OpenAI-compatible provider pointed at `https://ai.gateway.lovable.dev/v1`.

---

## Internationalization

`src/lib/i18n.tsx` implements a lightweight context-based i18n with an in-code dictionary. Two languages are currently implemented: **English (`en`)** and **Arabic (`ar`)**, with RTL support in mind. The entitlements catalog carries `en`/`ar` labels, and the marketing site advertises broader locale coverage (EN/AR/FI/SV/DE/TR). The AI accounting assistant is configured to respond in Arabic with SAR as the default currency.

> Note: the platform blends a Finnish-market marketing story (YTJ, Procountor, GDPR) with Gulf/ZATCA e-invoicing and Arabic AI — reflecting a multi-region template.

---

## Entitlements & Plan Gating

`src/lib/entitlements/catalog.ts` is the single source of truth for what each plan can do. Every switch, quota, and gate maps back to it.

- **Modules**: `core`, `accounting`, `pos`, `hrm`, `ai`, `documents`, `reports`, `finvoice`, `crm`, `banking`, `loyalty`, `firm`.
- **Feature kinds**: `toggle` (on/off), `quota` (numeric limit with a unit), `select` (choice from options).
- Each feature has an `id`, `module`, bilingual (`en`/`ar`) label/description, `defaultValue`, optional `options`/`unit`, and `dependsOn` for feature dependencies.

Plans and workspaces store an "entitlement map" keyed by these ids; `src/lib/entitlements/store.tsx` reads it, and `components/entitlements/GateBanner.tsx` renders upgrade prompts when a feature is gated. The super-admin **plan builder** edits these entitlement maps.

### Canonical plan tiers

| Plan | Price | Headline limits |
|------|-------|-----------------|
| **Starter** | €29/mo | 3 users, 1 company, 200 invoices/mo, 100 OCR scans/mo, 5 GB |
| **Growth** | €89/mo | 10 users, 2 companies, inventory, payroll, AI chat/drafts/insights, bank feeds, Finvoice, 25 GB |
| **Scale** | €249/mo | 50 users, POS + loyalty, CRM + email automation, multi-currency, branding, public API, analytics, 200 GB |
| **Enterprise** | €9,990/mo | Effectively unlimited quotas, ultra AI model, full feature set, 2 TB |

### Roles

- **Client portal** (`src/lib/client-role.tsx`): `owner`, `employee`, `team` with per-capability `<Can>` guards.
- **Firm console** (`src/lib/mock/firm.tsx`): 14 permissions across seeded roles — Firm Owner, Engagement Manager, Senior Accountant, Junior Accountant, Billing Officer.

### Onboarding locales

`/onboarding` configures currency, accounting standard, tax authority, and VAT per country: Finland (EUR/FAS/25.5%), Saudi Arabia (SAR/IFRS/ZATCA/15%), UAE (AED/IFRS/5%), Egypt (EGP/EAS/14%), and USA (USD/US GAAP).

---

## Environment Variables

Read inside server function / route handlers only (never at module scope).

| Variable | Required | Purpose |
|----------|----------|---------|
| `LOVABLE_API_KEY` | For AI features | Auth for the Lovable AI Gateway used by `/api/chat` and OCR fallback |

Public client config, if any, must use `import.meta.env.VITE_*`.

---

## Embeddable Chat Widget

`public/widget.js` is a self-contained, framework-agnostic script that injects a floating AI-assistant button into any website:

```html
<script async src="https://your-fiksu-app/widget.js" data-fiksu-workspace="ws_id"></script>
```

It reads its workspace id from the `data-fiksu-workspace` attribute and its origin from the script `src`.

---

## Notes & Conventions

- **Do not edit `src/routeTree.gen.ts`** — it is regenerated by the TanStack Router Vite plugin.
- **Do not add `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, or `nitro` plugins manually** — `@lovable.dev/vite-tanstack-config` already includes them.
- The design system lives in `src/styles.css` using semantic `oklch` tokens; prefer semantic tokens over hardcoded color utilities.
- Server-only code lives in `*.server.ts` and server-function handlers; keep browser-only libraries (e.g. `tesseract.js`) out of SSR module scope.
- This project is connected to [Lovable](https://lovable.dev); avoid rewriting published git history.

---

*Built with TanStack Start on Lovable.*
