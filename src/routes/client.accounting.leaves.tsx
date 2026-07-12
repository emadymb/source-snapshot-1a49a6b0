import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listLeaves, requestLeave, setLeaveStatus, listEmployees, type LeaveDTO } from "@/lib/hrm.functions";

export const Route = createFileRoute("/client/accounting/leaves")({ component: LeavesPage });

function LeavesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeaves);
  const empFn = useServerFn(listEmployees);
  const reqFn = useServerFn(requestLeave);
  const setFn = useServerFn(setLeaveStatus);

  const { data: leaves = [] } = useQuery({ queryKey: ["hrm", "leaves"], queryFn: () => listFn() });
  const { data: employees = [] } = useQuery({ queryKey: ["hrm", "employees"], queryFn: () => empFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), reason: "" });

  const create = useMutation({
    mutationFn: () => reqFn({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hrm", "leaves"] }); toast.success("تم إرسال الطلب"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message || "تعذّر الحفظ"),
  });
  const change = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) => setFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hrm", "leaves"] }); toast.success("تم التحديث"); },
    onError: (e: Error) => toast.error(e.message || "تعذّر التحديث"),
  });

  const kpis = [
    { label: "إجمالي الطلبات", value: String(leaves.length) },
    { label: "معلّقة", value: String(leaves.filter((l) => l.status === "pending").length) },
    { label: "معتمدة", value: String(leaves.filter((l) => l.status === "approved").length) },
    { label: "مرفوضة", value: String(leaves.filter((l) => l.status === "rejected").length) },
  ];

  return (
    <div dir="rtl">
    <Screen
      title="إدارة الإجازات"
      description="طلبات الإجازات والموافقات."
      icon={CalendarDays}
      actions={
        <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Plus className="me-2 size-4" /> طلب جديد
        </Button>
      }
    >
      <KpiGrid kpis={kpis} />
      <DataCard title="جميع الطلبات">
        <DataTable<LeaveDTO>
          empty="لا توجد طلبات."
          rows={leaves}
          columns={[
            { key: "employeeName", label: "الموظف", render: (r) => <span className="font-medium">{r.employeeName}</span> },
            { key: "startDate", label: "من" },
            { key: "endDate", label: "إلى" },
            { key: "reason", label: "السبب", render: (r) => r.reason ?? "—" },
            { key: "status", label: "الحالة", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", label: "", className: "text-end", render: (r) => (
              r.status === "pending" ? (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" className="rounded-xl text-emerald-600" onClick={() => change.mutate({ id: r.id, status: "approved" })}><Check className="me-1 size-3.5" /> موافقة</Button>
                  <Button size="sm" variant="outline" className="rounded-xl text-rose-600" onClick={() => change.mutate({ id: r.id, status: "rejected" })}><X className="me-1 size-3.5" /> رفض</Button>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>
            ) },
          ]}
        />
      </DataCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>طلب إجازة جديد</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الموظف</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>من</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>إلى</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div><Label>السبب</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => create.mutate()} disabled={!form.employeeId || create.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
    </div>
  );
}