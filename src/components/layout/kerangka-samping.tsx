"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

/**
 * Kerangka panel samping. Di layar lebar panel selalu tampak; di HP ia berupa laci yang dibuka
 * dari tombol menu pada bilah atas. Isi panel dikirim dari server sebagai `children`.
 */
export function KerangkaSamping({ kelas, children }: { kelas: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [buka, setBuka] = React.useState(false);

  React.useEffect(() => setBuka(false), [pathname]);
  React.useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("keydown", esc);
    const awal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = awal;
    };
  }, [buka]);

  return (
    <>
      <div className={cn("no-print sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 px-3 py-2.5 text-white lg:hidden", kelas)}>
        <button
          type="button"
          onClick={() => setBuka(true)}
          aria-label="Buka menu"
          aria-expanded={buka}
          aria-controls="menu-samping"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] transition-colors active:scale-95 hover:bg-white/[0.14]"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Logo kecil />
          <span className="block text-[1.05rem] font-bold tracking-tight">
            PAS-SIAGA <span className="text-[#FBBF24]">PANGAN</span>
          </span>
        </Link>
      </div>

      <div
        onClick={() => setBuka(false)}
        aria-hidden
        className={cn("no-print fixed inset-0 z-40 bg-[rgba(9,16,30,0.5)] transition-opacity duration-300 lg:hidden", buka ? "opacity-100" : "pointer-events-none opacity-0")}
      />

      <aside
        id="menu-samping"
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[86vw] flex-col border-r border-white/[0.06] text-white shadow-[0_0_40px_rgba(9,16,30,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:w-[248px] lg:translate-x-0 lg:shadow-none",
          kelas,
          buka ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setBuka(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {children}
      </aside>
    </>
  );
}
