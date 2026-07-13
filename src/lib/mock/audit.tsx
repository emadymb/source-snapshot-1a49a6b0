// DB-backed audit provider. Same public API as before so /firm/audit and
// PlanEntitlementsDrawer keep working unchanged, but all reads/writes now
// hit the real AuditLog table via src/lib/firm.functions.ts.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listFirmAuditEntries,
  logFirmAuditEntry,
  type FirmAuditEntryDTO,
  type FirmAuditValue,
} from "@/lib/firm.functions";

export interface AuditChange {
  featureId: string;
  from: unknown;
  to: unknown;
}

export type AuditEntry = FirmAuditEntryDTO;

interface AuditCtx {
  entries: AuditEntry[];
  log: (e: Omit<AuditEntry, "id" | "at">) => void;
  clear: () => void;
  isLoading: boolean;
}

const Ctx = createContext<AuditCtx | null>(null);
const QK = ["firm", "audit"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toSerial = (v: unknown): FirmAuditValue =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : v == null ? null : String(v);

export function AuditProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listFirmAuditEntries);
  const logFn = useServerFn(logFirmAuditEntry);
  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: () => listFn(),
    staleTime: 15_000,
  });

  const value = useMemo<AuditCtx>(() => ({
    entries: data ?? [],
    isLoading,
    log: (e) => {
      if (!UUID.test(e.workspaceId)) return;
      logFn({ data: {
        workspaceId: e.workspaceId,
        workspaceName: e.workspaceName,
        actorName: e.actorName,
        actorRole: e.actorRole,
        kind: e.kind,
        planFrom: e.planFrom,
        planTo: e.planTo,
        changes: (e.changes ?? []).map((c) => ({
          featureId: c.featureId,
          from: toSerial(c.from),
          to: toSerial(c.to),
        })),
        note: e.note,
      } })
        .then(() => qc.invalidateQueries({ queryKey: QK }))
        .catch(() => {});
    },
    clear: () => { /* no-op: audit trail is append-only */ },
  }), [data, isLoading, logFn, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudit() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudit must be used inside AuditProvider");
  return ctx;
}
