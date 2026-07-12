// Route guard used in protected layout `beforeLoad`s.
// Calls the `me` server function (which only verifies the access-token cookie —
// no DB), redirects to /login when unauthenticated, and to the user's home area
// when their role may not enter the requested area.

import { redirect } from "@tanstack/react-router";
import { me, type MeResult } from "@/lib/auth.functions";
import { canEnterArea, homeForRole } from "@/lib/auth/constants";

type Area = "/super" | "/firm" | "/client";

export async function requireArea(area: Area, href: string): Promise<{ session: MeResult }> {
  const session = await me();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: href } });
  }
  if (!canEnterArea(session.user.role, area)) {
    throw redirect({ to: homeForRole(session.user.role) });
  }
  return { session };
}
