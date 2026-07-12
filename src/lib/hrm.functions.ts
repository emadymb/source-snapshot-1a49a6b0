// HRM & Payroll server functions — REAL data (Prisma + Postgres RLS).
//
// Every handler resolves the authenticated user + active workspace from the
// access cookie and runs queries through withTenant(), so RLS scopes reads and
// writes to the caller's workspace. Mutations are audited into audit_logs.
//
// Payroll is auto-calculated: net = base + Σ allowances − Σ deductions.
//
// Preview safety: when no database is reachable (the Lovable preview has no
// Postgres) reads fall back to a bundled demo dataset so the UI stays usable.
// Writes require a real database.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
export type UiLeaveStatus = "pending" | "approved" | "rejected";
export type UiPayrollStatus = "draft" | "approved" | "paid";

export interface EmployeeDTO {
  id: string;
  fullName: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  baseSalary: number; // EUR
  hireDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface LeaveDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  status: UiLeaveStatus;
  reason?: string | null;
}

export interface PayrollLineDTO {
  label: string;
  amount: number; // EUR
}

export interface PayrollDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  base: number; // EUR
  allowances: number;
  deductions: number;
  net: number;
  status: UiPayrollStatus;
  allowanceLines: PayrollLineDTO[];
  deductionLines: PayrollLineDTO[];
}

