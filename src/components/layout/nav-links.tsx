"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  Database,
  FolderOpen,
  Gavel,
  Radio,
  LayoutDashboard,
  ListChecks,
  Map as IkonPeta,
  MapPinned,
  ScrollText,
  ShieldAlert,
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
};

type Item = { href: string; label: string; icon: keyof typeof ICONS };

const DASBOR: Item = { href: "/", label: "Dasbor", icon: "dasbor" };
const PETA: Item = { href: "/peta", label: "Peta kegiatan", icon: "peta" };
const BERSAMA: Item[] = [
  { href: "/berkas", label: "Berkas", icon: "berkas" },
  { href: "/gelang", label: "Gelang", icon: "gelang" },
  { href: "/evaluasi", label: "Evaluasi", icon: "evaluasi" },
  { href: "/risiko", label: "Risiko & mitigasi", icon: "risiko" },
  { href: "/pedoman", label: "Pedoman & SOP", icon: "pedoman" },
];

const ITEMS: Record<Role, Item[]> = {
  administrator: [
    DASBOR,
    PETA,
    ...BERSAMA,
    { href: "/admin/akun", label: "Akun", icon: "akun" },
    { href: "/admin/wilayah", label: "UPT & Kanwil", icon: "wilayah" },
    { href: "/admin/gelang", label: "Penerima gelang", icon: "gelang" },
    { href: "/admin/data-induk", label: "Data induk", icon: "induk" },
    { href: "/admin/audit", label: "Jejak audit", icon: "audit" },
  ],
  operator: [
    DASBOR,
    PETA,
    { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" },
    { href: "/tindak-lanjut", label: "Tindak lanjut", icon: "tindak" },
    ...BERSAMA,
  ],
  kepala_pengamanan: [
    DASBOR,
    PETA,
    { href: "/keputusan", label: "Keputusan", icon: "keputusan" },
    { href: "/tindak-lanjut", label: "Tindak lanjut", icon: "tindak" },
    ...BERSAMA,
  ],
  pemantau_kanwil: [DASBOR, PETA, ...BERSAMA],
  pemantau_pusat: [DASBOR, PETA, ...BERSAMA],
  pengawal: [
    { href: "/lapangan", label: "Tugas lapangan", icon: "kegiatan" },
    { href: "/berkas", label: "Berkas", icon: "berkas" },
    { href: "/gelang", label: "Gelang", icon: "gelang" },
    { href: "/pedoman", label: "Pedoman & SOP", icon: "pedoman" },
  ],
};

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0" aria-label="Menu utama">
      {ITEMS[role].map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/sesi") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-[background-color,color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
              active
                ? "bg-gradient-to-r from-primary/15 to-primary/5 font-medium text-primary shadow-[inset_0_0_0_1px_hsl(224_86%_55%/0.2)]"
                : "text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"
            )}
          >
            {active && <span className="absolute inset-y-2.5 left-0 hidden w-[3px] rounded-full bg-primary md:block" aria-hidden />}
            <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-500 group-hover:translate-x-0.5", active && "text-primary")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
