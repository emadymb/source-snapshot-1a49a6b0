import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Sliders, Trash2, Plus, Save } from "lucide-react";
import { AiScreen } from "@/components/ai/AiScreen";
import { DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiStore, useAiStore, MODEL_COSTS, type AiModelName } from "@/lib/mock/ai";
import { toast } from "sonner";

export const Route = createFileRoute("/super/ai/settings")({ component: Page });

const ALL: AiModelName[] = ["deepseek", "gemini", "claude", "gpt"];

function Page() {
  const order = useAiStore((s) => s.order.filter((m) => m !== "tesseract"));
  const overrides = useAiStore((s) => s.overrides);
  const [newCompany, setNewCompany] = useState("");
  const [newModel, setNewModel] = useState<AiModelName>("gemini");

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(r.source.index, 1);
    next.splice(r.destination.index, 0, moved);
    aiStore.setOrder(next);
    toast.success("تم تحديث ترتيب الموديلات");
  };

  return (
    <AiScreen title="AI Settings" description="Routing order, per-company overrides, and provider defaults." icon={Sliders}>
      <DataCard title="Model routing order">
        <p className="mb-3 text-xs text-muted-foreground">
          يُستخدم هذا الترتيب في cascade عندما يفشل الموديل الأول. اسحب لإعادة الترتيب.
        </p>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="order">
            {(prov) => (
              <ul ref={prov.innerRef} {...prov.droppableProps} className="space-y-2">
                {order.map((m, idx) => (
                  <Draggable draggableId={m} index={idx} key={m}>
                    {(p, snap) => (
                      <li
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        className={`flex items-center gap-3 rounded-xl border border-glass-border bg-white p-3 shadow-sm ${snap.isDragging ? "shadow-lg" : ""}`}
                      >
                        <GripVertical className="size-4 text-slate-400" />
                        <span className="size-3 rounded-full" style={{ backgroundColor: MODEL_COSTS[m].color }} />
                        <span className="font-medium">{MODEL_COSTS[m].label}</span>
                        <span className="ms-auto text-xs text-muted-foreground">
                          in ${MODEL_COSTS[m].in}/1K · out ${MODEL_COSTS[m].out}/1K
                        </span>
                        <span className="ms-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">#{idx + 1}</span>
                      </li>
                    )}
                  </Draggable>
                ))}
                {prov.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </DataCard>

      <DataCard title="Per-company overrides">
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <Input placeholder="Company name / ID" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
          <Select value={newModel} onValueChange={(v) => setNewModel(v as AiModelName)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL.map((m) => <SelectItem key={m} value={m}>{MODEL_COSTS[m].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (!newCompany.trim()) return;
              const id = `c_${Date.now().toString(36)}`;
              aiStore.setOverride(id, newCompany.trim(), newModel);
              setNewCompany("");
              toast.success("تمت إضافة override");
            }}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
          >
            <Plus className="me-2 size-4" /> Add
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-start">Company</th>
              <th className="p-2 text-start">Forced model</th>
              <th className="p-2 text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">لا توجد تجاوزات</td></tr>
            )}
            {overrides.map((o) => (
              <tr key={o.companyId} className="border-t border-glass-border">
                <td className="p-2">{o.companyName}</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: MODEL_COSTS[o.modelName].color }} />
                    {MODEL_COSTS[o.modelName].label}
                  </span>
                </td>
                <td className="p-2 text-end">
                  <Button variant="ghost" size="icon" onClick={() => aiStore.removeOverride(o.companyId)}>
                    <Trash2 className="size-4 text-rose-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataCard>

      <DataCard title="Widget snippet">
        <p className="mb-2 text-xs text-muted-foreground">أضف هذا السكربت لأي موقع خارجي لتفعيل شات Fiksu.</p>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
{`<script async src="${typeof window !== "undefined" ? window.location.origin : "https://fiksu.app"}/widget.js"
  data-fiksu-workspace="ws_demo"></script>`}
        </pre>
      </DataCard>
    </AiScreen>
  );
}
