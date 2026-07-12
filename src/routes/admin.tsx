import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /admin surface has been consolidated into /firm (Firm Admin).
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/firm" });
  },
  component: () => null,
});
