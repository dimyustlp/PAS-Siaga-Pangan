"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  ChartColumn,
  ChevronDown,
  ClipboardList,
  Database,
  FileCheck2,
  FolderOpen,
  Gavel,
  HardDrive,
  LayoutDashboard,
  ListChecks,
  Map as IkonPeta,
  MapPinned,
  Newspaper,
  Radio,
  ScrollText,
  Search,
  ShieldAlert,
  Sprout,
  Stamp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/rbac";

const ICONS = {
  dasbor: LayoutDashboard,
  kegiatan: ClipboardList,
  keputusan: Gavel,
  tindak: ListChecks,
  evaluasi: ChartColumn,
  risiko: ShieldAlert,
  pedoman: BookOpen,
  akun: Users,
  wilayah: MapPinned,
  induk: Database,
  audit: ScrollText,
  berkas: FolderOpen,
  gelang: Radio,
  peta: IkonPeta,
  notifikasi: Bell,
  berita: Newspaper,
  pangan: Sprout,
  lalulintas: ArrowLeftRight,
  laporan: FileCheck2,
  drive: HardDrive,
  kop: Stamp,
};

type Item = { href: string; label: string; icon: keyof typeof ICONS };

const DASBOR: Item = { href: "/", label: "Dasbor", icon: "dasbor" };
const PETA: Item = { href: "/peta", label: "Peta kegiatan", icon: "peta" };
const LAPORAN: Item = { href: "/laporan", label: "Laporan kegiatan", icon: "laporan" };
const EVALUASI: Item = { href: "/evaluasi", label: "Evaluasi", icon: "evaluasi" };
const PANGAN: Item = { href: "/pangan", label: "Hasil pangan", icon: "pangan" };
const LALU: Item = { href: "/lalu-lintas", label: "Lalu lintas WBP", icon: "lalulintas" };
const INDUK: Item = { href: "/data-induk", label: "Data induk", icon: "induk" };
const BERKAS: Item = { href: "/berkas", label: "Berkas", icon: "berkas" };
const GELANG: Item = { href: "/gelang", label: "Gelang", icon: "gelang" };
const RISIKO: Item = { href: "/risiko", label: "Risiko & mitigasi", icon: "risiko" };
const BERITA: Item = { href: "/berita", label: "Berita", icon: "berita" };
const PEDOMAN: Item = { href: "/pedoman", label: "Pedoman & SOP", icon: "pedoman" };
const KOP: Item = { href: "/kop-surat", label: "Kop surat UPT", icon: "kop" };
const TINDAK: Item = { href: "/tindak-lanjut", label: "Tindak lanjut", icon: "tindak" };

/** Menu utama tampil langsung di tengah atas; sisanya di "Menu lain" (bisa dicari). */
const MENU: Record<Role, { utama: Item[]; lain: Item[] }> = {
  administrator: {
    utama: [DASBOR, PETA, LAPORAN, EVALUASI, PANGAN, { href: "/akun", label: "Akun", icon: "akun" }],
    lain: [
      LALU, INDUK, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN,
      { href: "/admin/wilayah", label: "UPT & Kanwil", icon: "wilayah" },
      { href: "/admin/drive", label: "Google Drive & batas unggah", icon: "drive" },
      { href: "/admin/gelang", label: "Penerima gelang", icon: "gelang" },
      { href: "/admin/notifikasi", label: "Notifikasi Telegram & latihan", icon: "notifikasi" },
      { href: "/admin/audit", label: "Jejak audit", icon: "audit" },
    ],
  },
  pemantau_pusat: {
    utama: [DASBOR, PETA, LAPORAN, EVALUASI, PANGAN, { href: "/akun", label: "Akun Kanwil & UPT", icon: "akun" }],
    lain: [LALU, INDUK, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN],
  },
  pemantau_kanwil: {
    utama: [DASBOR, PETA, LAPORAN, EVALUASI, PANGAN, { href: "/akun", label: "Akun UPT", icon: "akun" }],
    lain: [LALU, INDUK, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN],
  },
  ka_upt: {
    utama: [DASBOR, LAPORAN, EVALUASI, PANGAN, INDUK, KOP],
    lain: [PETA, LALU, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN],
  },
  operator: {
    utama: [DASBOR, { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" }, LAPORAN, TINDAK, INDUK, BERKAS],
    lain: [PETA, LALU, PANGAN, GELANG, EVALUASI, RISIKO, BERITA, PEDOMAN, KOP],
  },
  kepala_pengamanan: {
    utama: [DASBOR, { href: "/keputusan", label: "Keputusan", icon: "keputusan" }, LAPORAN, TINDAK, EVALUASI, GELANG],
    lain: [PETA, LALU, PANGAN, INDUK, BERKAS, RISIKO, BERITA, PEDOMAN, KOP],
  },
  pengawal: {
    utama: [{ href: "/lapangan", label: "Tugas lapangan", icon: "kegiatan" }, BERKAS, GELANG, BERITA, PEDOMAN],
    lain: [],
  },
};

function aktif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/sesi") : pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const { utama, lain } = MENU[role];
  const [buka, setBuka] = React.useState(false);
  const [cari, setCari] = React.useState("");
  const kotak = React.useRef<HTMLDivElement>(null);
  const lainAktif = lain.find((i) => aktif(pathname, i.href));

  React.useEffect(() => {
    setBuka(false);
    setCari("");
  }, [pathname]);
  React.useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  const semua = [...utama, ...lain];
  const kata = cari.trim().toLowerCase();
  const hasil = kata ? semua.filter((i) => i.label.toLowerCase().includes(kata)) : lain;

  return (
    <nav className="flex items-center justify-start gap-1.5 overflow-x-auto px-3 py-2.5 md:justify-center lg:gap-2 md:overflow-visible" aria-label="Menu utama">
      {utama.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const on = aktif(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[15px] font-semibold transition-[background-color,color] duration-300",
              on ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_hsl(222_64%_20%/0.8)]" : "text-secondary-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", on ? "text-[hsl(44_90%_66%)]" : "text-brand")} aria-hidden />
            {label}
          </Link>
        );
      })}

      {lain.length > 0 && (
        <div ref={kotak} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={buka}
            aria-haspopup="menu"
            onClick={() => setBuka((b) => !b)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors",
              lainAktif ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary"
            )}
          >
            {lainAktif ? lainAktif.label : "Menu lain"}
            <ChevronDown className={cn("h-5 w-5 transition-transform", buka && "rotate-180")} aria-hidden />
          </button>
          {buka && (
            <div role="menu" className="kaca fixed left-1/2 top-[8.5rem] z-50 w-[min(22rem,92vw)] -translate-x-1/2 rounded-2xl p-2 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:translate-x-0">
              <label className="mb-1 flex items-center gap-2 rounded-xl border border-input bg-white px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  autoFocus
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari menu…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Cari menu"
                />
              </label>
              <ul className="max-h-[60vh] overflow-y-auto">
                {hasil.map(({ href, label, icon }) => {
                  const Icon = ICONS[icon];
                  const on = aktif(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        role="menuitem"
                        href={href}
                        className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", on ? "bg-primary/10 font-semibold text-primary" : "hover:bg-secondary")}
                      >
                        <Icon className="h-4 w-4 text-brand" aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
                {hasil.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Menu tidak ditemukan.</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
