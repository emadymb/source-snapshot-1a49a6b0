import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldCheck, Lock, Mail, KeyRound, ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff/login")({
  head: () => ({
    meta: [
      { title: "Staff Sign in — Fiksu" },
      { name: "description", content: "Restricted staff & administrator gateway for Fiksu." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !accessCode) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success(`Welcome back, ${email.split("@")[0]}`);
      navigate({ to: "/admin" });
    }, 700);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full bg-indigo-600/20 blur-3xl" />

      <Link
        to="/login"
        search={{ redirect: undefined }}
        className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur transition-colors hover:bg-white/10"
      >
        <ArrowLeft className="size-3.5" />
        Back to client sign-in
      </Link>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white">Fiksu</p>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                Staff Portal
              </span>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-white">Welcome back, team</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your staff credentials and access code.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-email" className="text-slate-200">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="staff-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@fiksu.app"
                  className="border-white/10 bg-white/5 ps-9 text-white placeholder:text-slate-500"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password" className="text-slate-200">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="staff-password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-white/5 ps-9 text-white placeholder:text-slate-500"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-code" className="text-slate-200">Access code</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="staff-code" required value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Rotating 6-digit code"
                  className="border-white/10 bg-white/5 ps-9 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <Button
              type="submit" disabled={submitting}
              className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:opacity-95"
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign in to admin
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Session activity is monitored and audited.
          </p>
        </div>
      </div>
    </div>
  );
}
