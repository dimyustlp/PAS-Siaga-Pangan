import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/rbac";

function inisial(nama: string) {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  return ((bagian[0]?.[0] ?? "") + (bagian.length > 1 ? bagian[bagian.length - 1][0] : "")).toUpperCase() || "?";
}

/** Identitas pengguna dan tombol keluar. `ringkas` untuk bilah atas di layar kecil. */
export function UserBar({ name, role, ringkas = false }: { name: string; role: Role; ringkas?: boolean; gelap?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(214_96%_63%)] to-[hsl(234_70%_55%)] font-mono text-[11px] font-semibold text-white ring-2 ring-white"
        aria-hidden
      >
        {inisial(name)}
      </span>
      {!ringkas && (
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
      )}
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Keluar"
          title="Keluar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-[color,background-color,transform] duration-500 hover:bg-destructive/15 hover:text-[hsl(0_70%_42%)] active:scale-95"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