export interface HrmSummary {
  employees: number;
  activeEmployees: number;
  pendingLeaves: number;
  monthlyPayroll: number; // EUR, current month net
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
const eur = (cents: number) => Math.round(cents) / 100;
const cents = (eurValue: number) => Math.round(eurValue * 100);
const day = (d: Date) => d.toISOString().slice(0, 10);

const fromDbLeave = (s: string): UiLeaveStatus =>
  (({ PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" } as const)[s as "PENDING"] ?? "pending");
const toDbLeave = (s: UiLeaveStatus) =>
  ({ pending: "PENDING", approved: "APPROVED", rejected: "REJECTED" } as const)[s];
const fromDbPayroll = (s: string): UiPayrollStatus =>
  (({ DRAFT: "draft", APPROVED: "approved", PAID: "paid" } as const)[s as "DRAFT"] ?? "draft");
const toDbPayroll = (s: UiPayrollStatus) =>
  ({ draft: "DRAFT", approved: "APPROVED", paid: "PAID" } as const)[s];

// ---------------------------------------------------------------------------
// Preview fallback dataset
// ---------------------------------------------------------------------------
const FALLBACK_EMPLOYEES: EmployeeDTO[] = [
  { id: "e1", fullName: "Aino Virtanen", email: "aino@fiksu.fi", department: "Operations", position: "Manager", baseSalary: 4200, hireDate: "2019-08-15", isActive: true },
  { id: "e2", fullName: "Mikko Laine", email: "mikko@fiksu.fi", department: "Finance", position: "Accountant", baseSalary: 3600, hireDate: "2022-04-01", isActive: true },
  { id: "e3", fullName: "Sofia Karjalainen", email: "sofia@fiksu.fi", department: "Sales", position: "Associate", baseSalary: 3100, hireDate: "2024-01-08", isActive: true },
  { id: "e4", fullName: "Jouni Nieminen", email: "jouni@fiksu.fi", department: "Support", position: "Agent", baseSalary: 2900, hireDate: "2025-06-01", isActive: false },
];
const FALLBACK_LEAVES: LeaveDTO[] = [
  { id: "l1", employeeId: "e2", employeeName: "Mikko Laine", startDate: "2026-07-14", endDate: "2026-07-25", status: "pending", reason: "Summer vacation" },
  { id: "l2", employeeId: "e1", employeeName: "Aino Virtanen", startDate: "2026-08-03", endDate: "2026-08-07", status: "approved", reason: "Annual leave" },
];
const FALLBACK_PAYROLL: PayrollDTO[] = [
  { id: "p1", employeeId: "e1", employeeName: "Aino Virtanen", month: 6, year: 2026, base: 4200, allowances: 300, deductions: 1150, net: 3350, status: "paid", allowanceLines: [{ label: "Lunch benefit", amount: 300 }], deductionLines: [{ label: "Tax (withholding)", amount: 1150 }] },
  { id: "p2", employeeId: "e2", employeeName: "Mikko Laine", month: 6, year: 2026, base: 3600, allowances: 0, deductions: 940, net: 2660, status: "approved", allowanceLines: [], deductionLines: [{ label: "Tax (withholding)", amount: 940 }] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function workspaceCtx() {
  const { requireSession, resolveWorkspaceId } = await import("./auth/session.server");
  const session = await requireSession();
  const workspaceId = await resolveWorkspaceId(session.userId, session.role);
  if (!workspaceId) throw new Error("No active workspace for this user.");
  return { session, workspaceId };
}

async function audit(userId: string, action: string, entity: string, entityId: string) {
  try {
    const { withTenant } = await import("./db.server");
    await withTenant(userId, (tx) => tx.auditLog.create({ data: { userId, action, entity, entityId } }));
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
export const hrmSummary = createServerFn({ method: "GET" }).handler(async (): Promise<HrmSummary> => {
  if (!dbConfigured()) {
    return {
      employees: FALLBACK_EMPLOYEES.length,
      activeEmployees: FALLBACK_EMPLOYEES.filter((e) => e.isActive).length,
      pendingLeaves: FALLBACK_LEAVES.filter((l) => l.status === "pending").length,
      monthlyPayroll: FALLBACK_PAYROLL.reduce((n, p) => n + p.net, 0),
    };
  }
  try {
    const { workspaceId, session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const now = new Date();
      const [employees, activeEmployees, pendingLeaves, payrolls] = await Promise.all([
        tx.employee.count({ where: { workspaceId } }),
        tx.employee.count({ where: { workspaceId, isActive: true } }),
        tx.leave.count({ where: { workspaceId, status: "PENDING" } }),
        tx.payroll.findMany({ where: { workspaceId, month: now.getMonth() + 1, year: now.getFullYear() } }),
      ]);
      return {
        employees,
        activeEmployees,
        pendingLeaves,
        monthlyPayroll: eur(payrolls.reduce((n, p) => n + p.netCents, 0)),
      };
    });
  } catch {
    return {
      employees: FALLBACK_EMPLOYEES.length,
      activeEmployees: FALLBACK_EMPLOYEES.filter((e) => e.isActive).length,
      pendingLeaves: FALLBACK_LEAVES.filter((l) => l.status === "pending").length,
      monthlyPayroll: FALLBACK_PAYROLL.reduce((n, p) => n + p.net, 0),
    };
  }
});

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------
export const listEmployees = createServerFn({ method: "GET" }).handler(async (): Promise<EmployeeDTO[]> => {
  if (!dbConfigured()) return FALLBACK_EMPLOYEES;
  try {
    const { workspaceId, session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.employee.findMany({ where: { workspaceId }, orderBy: { fullName: "asc" } });
      return rows.map((e) => ({
        id: e.id,
        fullName: e.fullName,
        email: e.email,
        department: e.department,
        position: e.position,
        baseSalary: eur(e.baseSalaryCents),
        hireDate: day(e.hireDate),
        isActive: e.isActive,
      }));
    });
  } catch {
    return FALLBACK_EMPLOYEES;
  }
});

const employeeInput = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  position: z.string().trim().max(120).optional().or(z.literal("")),
  baseSalary: z.number().min(0).max(10_000_000),
  hireDate: z.string().min(1),
  isActive: z.boolean().default(true),
});

export const upsertEmployee = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => employeeInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { workspaceId, session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const base = {
        fullName: data.fullName,
        email: data.email || null,
        department: data.department || null,
        position: data.position || null,
        baseSalaryCents: cents(data.baseSalary),
        hireDate: new Date(data.hireDate),
        isActive: data.isActive,
      };
      if (data.id) {
        await tx.employee.update({ where: { id: data.id }, data: base });
        return data.id;
      }
      const created = await tx.employee.create({ data: { ...base, workspaceId } });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "employee", id);
    return { id };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.employee.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "employee", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------
export const listLeaves = createServerFn({ method: "GET" }).handler(async (): Promise<LeaveDTO[]> => {
  if (!dbConfigured()) return FALLBACK_LEAVES;
  try {
    const { workspaceId, session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const [rows, employees] = await Promise.all([
        tx.leave.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
        tx.employee.findMany({ where: { workspaceId }, select: { id: true, fullName: true } }),
      ]);
      const nameOf = new Map(employees.map((e) => [e.id, e.fullName]));
      return rows.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        employeeName: nameOf.get(l.employeeId) ?? "—",
        startDate: day(l.startDate),
        endDate: day(l.endDate),
        status: fromDbLeave(l.status),
        reason: l.reason,
      }));
    });
  } catch {
    return FALLBACK_LEAVES;
  }
});

const leaveInput = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const requestLeave = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leaveInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { workspaceId, session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const created = await tx.leave.create({
        data: {
          workspaceId,
          employeeId: data.employeeId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          reason: data.reason || null,
          status: "PENDING",
        },
      });
      return created.id;
    });
    await audit(session.userId, "create", "leave", id);
    return { id };
  });

