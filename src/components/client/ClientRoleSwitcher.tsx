import { UserCog, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClientRole, ROLE_META, type ClientRole } from "@/lib/client-role";
import { cn } from "@/lib/utils";

/** Demo-only role switcher — lives in the top bar so reviewers can preview
 *  how the client workspace looks for each RBAC persona. */
export function ClientRoleSwitcher() {
  const { role, setRole } = useClientRole();
  const meta = ROLE_META[role];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-xl px-2.5">
          <UserCog className="size-4" />
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", meta.tone)}>
            {meta.short}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Preview role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(ROLE_META) as ClientRole[]).map((r) => (
          <DropdownMenuItem key={r} onClick={() => setRole(r)} className="justify-between">
            <span>{ROLE_META[r].label}</span>
            {role === r && <Check className="size-4 text-indigo-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
