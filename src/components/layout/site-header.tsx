import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo, LogoInstansi } from "@/components/layout/logo";
import { KerangkaSamping } from "@/components/layout/kerangka-samping";
import { NavLinks } from "@/components/layout/nav-links";
import { signOut } from "@/lib/actions/auth";
import { LABEL_TINGKAT, ROLE_LABEL, tingkatPeran, type Role } from "@/lib/rbac";

function inisial(nama: string) {
  const b = nama.trim().split(/\s+/).filter(Boolean);
  return ((b[0]?.[0] ?? "") + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * Panel samping resmi bergaya Trans-Siber: lambang instansi, nama aplikasi, menu, lalu identitas pengguna.
 * Warna panel menandai tingkat pengguna (Pusat dongker, Kanwil biru baja, UPT hijau tua).
 */
export function SiteHeader({ name, role, unit }: { name: string; role: Role; unit: string | null }) {
  const tingkat = tingkatPeran(role);
  const kelas = tingkat === "pusat" ? "bg-samping-pusat" : tingkat === "kanwil" ? "bg-samping-kanwil" : "bg-samping-upt";
  return (
    <KerangkaSamping kelas={kelas}>
      <div className="px-5 pt-5">
        <LogoInstansi kecil />
        <p className="mt-3 font-mono text-[0.6rem] font-medium uppercase leading-relaxed tracking-[0.16em] text-[#95D5B2]">
          Kementerian Imigrasi dan Pemasyarakatan
          <br />
          Direktorat Jenderal Pemasyarakatan
        </p>
      </div>
      <Link href="/" className="mx-5 mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
        <Logo kecil />
        <span className="min-w-0 leading-tight">
          <span className="block text-[1.1rem] font-bold tracking-tight">
            PAS-SIAGA <span className="text-[#FBBF24]">PANGAN</span>
          </span>
          <span className="block text-[0.72rem] text-[#95D5B2]">Pengamanan ketahanan pangan</span>
        </span>
      </Link>

      <NavLinks role={role} />

      <div className="border-t border-white/10 p-4">
        <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[#FBBF24]">{LABEL_TINGKAT[tingkat]}</p>
        {unit && <p className="mt-0.5 truncate text-[0.78rem] text-[#B7E4C7]" title={unit}>{unit}</p>}
        <div className="mt-3 flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FBBF24] to-[#B45309] font-mono text-[0.75rem] font-semibold text-[#1B4332]"
            aria-hidden
          >
            {inisial(name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.9rem] font-semibold">{name}</p>
            <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[#95D5B2]">{ROLE_LABEL[role]}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Keluar"
              title="Keluar"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white/85 transition-[background-color,transform] duration-200 hover:bg-white/[0.15] active:scale-95"
            >
              <LogOut className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </KerangkaSamping>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-10 border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground md:px-8">
        <span>Direktorat Pengamanan dan Intelijen · Ditjen Pemasyarakatan</span>
      </div>
    </footer>
  );
}
