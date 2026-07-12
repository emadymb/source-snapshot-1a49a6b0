import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { listEmployees, upsertEmployee, deleteEmployee, type EmployeeDTO } from "@/lib/hrm.functions";

export const Route = createFileRoute("/client/accounting/employees")({ component: Employees });

type FormState = {
  fullName: string; email: string; department: string; position: string;
  baseSalary: string; hireDate: string; isActive: boolean;
};
const emptyForm: FormState = {
  fullName: "", email: "", department: "", position: "",
  baseSalary: "", hireDate: new Date().toISOString().slice(0, 10), isActive: true,
};

const eur = (n: number) => n.toLocaleString("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function Employees() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEmployees);
  const upsertFn = useServerFn(upsertEmployee);
  const deleteFn = useServerFn(deleteEmployee);

  const { data: employees = [], isLoading } = useQuery({ queryKey: ["hrm", "employees"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["hrm"] });

  const upsertMut = useMutation({
    mutationFn: (d: {
      id?: string; fullName: string; email: string; department: string;
      position: string; baseSalary: number; hireDate: string; isActive: boolean;
    }) => upsertFn({ data: d }),
    onSuccess: () => { invalidate(); toast.success("Employee saved."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Employee removed."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDTO | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<EmployeeDTO | null>(null);

  const kpis = useMemo(() => {
    const active = employees.filter((e) => e.isActive).length;
    const payroll = employees.filter((e) => e.isActive).reduce((n, e) => n + e.baseSalary, 0);
    return [
      { label: "Employees", value: String(employees.length) },
      { label: "Active", value: String(active) },
      { label: "Inactive", value: String(employees.length - active) },
      { label: "Monthly base", value: eur(payroll) },
    ];
  }, [employees]);

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(e: EmployeeDTO) {
    setEditing(e);
    setForm({
      fullName: e.fullName, email: e.email ?? "", department: e.department ?? "", position: e.position ?? "",
      baseSalary: String(e.baseSalary), hireDate: e.hireDate, isActive: e.isActive,
    });
    setOpen(true);
  }
  function save() {
    if (!form.fullName.trim()) { toast.error("Name is required."); return; }
    upsertMut.mutate({
      id: editing?.id,
      fullName: form.fullName,
      email: form.email,
      department: form.department,
      position: form.position,
      baseSalary: Number(form.baseSalary) || 0,
      hireDate: form.hireDate,
      isActive: form.isActive,
    });
    setOpen(false);
  }

  return (
    <Screen title="Employees" description="HR roster, contracts, and payroll base salaries." icon={Users}
      actions={<Button onClick={openCreate} className="gap-2 rounded-xl bg-gradient-primary text-primary-foreground"><Plus className="size-4" /> New employee</Button>}>
      <KpiGrid kpis={kpis} />
      <DataCard title="Roster">
        <DataTable<EmployeeDTO>
          empty={isLoading ? "Loading…" : "No employees yet."}
          rows={employees}
          columns={[
            { key: "fullName", label: "Name", render: (r) => <span className="font-medium">{r.fullName}</span> },
            { key: "department", label: "Department", render: (r) => r.department ?? "—" },
            { key: "position", label: "Position", render: (r) => r.position ?? "—" },
            { key: "baseSalary", label: "Base salary", render: (r) => eur(r.baseSalary) },
            { key: "hireDate", label: "Hired" },
            { key: "isActive", label: "Status", render: (r) => <StatusBadge status={r.isActive ? "active" : "closed"} /> },
            { key: "actions", label: "", className: "text-end", render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(r)}><Trash2 className="size-4" /></Button>
              </div>
            ) },
          ]}
        />
      </DataCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Full name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label>Position</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div><Label>Base salary (€/mo)</Label><Input type="number" min={0} value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} /></div>
              <div><Label>Hire date</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsertMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove employee?</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDelete?.fullName}" will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (confirmDelete) deleteMut.mutate(confirmDelete.id); setConfirmDelete(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
