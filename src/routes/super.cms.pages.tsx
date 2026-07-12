import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Search, Pencil, Trash2, GripVertical, Globe, FileEdit, Archive } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { RichEditor } from "@/components/cms/RichEditor";
import {
  listPages, createPage, updatePage, deletePage, reorderPages, slugify,
  type PageDTO, type UiStatus,
} from "@/lib/cms.functions";

export const Route = createFileRoute("/super/cms/pages")({ component: CmsPagesRoute });

type PageStatus = UiStatus;
type CmsPage = PageDTO;

type FormState = {
  title: string; slug: string; content: string; status: PageStatus;
  metaTitle: string; metaDescription: string;
};
const emptyForm: FormState = { title: "", slug: "", content: "", status: "draft", metaTitle: "", metaDescription: "" };

function statusBadge(s: PageStatus) {
  if (s === "published") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">منشور</Badge>;
  if (s === "draft") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">مسودة</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">مؤرشف</Badge>;
}

function CmsPagesRoute() {
  const qc = useQueryClient();
  const listPagesFn = useServerFn(listPages);
  const createPageFn = useServerFn(createPage);
  const updatePageFn = useServerFn(updatePage);
  const deletePageFn = useServerFn(deletePage);
  const reorderPagesFn = useServerFn(reorderPages);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cms", "pages"],
    queryFn: () => listPagesFn({ data: {} }),
  });
  const pagesAll = useMemo<CmsPage[]>(() => data?.items ?? [], [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cms", "pages"] });
  const createMut = useMutation({ mutationFn: (d: FormState) => createPageFn({ data: d }), onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: (v: { id: string; patch: Partial<FormState> }) => updatePageFn({ data: v }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: (id: string) => deletePageFn({ data: { id } }), onSuccess: invalidate });
  const reorderMut = useMutation({ mutationFn: (orderedIds: string[]) => reorderPagesFn({ data: { orderedIds } }), onSuccess: invalidate });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PageStatus>("all");
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<CmsPage | null>(null);

  const pages = useMemo(() => {
    const s = q.toLowerCase();
    return [...pagesAll]
      .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
      .filter((p) => !s || p.title.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s))
      .sort((a, b) => a.order - b.order);
  }, [pagesAll, q, statusFilter]);

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: CmsPage) {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, content: p.content, status: p.status, metaTitle: p.metaTitle, metaDescription: p.metaDescription });
    setOpen(true);
  }

  function save() {
    if (!form.title.trim()) return;
    const payload = { ...form, slug: form.slug || slugify(form.title) };
    if (editing) updateMut.mutate({ id: editing.id, patch: payload });
    else createMut.mutate(payload);
    setOpen(false);
  }

  function togglePublish(p: CmsPage) {
    updateMut.mutate({ id: p.id, patch: { status: p.status === "published" ? "draft" : "published" } });
  }
  function archive(p: CmsPage) { updateMut.mutate({ id: p.id, patch: { status: "archived" } }); }

  function onDragEnd(res: DropResult) {
    if (!res.destination || res.destination.index === res.source.index) return;
    const ids = pages.map((p) => p.id);
    const [moved] = ids.splice(res.source.index, 1);
    ids.splice(res.destination.index, 0, moved);
    reorderMut.mutate(ids);
  }


  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">الصفحات</h1>
            <p className="text-sm text-muted-foreground">أدر صفحات موقعك — اسحب لإعادة الترتيب.</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="size-4" /> صفحة جديدة</Button>
        </div>

        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعنوان أو المسار…" className="ps-10" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
            <div className="ms-auto text-xs text-muted-foreground">{pages.length} من {pagesAll.length}</div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>العنوان</TableHead>
                <TableHead>المسار</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر تحديث</TableHead>
                <TableHead className="text-end">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="pages">
                {(prov) => (
                  <TableBody ref={prov.innerRef} {...prov.droppableProps}>
                    {pages.map((p, i) => (
                      <Draggable key={p.id} draggableId={p.id} index={i}>
                        {(dp, snap) => (
                          <TableRow ref={dp.innerRef} {...dp.draggableProps} className={snap.isDragging ? "bg-indigo-50" : ""}>
                            <TableCell {...dp.dragHandleProps} className="cursor-grab text-slate-400"><GripVertical className="size-4" /></TableCell>
                            <TableCell className="font-medium">{p.title}</TableCell>
                            <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" title={p.status === "published" ? "تحويل إلى مسودة" : "نشر"} onClick={() => togglePublish(p)}>
                                  {p.status === "published" ? <FileEdit className="size-4" /> : <Globe className="size-4" />}
                                </Button>
                                <Button size="icon" variant="ghost" title="أرشفة" onClick={() => archive(p)}><Archive className="size-4" /></Button>
                                <Button size="icon" variant="ghost" title="تعديل" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                                <Button size="icon" variant="ghost" title="حذف" onClick={() => setConfirmDelete(p)} className="text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                    {pages.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">لا توجد صفحات مطابقة.</TableCell></TableRow>
                    )}
                  </TableBody>
                )}
              </Droppable>
            </DragDropContext>
          </Table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? "تعديل الصفحة" : "صفحة جديدة"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value), metaTitle: form.metaTitle || e.target.value })} />
              </div>
              <div>
                <Label>المسار (Slug)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="about-us" />
              </div>
            </div>
            <div>
              <Label>المحتوى</Label>
              <RichEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PageStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="published">منشور</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meta title (SEO)</Label>
                <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Meta description (SEO)</Label>
              <Textarea rows={2} value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصفحة؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف "{confirmDelete?.title}" نهائياً. لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (confirmDelete) deleteMut.mutate(confirmDelete.id); setConfirmDelete(null); }}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
