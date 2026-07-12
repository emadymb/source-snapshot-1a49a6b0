import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/client/ai/")({
  beforeLoad: () => { throw redirect({ to: "/client/ai/chat" }); },
});
