import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/rbac";

export function UserBar({ name, role }: { name: string; role: Role }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm" aria-label="Keluar">
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Keluar</span>
        </Button>
      </form>
    </div>
  );
}
