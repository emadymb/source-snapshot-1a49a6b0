import type { ComponentType, ReactNode } from "react";
import { Sparkles } from "lucide-react";

/**
 * AI-branded page shell: deep gradient hero with a neural-net dot pattern,
 * glowing icon badge, and a sparkles chip. Drop-in replacement for `Screen`
 * in every route under the AI Assistant module.
 */
export function AiScreen({
  title,
  description,
  icon: Icon,
  eyebrow = "AI Assistant Module",
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 sm:p-8 shadow-[0_20px_60px_-25px_rgba(79,70,229,0.55)]">
        {/* dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* aurora blobs */}
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-20 size-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-white/40 blur-xl" aria-hidden />
                <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-indigo-700 shadow-lg ring-1 ring-white/40">
                  <Icon className="size-6" />
                </div>
              </div>
            )}
            <div className="text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-indigo-100 ring-1 ring-white/20 backdrop-blur">
                <Sparkles className="size-3" /> {eyebrow}
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100/80">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
