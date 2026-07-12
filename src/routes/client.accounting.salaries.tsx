import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/client/accounting/salaries")({
  beforeLoad: () => {
    throw redirect({ to: "/client/accounting/payroll" });
  },
  component: () => null,
});
