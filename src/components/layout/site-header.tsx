import Link from "next/link";
import { Logo, LogoInstansi } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { UserBar } from "@/components/layout/user-bar";
import { LABEL_TINGKAT, tingkatPeran, type Role } from "@/lib/rbac";

/**
 * Kepala situs resmi: pita biru dongker berlogo instansi, garis emas, lalu menu utama di tengah atas.
 * Warna pita menandai tingkat pengguna (Pusat dongker, Kanwil biru laut, UPT hijau sawah).
 */
export function SiteHeader({ name, role, unit }: { name: string; role: Role; unit: string | null }) {
  const tingkat = tingkatPeran(role);
  const pita = tingkat === "pusat" ? "bg-navy" : tingkat === "kanwil" ? "bg-kanwil-gradient" : "bg-upt-gradient";
  return (
    <header className="no-print">
      <div className={`${pita} text-white`}>
        <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 py-2.5 md:px-8">
          <span className="hidden sm:flex"><LogoInstansi /></span>
          <span className="hidden h-9 w-px bg-white/25 sm:block" aria-hidden />
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[0.625rem] font-medium uppercase tracking-[0.2em] text-white/70">
                Kementerian Imigrasi dan Pemasyarakatan RI
              </span>
              <span className="block text-[1.0625rem] font-bold tracking-tight">
                PAS-SIAGA <span className="text-[hsl(44_90%_66%)]">PANGAN</span>
              </span>
              <span className="hidden truncate text-[0.6875rem] text-white/75 md:block">
                Pengamanan Kegiatan Ketahanan Pangan Pemasyarakatan
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right leading-tight lg:block">
              <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-[hsl(44_90%_66%)]">{LABEL_TINGKAT[tingkat]}</span>
              {unit && <span className="block max-w-[18rem] truncate text-xs text-white/80">{unit}</span>}
            </span>
            <UserBar name={name} role={role} gelap />
          </div>
        </div>
        <div className="garis-emas h-[3px]" aria-hidden />
      </div>
      <div className="bg-sidebar sticky top-0 z-40 border-b border-border/70 backdrop-blur-xl">
        <div className="mx-auto max-w-[1680px]">
          <NavLinks role={role} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-10 border-t border-border/70 bg-white/60">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:px-8">
        <span>Direktorat Pengamanan dan Intelijen · Direktorat Jenderal Pemasyarakatan</span>
        <span>Pertanian · Perkebunan · Perikanan · Peternakan</span>
      </div>
    </footer>
  );
}
