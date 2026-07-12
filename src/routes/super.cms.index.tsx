import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Newspaper, Menu as MenuIcon, Users, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCmsStore } from "@/lib/mock/cms";

export const Route = createFileRoute("/super/cms/")({ component: CmsDashboard });

function CmsDashboard() {
  const pages = useCmsStore((s) => s.pages);
  const posts = useCmsStore((s) => s.posts);
  const menus = useCmsStore((s) => s.menus);
  const activity = useCmsStore((s) => s.activity);

  const published = pages.filter((p) => p.status === "published").length;
  const drafts = pages.filter((p) => p.status === "draft").length;

  const stats = [
    { label: "الصفحات", value: pages.length, extra: `${published} منشور · ${drafts} مسودة`, icon: FileText, color: "from-indigo-500 to-violet-500", to: "/super/cms/pages" },
    { label: "المقالات", value: posts.length, extra: `${posts.filter((p) => p.status === "published").length} منشور`, icon: Newspaper, color: "from-cyan-500 to-sky-500", to: "/super/cms/blog" },
    { label: "القوائم", value: menus.length, extra: `${menus.reduce((n, m) => n + m.items.length, 0)} عنصر`, icon: MenuIcon, color: "from-amber-500 to-orange-500", to: "/super/cms/menus" },
    { label: "مساحات العمل", value: 1, extra: "ws_demo", icon: Users, color: "from-emerald-500 to-green-500", to: "/super/workspaces" },
  ];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">لوحة إدارة المحتوى</h1>
          <p className="text-sm text-muted-foreground">CMS Dashboard — نظرة عامة على الصفحات، المقالات، والقوائم.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.label} to={s.to} className="group">
              <Card className="overflow-hidden border-slate-200/70 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className="mt-2 font-display text-3xl font-semibold">{s.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.extra}</p>
                    </div>
                    <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                      <s.icon className="size-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center gap-2">
              <Clock className="size-4 text-slate-500" />
              <CardTitle className="text-base">آخر النشاطات</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {activity.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{a.actor.slice(0, 2)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm"><span className="font-medium">{a.actor}</span> <span className="text-slate-500">{a.action}</span> <span className="font-medium">{a.target}</span></p>
                      <p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
                {activity.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">لا يوجد نشاط بعد.</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <TrendingUp className="size-4 text-slate-500" />
              <CardTitle className="text-base">حالة المحتوى</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "منشور", n: pages.filter((p) => p.status === "published").length + posts.filter((p) => p.status === "published").length, cls: "bg-emerald-500" },
                { label: "مسودة", n: pages.filter((p) => p.status === "draft").length + posts.filter((p) => p.status === "draft").length, cls: "bg-amber-500" },
                { label: "مؤرشف", n: pages.filter((p) => p.status === "archived").length + posts.filter((p) => p.status === "archived").length, cls: "bg-slate-400" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between"><span>{r.label}</span><span className="font-semibold">{r.n}</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${r.cls}`} style={{ width: `${Math.min(100, r.n * 12)}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
