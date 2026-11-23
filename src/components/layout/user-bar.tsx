import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";

function inisial(nama: string) {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  return ((bagian[0]?.[0] ?? "") + (bagian.length > 1 ? bagian[bagian.length - 1][0] : "")).toUpperCase() || "?";
}

/** Identitas pengguna dan tombol keluar. `ringkas` hanya inisial; `gelap` untuk di atas pita gelap. */
export function UserBar({ name, role, ringkas = false, gelap = false }: { name: string; role: Role; ringkas?: boolean; gelap?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(44_90%_60%)] to-[hsl(36_80%_44%)] font-mono text-[11px] font-semibold text-[hsl(222_64%_14%)] ring-2 ring-white/80"
        aria-hidden
      >
        {inisial(name)}
      </span>
      {!ringkas && (
        <div className="hidden min-w-0 max-w-[12rem] leading-tight sm:block">
          <p className={cn("truncate text-sm font-medium", gelap && "text-white")}>{name}</p>
          <p className={cn("truncate text-[11px]", gelap ? "text-white/70" : "text-muted-foreground")}>{ROLE_LABEL[role]}</p>
        </div>
      )}
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Keluar"
          title="Keluar"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border transition-[color,background-color,transform] duration-300 active:scale-95",
            gelap ? "border-white/30 bg-white/10 text-white hover:bg-white/25" : "border-border bg-white text-muted-foreground hover:bg-destructive/15 hover:text-[hsl(0_70%_42%)]"
          )}
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
