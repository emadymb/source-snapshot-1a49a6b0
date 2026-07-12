import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2, ImageIcon, X, Globe, FileEdit } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RichEditor } from "@/components/cms/RichEditor";
import { cmsStore, useCmsStore, slugify, type BlogPost, type PageStatus } from "@/lib/mock/cms";

export const Route = createFileRoute("/super/cms/blog")({ component: CmsBlogRoute });

type FormState = {
  title: string; slug: string; excerpt: string; content: string;
  status: PageStatus; tags: string; featuredImage?: string;
};
const emptyForm: FormState = { title: "", slug: "", excerpt: "", content: "", status: "draft", tags: "", featuredImage: undefined };

function CmsBlogRoute() {
  const posts = useCmsStore((s) => s.posts);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | PageStatus>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return [...posts]
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => !s || p.title.toLowerCase().includes(s) || p.tags.some((t) => t.toLowerCase().includes(s)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [posts, q, status]);

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: BlogPost) {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, excerpt: p.excerpt, content: p.content, status: p.status, tags: p.tags.join(", "), featuredImage: p.featuredImage });
    setOpen(true);
  }

  function onImageChange(f?: File) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm((s) => ({ ...s, featuredImage: reader.result as string }));
    reader.readAsDataURL(f);
  }

  function save() {
    if (!form.title.trim()) return;
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      content: form.content,
      status: form.status,
      tags,
      featuredImage: form.featuredImage,
    };
    if (editing) cmsStore.updatePost(editing.id, payload);
    else cmsStore.createPost(payload);
    setOpen(false);
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">المدونة</h1>
            <p className="text-sm text-muted-foreground">أدر مقالات مدونتك مع صور مميزة ووسوم.</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="size-4" /> مقال جديد</Button>
        </div>

        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعنوان أو الوسم…" className="ps-10" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-gradient-to-br from-indigo-100 to-violet-100">
                {p.featuredImage ? (
                  <img src={p.featuredImage} alt={p.title} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-slate-400"><ImageIcon className="size-10" /></div>
                )}
                <div className="absolute end-2 top-2">
                  {p.status === "published" ? (
                    <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">منشور</Badge>
                  ) : p.status === "draft" ? (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">مسودة</Badge>
                  ) : (
                    <Badge className="bg-slate-500 text-white hover:bg-slate-500">مؤرشف</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 p-4">
                <h3 className="font-display line-clamp-2 text-base font-semibold">{p.title}</h3>
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.excerpt || "لا يوجد ملخص"}</p>
                <div className="flex flex-wrap gap-1">
                  {p.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => cmsStore.updatePost(p.id, { status: p.status === "published" ? "draft" : "published" })} title={p.status === "published" ? "تحويل إلى مسودة" : "نشر"}>
                      {p.status === "published" ? <FileEdit className="size-4" /> : <Globe className="size-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(p)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full p-10 text-center text-sm text-muted-foreground">لا مقالات مطابقة.</Card>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? "تعديل المقال" : "مقال جديد"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>المسار</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>الملخص</Label>
              <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>
            <div>
              <Label>الصورة المميزة</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                  {form.featuredImage ? <img src={form.featuredImage} className="size-full object-cover" alt="preview" /> : <ImageIcon className="size-6 text-slate-400" />}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImageChange(e.target.files?.[0])} />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>اختر صورة</Button>
                  {form.featuredImage && (
                    <Button type="button" variant="ghost" className="gap-1 text-red-600" onClick={() => setForm({ ...form, featuredImage: undefined })}>
                      <X className="size-4" /> إزالة
                    </Button>
                  )}
                </div>
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
                <Label>الوسوم (مفصولة بفواصل)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ضريبة, فنلندا" />
              </div>
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
            <AlertDialogTitle>حذف المقال؟</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDelete?.title}" سيُحذف نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (confirmDelete) cmsStore.deletePost(confirmDelete.id); setConfirmDelete(null); }}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
