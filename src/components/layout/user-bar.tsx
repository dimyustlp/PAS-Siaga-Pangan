import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/rbac";

function inisial(nama: string) {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  return ((bagian[0]?.[0] ?? "") + (bagian.length > 1 ? bagian[bagian.length - 1][0] : "")).toUpperCase() || "?";
}

export function UserBar({ name, role, gelap = false }: { name: string; role: Role; gelap?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white shadow-sm" aria-hidden>
        {inisial(name)}
      </span>
      <div className={gelap ? "hidden leading-tight text-white sm:block" : "hidden leading-tight sm:block"}>
        <p className="text-sm font-semibold">{name}</p>
        <p className={gelap ? "text-xs text-white/65" : "text-xs text-muted-foreground"}>{ROLE_LABEL[role]}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm" aria-label="Keluar" className={gelap ? "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" : undefined}>
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Keluar</span>
        </Button>
      </form>
    </div>
  );
}
