import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Link2 } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cmsStore, useCmsStore, type MenuItem } from "@/lib/mock/cms";

export const Route = createFileRoute("/super/cms/menus")({ component: CmsMenusRoute });

function CmsMenusRoute() {
  const menus = useCmsStore((s) => s.menus);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ label: "", url: "" });

  function reorder(menuId: string, items: MenuItem[], res: DropResult) {
    if (!res.destination || res.destination.index === res.source.index) return;
    const arr = [...items];
    const [m] = arr.splice(res.source.index, 1);
    arr.splice(res.destination.index, 0, m);
    cmsStore.updateMenu(menuId, arr);
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold">القوائم</h1>
          <p className="text-sm text-muted-foreground">اسحب لإعادة ترتيب عناصر قوائم الرأس والتذييل.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {menus.map((menu) => (
            <Card key={menu.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{menu.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">{menu.location === "header" ? "رأس الصفحة" : "التذييل"}</Badge>
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => { setAddingTo(menu.id); setNewItem({ label: "", url: "" }); }}>
                  <Plus className="size-4" /> إضافة عنصر
                </Button>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={(res) => reorder(menu.id, menu.items, res)}>
                  <Droppable droppableId={menu.id}>
                    {(prov) => (
                      <ul ref={prov.innerRef} {...prov.droppableProps} className="space-y-2">
                        {menu.items.map((it, i) => (
                          <Draggable key={it.id} draggableId={it.id} index={i}>
                            {(dp, snap) => (
                              <li ref={dp.innerRef} {...dp.draggableProps} className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 ${snap.isDragging ? "shadow-lg ring-2 ring-indigo-300" : ""}`}>
                                <span {...dp.dragHandleProps} className="cursor-grab text-slate-400"><GripVertical className="size-4" /></span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{it.label}</p>
                                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Link2 className="size-3" />{it.url}</p>
                                </div>
                                {it.children && it.children.length > 0 && <Badge variant="outline" className="text-[10px]">{it.children.length} فرعية</Badge>}
                                <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => cmsStore.removeMenuItem(menu.id, it.id)}><Trash2 className="size-4" /></Button>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                        {menu.items.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">لا توجد عناصر بعد.</li>}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!addingTo} onOpenChange={(o) => !o && setAddingTo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>عنصر قائمة جديد</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>التسمية</Label><Input value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} placeholder="من نحن" /></div>
            <div><Label>الرابط</Label><Input value={newItem.url} onChange={(e) => setNewItem({ ...newItem, url: e.target.value })} placeholder="/about" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingTo(null)}>إلغاء</Button>
            <Button onClick={() => {
              if (addingTo && newItem.label.trim()) {
                cmsStore.addMenuItem(addingTo, { label: newItem.label, url: newItem.url || "#" });
                setAddingTo(null);
              }
            }}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
