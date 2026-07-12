import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Pencil } from "lucide-react";
import { AiScreen } from "@/components/ai/AiScreen";
import { DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { listLeads, upsertLead, deleteLead, type LeadDTO } from "@/lib/ai.functions";

export const Route = createFileRoute("/super/ai/leads")({ component: LeadsPage });

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

type Draft = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  status: (typeof STATUSES)[number];
  notes: string;
};

const emptyDraft: Draft = { name: "", email: "", phone: "", status: "new", notes: "" };

function LeadsPage() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ["ai", "leads"], queryFn: () => listLeads() });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const save = useMutation({
    mutationFn: () =>
      upsertLead({
        data: {
          id: draft.id,
          name: draft.name,
          email: draft.email || null,
          phone: draft.phone || null,
          status: draft.status,
          source: "widget",
          notes: draft.notes || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai", "leads"] });
      setOpen(false);
      setDraft(emptyDraft);
      toast.success("تم حفظ العميل المحتمل");
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر الحفظ (يتطلب قاعدة بيانات)"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai", "leads"] });
      toast.success("تم الحذف");
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر الحذف"),
  });

  const openEdit = (l: LeadDTO) => {
    setDraft({
      id: l.id,
      name: l.name,
      email: l.email ?? "",
      phone: l.phone ?? "",
      status: (STATUSES as readonly string[]).includes(l.status) ? (l.status as Draft["status"]) : "new",
      notes: l.notes ?? "",
    });
    setOpen(true);
  };

  return (
    <AiScreen
      title="AI Leads"
      description="العملاء المحتملون الملتقطون عبر ودجت الدردشة الذكية."
      icon={UserPlus}
      actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft(emptyDraft); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <UserPlus className="me-2 size-4" /> عميل محتمل جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{draft.id ? "تعديل عميل محتمل" : "عميل محتمل جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="الاسم" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <Input placeholder="البريد الإلكتروني" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <Input placeholder="الهاتف" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as Draft["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="ملاحظات" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate()} disabled={!draft.name.trim() || save.isPending} className="rounded-xl">
                {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <DataCard title={`العملاء المحتملون (${leads.length})`}>
        <DataTable<LeadDTO>
          empty={isLoading ? "جارٍ التحميل…" : "لا يوجد عملاء محتملون بعد"}
          rows={leads}
          columns={[
            { key: "name", label: "الاسم", render: (l) => <span className="font-medium">{l.name}</span> },
            { key: "email", label: "البريد", render: (l) => l.email ?? "—" },
            { key: "phone", label: "الهاتف", render: (l) => l.phone ?? "—" },
            { key: "status", label: "الحالة", render: (l) => <StatusBadge status={l.status} /> },
            { key: "notes", label: "ملاحظات", render: (l) => <span className="text-muted-foreground line-clamp-1">{l.notes ?? "—"}</span> },
            {
              key: "actions",
              label: "",
              className: "text-end",
              render: (l) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(l)} aria-label="تعديل">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-rose-500" onClick={() => remove.mutate(l.id)} aria-label="حذف">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </DataCard>
    </AiScreen>
  );
}
