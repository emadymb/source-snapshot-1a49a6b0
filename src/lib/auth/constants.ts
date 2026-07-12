// Client-safe auth constants, role model, and permission matrix.
// No server-only imports here — usable from routes, guards, and UI.

export type AppRole =
  | "SUPER_ADMIN"
  | "FIRM_ADMIN"
  | "ACCOUNTANT"
  | "CLIENT_OWNER"
  | "CLIENT_EMPLOYEE"
  | "CLIENT_TEAM_MEMBER";

export const ACCESS_COOKIE = "fiksu_access";
export const REFRESH_COOKIE = "fiksu_refresh";

export const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

/** JWT claims carried in the access token. */
export interface AccessClaims {
  sub: string;
  email: string;
  name: string;
  role: AppRole;
}

/** Landing route for a given role after login / when hitting a protected area. */
export function homeForRole(role: AppRole): "/super" | "/firm" | "/client" {
  if (role === "SUPER_ADMIN") return "/super";
  if (role === "FIRM_ADMIN" || role === "ACCOUNTANT") return "/firm";
  return "/client";
}

/** Which roles may enter each protected area. */
export const AREA_ROLES: Record<"/super" | "/firm" | "/client", AppRole[]> = {
  "/super": ["SUPER_ADMIN"],
  "/firm": ["SUPER_ADMIN", "FIRM_ADMIN", "ACCOUNTANT"],
  "/client": [
    "SUPER_ADMIN",
    "FIRM_ADMIN",
    "CLIENT_OWNER",
    "CLIENT_EMPLOYEE",
    "CLIENT_TEAM_MEMBER",
  ],
};

export function canEnterArea(role: AppRole, area: "/super" | "/firm" | "/client") {
  return AREA_ROLES[area].includes(role);
}

// ---------------------------------------------------------------------------
// Granular permission matrix (subset of the full spec). Keys are
// "<module>.<action>". `me` returns the resolved list for the current role so
// the UI can hide/show controls; the server still enforces via RLS + checks.
// ---------------------------------------------------------------------------
export type Permission =
  | "system.dashboard"
  | "system.plans"
  | "system.settings"
  | "system.logs"
  | "firm.dashboard"
  | "firm.staff.manage"
  | "firm.clients.manage"
  | "firm.tasks.assign"
  | "accounting.ocr.queue"
  | "accounting.receipts.review"
  | "accounting.receipts.approve"
  | "accounting.reports.view"
  | "accounting.reports.export"
  | "client.receipts.upload"
  | "client.expenses.view"
  | "client.ai.chat"
  | "client.payroll.view"
  | "client.team.manage"
  | "hrm.employees.manage"
  | "hrm.payroll.manage"
  | "hrm.profile.view"
  | "hrm.leave.request"
  | "finvoice.create"
  | "finvoice.view"
  | "finvoice.send"
  | "developer.dashboard"
  | "developer.audit"
  | "developer.queues";

const ALL: Permission[] = [
  "system.dashboard", "system.plans", "system.settings", "system.logs",
  "firm.dashboard", "firm.staff.manage", "firm.clients.manage", "firm.tasks.assign",
  "accounting.ocr.queue", "accounting.receipts.review", "accounting.receipts.approve",
  "accounting.reports.view", "accounting.reports.export",
  "client.receipts.upload", "client.expenses.view", "client.ai.chat",
  "client.payroll.view", "client.team.manage",
  "hrm.employees.manage", "hrm.payroll.manage", "hrm.profile.view", "hrm.leave.request",
  "finvoice.create", "finvoice.view", "finvoice.send",
  "developer.dashboard", "developer.audit", "developer.queues",
];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  FIRM_ADMIN: [
    "firm.dashboard", "firm.staff.manage", "firm.clients.manage", "firm.tasks.assign",
    "accounting.ocr.queue", "accounting.receipts.review", "accounting.receipts.approve",
    "accounting.reports.view", "accounting.reports.export",
    "client.receipts.upload", "client.expenses.view", "client.ai.chat", "client.payroll.view", "client.team.manage",
    "hrm.employees.manage", "hrm.payroll.manage", "hrm.profile.view", "hrm.leave.request",
    "finvoice.create", "finvoice.view", "finvoice.send",
  ],
  ACCOUNTANT: [
    "accounting.ocr.queue", "accounting.receipts.review", "accounting.receipts.approve",
    "accounting.reports.view", "accounting.reports.export",
    "hrm.profile.view", "hrm.leave.request",
    "finvoice.create", "finvoice.view", "finvoice.send",
  ],
  CLIENT_OWNER: [
    "accounting.reports.view",
    "client.receipts.upload", "client.expenses.view", "client.ai.chat", "client.payroll.view", "client.team.manage",
    "hrm.profile.view", "finvoice.view",
  ],
  CLIENT_EMPLOYEE: [
    "client.receipts.upload", "client.expenses.view", "client.ai.chat", "client.payroll.view",
    "hrm.profile.view", "hrm.leave.request",
  ],
  CLIENT_TEAM_MEMBER: [
    "accounting.reports.view",
    "client.receipts.upload", "client.expenses.view", "client.ai.chat",
    "hrm.profile.view",
  ],
};

export function hasPermission(role: AppRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}
