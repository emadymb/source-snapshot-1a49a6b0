import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Clock, LogIn, LogOut, Download } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { hrmStore, useHrmStore, attendanceHours, type AttendancePunch } from "@/lib/mock/hrm";
import { listEmployees, type EmployeeDTO } from "@/lib/hrm.functions";

export const Route = createFileRoute("/client/accounting/attendance")({ component: Attendance });

function fmt(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

function Attendance() {
  const listFn = useServerFn(listEmployees);
  const { data: employees = [] } = useQuery({ queryKey: ["hrm", "employees"], queryFn: () => listFn() });
  const punches = useHrmStore((s) => s.attendance);
  const [note, setNote] = useState("");
  const [range, setRange] = useState<"today" | "week" | "month">("today");

  const today = new Date().toISOString().slice(0, 10);
  const activePunchByEmp = useMemo(() => {
    const map = new Map<string, AttendancePunch>();
    for (const p of punches) if (p.date === today && !p.clockOut) map.set(p.employeeId, p);
    return map;
  }, [punches, today]);

  const rangePunches = useMemo(() => {
    const now = Date.now();
    const spans = { today: 864e5, week: 7 * 864e5, month: 30 * 864e5 };
    return punches.filter((p) => now - new Date(p.clockIn).getTime() <= spans[range]);
  }, [punches, range]);

  const kpis = [
    { label: "على الوردية", value: `${activePunchByEmp.size} / ${employees.filter((e) => e.isActive).length}` },
    { label: "بصمات اليوم", value: String(punches.filter((p) => p.date === today).length) },
    { label: "ساعات اليوم", value: punches.filter((p) => p.date === today).reduce((n, p) => n + attendanceHours(p), 0).toFixed(1) + "h" },
    { label: "الموظفين النشطين", value: String(employees.filter((e) => e.isActive).length) },
  ];

  const exportCsv = () => {
    const rows = [["employee", "date", "clock_in", "clock_out", "hours", "note"]];
    for (const p of rangePunches) {
      rows.push([
        p.employeeName, p.date, fmt(p.clockIn), fmt(p.clockOut),
        attendanceHours(p).toFixed(2), p.note ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${range}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div dir="rtl">
    <Screen
      title="الحضور والانصراف"
      description="سجّل دخول/خروج الموظفين، وتابع الساعات اليومية والأسبوعية."
      icon={Clock}
      actions={
        <Button variant="outline" onClick={exportCsv} className="rounded-xl">
          <Download className="me-2 size-4" /> تصدير CSV
        </Button>
      }
    >
      <KpiGrid kpis={kpis} />

      <DataCard title="بصمة سريعة">
        <div className="mb-3">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة اختيارية (مثل: عمل عن بُعد)" className="rounded-xl" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {employees.filter((e) => e.isActive).map((e: EmployeeDTO) => {
            const open = activePunchByEmp.get(e.id);
            return (
              <div key={e.id} className="glass flex items-center justify-between gap-2 rounded-xl border-glass-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.fullName}</p>
                  <p className="text-xs text-muted-foreground">{e.department ?? "—"} · {open ? `دخول ${fmt(open.clockIn)}` : "خارج الوردية"}</p>
                </div>
                {open ? (
                  <Button size="sm" variant="outline" className="rounded-xl text-rose-600" onClick={() => { hrmStore.clockOut(e.id); toast.success(`تم انصراف ${e.fullName}`); }}>
                    <LogOut className="me-1 size-3.5" /> انصراف
                  </Button>
                ) : (
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white" onClick={() => { hrmStore.clockIn(e.id, e.fullName, note || undefined); setNote(""); toast.success(`تم دخول ${e.fullName}`); }}>
                    <LogIn className="me-1 size-3.5" /> دخول
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DataCard>

      <DataCard
        title="سجل الحضور"
        action={
          <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
            {(["today", "week", "month"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 ${range === r ? "bg-white shadow" : "text-muted-foreground"}`}>
                {r === "today" ? "اليوم" : r === "week" ? "أسبوع" : "شهر"}
              </button>
            ))}
          </div>
        }
      >
        <DataTable<AttendancePunch>
          empty="لا توجد بصمات في هذه الفترة."
          rows={rangePunches}
          columns={[
            { key: "employeeName", label: "الموظف" },
            { key: "date", label: "التاريخ" },
            { key: "clockIn", label: "الدخول", render: (r) => fmt(r.clockIn) },
            { key: "clockOut", label: "الانصراف", render: (r) => fmt(r.clockOut) },
            { key: "hours", label: "الساعات", render: (r) => attendanceHours(r).toFixed(2) + "h" },
            { key: "status", label: "الحالة", render: (r) => <StatusBadge status={r.clockOut ? "closed" : "active"} /> },
            { key: "note", label: "ملاحظة", render: (r) => r.note ?? "—" },
          ]}
        />
      </DataCard>
    </Screen>
    </div>
  );
}
