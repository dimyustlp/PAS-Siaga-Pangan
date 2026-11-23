"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  ChartColumn,
  ClipboardList,
  Database,
  DatabaseZap,
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
  sdp: DatabaseZap,
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
const SDP: Item = { href: "/sdp", label: "Data SDP pangan", icon: "sdp" };
const TINDAK: Item = { href: "/tindak-lanjut", label: "Tindak lanjut", icon: "tindak" };

/** Menu utama tampil langsung di tengah atas; sisanya di "Menu lain" (bisa dicari). */
const MENU: Record<Role, { utama: Item[]; lain: Item[] }> = {
  administrator: {
    utama: [DASBOR, PETA, LAPORAN, EVALUASI, PANGAN, { href: "/akun", label: "Akun", icon: "akun" }],
    lain: [
      SDP, LALU, INDUK, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN,
      { href: "/admin/wilayah", label: "UPT & Kanwil", icon: "wilayah" },
      { href: "/admin/drive", label: "Google Drive & batas unggah", icon: "drive" },
      { href: "/admin/gelang", label: "Penerima gelang", icon: "gelang" },
      { href: "/admin/notifikasi", label: "Notifikasi Telegram & latihan", icon: "notifikasi" },
      { href: "/admin/audit", label: "Jejak audit", icon: "audit" },
    ],
  },
  pemantau_pusat: {
    utama: [DASBOR, PETA, LAPORAN, EVALUASI, PANGAN, { href: "/akun", label: "Akun Kanwil & UPT", icon: "akun" }],
    lain: [SDP, LALU, INDUK, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN],
  },
  pemantau_kanwil: {
    utama: [DASBOR, PETA, LAPORAN, EVALUASI, PANGAN, { href: "/akun", label: "Akun UPT", icon: "akun" }],
    lain: [SDP, LALU, INDUK, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN],
  },
  ka_upt: {
    utama: [DASBOR, LAPORAN, EVALUASI, PANGAN, INDUK, KOP],
    lain: [SDP, PETA, LALU, BERKAS, GELANG, RISIKO, BERITA, PEDOMAN],
  },
  operator: {
    utama: [DASBOR, { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" }, LAPORAN, TINDAK, INDUK, BERKAS],
    lain: [SDP, PETA, LALU, PANGAN, GELANG, EVALUASI, RISIKO, BERITA, PEDOMAN, KOP],
  },
  kepala_pengamanan: {
    utama: [DASBOR, { href: "/keputusan", label: "Keputusan", icon: "keputusan" }, LAPORAN, TINDAK, EVALUASI, GELANG],
    lain: [SDP, PETA, LALU, PANGAN, INDUK, BERKAS, RISIKO, BERITA, PEDOMAN, KOP],
  },
  pengawal: {
    utama: [{ href: "/lapangan", label: "Tugas lapangan", icon: "kegiatan" }, BERKAS, GELANG, BERITA, PEDOMAN],
    lain: [],
  },
};

function aktif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/sesi") : pathname === href || pathname.startsWith(href + "/");
}

function Butir({ item, pathname }: { item: Item; pathname: string }) {
  const Icon = ICONS[item.icon];
  const on = aktif(pathname, item.href);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={on ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[0.95rem] font-medium transition-[background-color,color] duration-200",
          on ? "bg-white/[0.11] text-white" : "text-[#b9cce8] hover:bg-white/[0.06] hover:text-white"
        )}
      >
        <span
          className={cn("absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-[#c89a34] transition-opacity duration-300", on ? "opacity-100" : "opacity-0")}
          aria-hidden
        />
        <Icon className={cn("h-[1.15rem] w-[1.15rem] shrink-0 transition-colors", on ? "text-[#e6c06a]" : "text-[#7fa5dc] group-hover:text-[#b9cce8]")} aria-hidden />
        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    </li>
  );
}

/** Menu samping bergaya Trans-Siber: kelompok "Menu utama" dan "Lainnya". */
export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const { utama, lain } = MENU[role];
  return (
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]" aria-label="Menu utama">
      <p className="px-3 pb-2 font-mono text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[#8fa6cc]">Menu utama</p>
      <ul className="space-y-0.5">
        {utama.map((item) => <Butir key={item.href} item={item} pathname={pathname} />)}
      </ul>
      {lain.length > 0 && (
        <>
          <p className="mt-5 px-3 pb-2 font-mono text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[#8fa6cc]">Lainnya</p>
          <ul className="space-y-0.5">
            {lain.map((item) => <Butir key={item.href} item={item} pathname={pathname} />)}
          </ul>
        </>
      )}
    </nav>
  );
}