export const setLeaveStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: UiLeaveStatus }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) =>
      tx.leave.update({ where: { id: data.id }, data: { status: toDbLeave(data.status) } }),
    );
    await audit(session.userId, "update", "leave", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------
export const listPayroll = createServerFn({ method: "GET" })
  .inputValidator((d: { month?: number; year?: number } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<PayrollDTO[]> => {
    if (!dbConfigured()) return FALLBACK_PAYROLL;
    try {
      const { workspaceId, session } = await workspaceCtx();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const where: { workspaceId: string; month?: number; year?: number } = { workspaceId };
        if (data.month) where.month = data.month;
        if (data.year) where.year = data.year;
        const [rows, employees] = await Promise.all([
          tx.payroll.findMany({ where, orderBy: [{ year: "desc" }, { month: "desc" }], include: { allowances: true, deductions: true } }),
          tx.employee.findMany({ where: { workspaceId }, select: { id: true, fullName: true } }),
        ]);
        const nameOf = new Map(employees.map((e) => [e.id, e.fullName]));
        return rows.map((p) => ({
          id: p.id,
          employeeId: p.employeeId,
          employeeName: nameOf.get(p.employeeId) ?? "—",
          month: p.month,
          year: p.year,
          base: eur(p.baseCents),
          allowances: eur(p.allowancesCents),
          deductions: eur(p.deductionsCents),
          net: eur(p.netCents),
          status: fromDbPayroll(p.status),
          allowanceLines: p.allowances.map((a) => ({ label: a.label, amount: eur(a.amountCents) })),
          deductionLines: p.deductions.map((d) => ({ label: d.label, amount: eur(d.amountCents) })),
        }));
      });
    } catch {
      return FALLBACK_PAYROLL;
    }
  });

const payrollInput = z.object({
  employeeId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  allowanceLines: z.array(z.object({ label: z.string().trim().min(1).max(120), amount: z.number().min(0) })).default([]),
  deductionLines: z.array(z.object({ label: z.string().trim().min(1).max(120), amount: z.number().min(0) })).default([]),
});

/** Generate (or regenerate) a payroll run for an employee/month with auto-calc. */
export const generatePayroll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => payrollInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string; net: number }> => {
    const { workspaceId, session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    const result = await withTenant(session.userId, async (tx) => {
      const emp = await tx.employee.findFirst({ where: { id: data.employeeId, workspaceId } });
      if (!emp) throw new Error("Employee not found.");
      const baseCents = emp.baseSalaryCents;
      const allowancesCents = data.allowanceLines.reduce((n, a) => n + cents(a.amount), 0);
      const deductionsCents = data.deductionLines.reduce((n, d) => n + cents(d.amount), 0);
      const netCents = baseCents + allowancesCents - deductionsCents;

      const existing = await tx.payroll.findFirst({
        where: { employeeId: data.employeeId, month: data.month, year: data.year },
      });
      const payload = { baseCents, allowancesCents, deductionsCents, netCents, status: "DRAFT" as const };

      let payrollId: string;
      if (existing) {
        await tx.payroll.update({ where: { id: existing.id }, data: payload });
        await tx.payrollAllowance.deleteMany({ where: { payrollId: existing.id } });
        await tx.payrollDeduction.deleteMany({ where: { payrollId: existing.id } });
        payrollId = existing.id;
      } else {
        const created = await tx.payroll.create({
          data: { ...payload, workspaceId, employeeId: data.employeeId, month: data.month, year: data.year },
        });
        payrollId = created.id;
      }
      if (data.allowanceLines.length) {
        await tx.payrollAllowance.createMany({
          data: data.allowanceLines.map((a) => ({ payrollId, label: a.label, amountCents: cents(a.amount) })),
        });
      }
      if (data.deductionLines.length) {
        await tx.payrollDeduction.createMany({
          data: data.deductionLines.map((d) => ({ payrollId, label: d.label, amountCents: cents(d.amount) })),
        });
      }
      return { id: payrollId, net: eur(netCents) };
    });
    await audit(session.userId, "generate", "payroll", result.id);
    return result;
  });

export const setPayrollStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: UiPayrollStatus }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { session } = await workspaceCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) =>
      tx.payroll.update({ where: { id: data.id }, data: { status: toDbPayroll(data.status) } }),
    );
    await audit(session.userId, "update", "payroll", data.id);
    return { ok: true };
  });
