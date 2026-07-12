import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/super/ai/")({
  beforeLoad: () => { throw redirect({ to: "/super/ai/dashboard" }); },
});
