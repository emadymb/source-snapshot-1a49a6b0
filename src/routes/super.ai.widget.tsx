import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Copy, Check, ExternalLink } from "lucide-react";
import { AiScreen } from "@/components/ai/AiScreen";
import { DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/super/ai/widget")({ component: WidgetPage });

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function WidgetPage() {
  const [origin, setOrigin] = useState("");
  const [title, setTitle] = useState("Fiksu AI");
  const [color, setColor] = useState("#6366f1");
  const [greeting, setGreeting] = useState("مرحباً! أنا مساعد Fiksu. كيف أستطيع مساعدتك؟");
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const snippet = useMemo(() => {
    const base = origin || "https://your-fiksu-domain.example";
    return `<script src="${base}/api/public/widget/embed.js"\n  data-fiksu-title="${title}"\n  data-fiksu-color="${color}"\n  data-fiksu-greeting="${greeting.replace(/"/g, "&quot;")}"></script>`;
  }, [origin, title, color, greeting]);

  const previewHtml = useMemo(() => {
    if (!origin) return "";
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Preview</title><style>body{margin:0;font-family:system-ui;background:#f1f5f9;color:#334155;padding:32px}</style></head><body><h3 style="margin:0 0 8px">معاينة الودجت</h3><p>سيظهر زر الدردشة أسفل يمين الصفحة.</p><script src="${origin}/api/public/widget/embed.js" data-fiksu-title="${escapeAttr(title)}" data-fiksu-color="${escapeAttr(color)}" data-fiksu-greeting="${escapeAttr(greeting)}"></script></body></html>`;
  }, [origin, title, color, greeting]);

  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;
    iframeRef.current.srcdoc = previewHtml;
  }, [previewHtml]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("تم نسخ الكود");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  return (
    <AiScreen
      title="Chat Widget"
      description="ودجت دردشة قابل للتضمين على أي موقع خارجي — يلتقط استفسارات الزوّار وبيانات التواصل."
      icon={MessageSquare}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="التخصيص">
          <div className="space-y-3">
            <div>
              <Label htmlFor="w-title">العنوان</Label>
              <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="w-color">اللون</Label>
              <div className="flex gap-2">
                <Input id="w-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 p-1" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="w-greet">رسالة الترحيب</Label>
              <Input id="w-greet" value={greeting} onChange={(e) => setGreeting(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <Label>كود التضمين</Label>
            <pre className="mt-1 max-h-52 overflow-auto rounded-lg border border-glass-border bg-muted/40 p-3 text-xs leading-relaxed">{snippet}</pre>
            <div className="mt-2 flex gap-2">
              <Button onClick={copy} className="rounded-xl">
                {copied ? <Check className="me-2 size-4" /> : <Copy className="me-2 size-4" />}
                {copied ? "تم النسخ" : "نسخ الكود"}
              </Button>
              {origin && (
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={`${origin}/api/public/widget/embed.js`} target="_blank" rel="noreferrer">
                    <ExternalLink className="me-2 size-4" /> عرض السكربت
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DataCard>
        <DataCard title="معاينة مباشرة">
          <iframe
            ref={iframeRef}
            title="Widget preview"
            className="h-[520px] w-full rounded-lg border border-glass-border bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </DataCard>
      </div>
      <DataCard title="كيف يعمل">
        <ol className="list-decimal space-y-1 pe-5 text-sm text-muted-foreground">
          <li>الصق كود التضمين في أي صفحة HTML قبل إغلاق وسم <code>&lt;/body&gt;</code>.</li>
          <li>عند فتح الزائر للدردشة، تُرسل الرسائل إلى <code>/api/public/widget/chat</code> وتُعالَج عبر Gemini.</li>
          <li>إذا شارك الزائر اسمه أو بريده أو هاتفه، يحفظ النظام تلقائياً عميلاً محتملاً في صفحة <b>AI Leads</b>.</li>
        </ol>
      </DataCard>
    </AiScreen>
  );
}