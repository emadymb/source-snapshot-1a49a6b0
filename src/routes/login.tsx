import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login } from "@/lib/auth.functions";
import { homeForRole } from "@/lib/auth/constants";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Momken" },
      { name: "description", content: "Sign in to your Momken workspace." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const loginFn = useServerFn(login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await loginFn({ data: { email, password } });
      await router.invalidate();
      if (redirect) {
        window.location.assign(redirect);
      } else {
        navigate({ to: homeForRole(res.user.role) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#fafbfc]">
      <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Sparkles className="size-4" /></div>
            <span className="font-display text-lg font-semibold text-slate-900">Momken</span>
          </Link>
          <h1 className="mt-10 font-display text-4xl font-semibold text-slate-900 leading-tight">Welcome back.<br/>Books do not close themselves.</h1>
          <p className="mt-4 max-w-md text-slate-600">Sign in to your workspace. If your firm invited you, use the same email.</p>
          <div className="glass mt-8 rounded-2xl border-glass-border p-5 max-w-md">
            <p className="text-sm text-slate-700">"We cut our monthly close from 8 days to 2. The AI journal drafts alone paid for the year."</p>
            <p className="mt-3 text-xs font-medium text-slate-900">Erik Lindqvist — Founder, Lindqvist Oy</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="glass rounded-3xl border-glass-border p-8">
            <div className="lg:hidden mb-6 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Sparkles className="size-4" /></div>
              <span className="font-display text-lg font-semibold text-slate-900">Momken</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600">Sign in to your Momken workspace.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <div>
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.fi" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5" />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Checkbox id="tos" /><label htmlFor="tos">Keep me signed in for 30 days</label>
              </div>
              <Button type="submit" disabled={pending} className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              New to Momken?{" "}
              <Link to="/signup" className="font-medium text-blue-600 hover:underline">Start a trial</Link>
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
              Demo: <span className="font-medium">owner@fiksu.dev</span> · <span className="font-medium">firm@fiksu.dev</span> · <span className="font-medium">super@fiksu.dev</span> — password <span className="font-medium">Fiksu123!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
