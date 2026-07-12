import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { Upload, FileText, Image as ImageIcon, X, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEntitlements } from "@/lib/entitlements/store";
import { useClientRole } from "@/lib/client-role";
import { cn } from "@/lib/utils";

export type StagedFile = { id: string; file: File; preview?: string };

const DOC_TYPES = [
  { value: "receipt",  label: "Receipt" },
  { value: "invoice",  label: "Invoice" },
  { value: "contract", label: "Contract" },
  { value: "statement",label: "Bank statement" },
  { value: "payslip",  label: "Payslip" },
  { value: "other",    label: "Other" },
];

const DEPARTMENTS = ["General", "Sales", "Purchases", "Payroll", "Legal", "Banking", "Marketing"];

/** Reusable receipt/document upload dialog. Staged files show previews; submit
 *  fires `onUpload` with metadata. Disabled if the caller-role can't upload. */
export function UploadReceiptsDialog({
  onUpload,
  trigger,
  defaultDocType = "receipt",
}: {
  onUpload?: (payload: { files: StagedFile[]; docType: string; workspaceId: string; department: string; note: string }) => void;
  trigger?: React.ReactNode;
  defaultDocType?: string;
}) {
  const { workspaces, currentWorkspaceId } = useEntitlements();
  const { can } = useClientRole();
  const canUpload = can("docs.upload");
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [wsId, setWsId] = useState(currentWorkspaceId);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [docType, setDocType] = useState(defaultDocType);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (list: FileList | null) => {
    if (!list) return;
    const arr: StagedFile[] = [];
    Array.from(list).forEach((f) => {
      const id = Math.random().toString(36).slice(2, 10);
      const preview = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
      arr.push({ id, file: f, preview });
    });
    setStaged((prev) => [...prev, ...arr]);
  };

  const remove = (id: string) => setStaged((prev) => {
    const target = prev.find((s) => s.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    return prev.filter((s) => s.id !== id);
  });

  const reset = () => {
    staged.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
    setStaged([]); setNote(""); setDocType(defaultDocType); setDepartment(DEPARTMENTS[0]);
  };

  const submit = () => {
    if (!staged.length) return toast.error("Add at least one file to upload");
    onUpload?.({ files: staged, docType, workspaceId: wsId, department, note });
    toast.success(`${staged.length} file(s) uploaded to ${DOC_TYPES.find((d) => d.value === docType)?.label}`);
    setOpen(false); reset();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false); accept(e.dataTransfer.files);
  };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => accept(e.target.files);

  const kb = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button disabled={!canUpload} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            <Upload className="me-2 size-4" /> Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label>Workspace</Label>
            <Select value={wsId} onValueChange={setWsId}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{workspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-2 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
            dragging ? "border-indigo-500 bg-indigo-50" : "border-glass-border bg-secondary/30 hover:bg-secondary/50",
          )}
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <Upload className="size-5" />
          </div>
          <p className="mt-2 text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG · up to 20 MB per file</p>
          <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" hidden onChange={onChange} />
        </div>

        {staged.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-xl border border-glass-border">
            {staged.map((s) => (
              <div key={s.id} className="flex items-center gap-3 border-b border-glass-border/60 p-2.5 last:border-0">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {s.preview ? (
                    <img src={s.preview} alt="" className="size-full object-cover" />
                  ) : s.file.type === "application/pdf" ? (
                    <FileText className="size-5 text-rose-600" />
                  ) : s.file.type.startsWith("image/") ? (
                    <ImageIcon className="size-5 text-emerald-600" />
                  ) : (
                    <FileIcon className="size-5 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.file.name}</p>
                  <p className="text-xs text-muted-foreground">{kb(s.file.size)} · {s.file.type || "file"}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => remove(s.id)}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div>
          <Label>Note (optional)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 rounded-xl" placeholder="Context for the accountant…" />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white" onClick={submit} disabled={!staged.length || !canUpload}>
            <Upload className="me-2 size-4" /> Upload {staged.length ? `${staged.length} file${staged.length > 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
