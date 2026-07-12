import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ClientRegisterWizard } from "@/components/registration/ClientRegisterWizard";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  return (
    <div dir="ltr" className="min-h-dvh bg-[oklch(0.97_0.008_260)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Sparkles className="size-4" />
            </div>
            <span className="font-display text-xl font-semibold">Fiksu</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" search={{ redirect: undefined }} className="font-medium text-indigo-600 hover:underline">Sign in</Link>
          </p>
        </div>
        <div className="rounded-3xl border border-glass-border bg-white/80 p-8 shadow-xl backdrop-blur">
          <ClientRegisterWizard variant="signup" onCreated={() => setTimeout(() => navigate({ to: "/client" }), 800)} />
        </div>
      </div>
    </div>
  );
}
