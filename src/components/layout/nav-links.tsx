"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  Database,
  Gavel,
  LayoutDashboard,
  ListChecks,
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
};

type Item = { href: string; label: string; icon: keyof typeof ICONS };

const DASBOR: Item = { href: "/", label: "Dasbor", icon: "dasbor" };
const BERSAMA: Item[] = [
  { href: "/evaluasi", label: "Evaluasi", icon: "evaluasi" },
  { href: "/risiko", label: "Risiko & mitigasi", icon: "risiko" },
  { href: "/pedoman", label: "Pedoman & SOP", icon: "pedoman" },
];

const ITEMS: Record<Role, Item[]> = {
  administrator: [
    DASBOR,
    ...BERSAMA,
    { href: "/admin/akun", label: "Akun", icon: "akun" },
    { href: "/admin/wilayah", label: "UPT & Kanwil", icon: "wilayah" },
    { href: "/admin/data-induk", label: "Data induk", icon: "induk" },
    { href: "/admin/audit", label: "Jejak audit", icon: "audit" },
  ],
  operator: [
    DASBOR,
    { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" },
    { href: "/tindak-lanjut", label: "Tindak lanjut", icon: "tindak" },
    ...BERSAMA,
  ],
  kepala_pengamanan: [
    DASBOR,
    { href: "/keputusan", label: "Keputusan", icon: "keputusan" },
    { href: "/tindak-lanjut", label: "Tindak lanjut", icon: "tindak" },
    ...BERSAMA,
  ],
  pemantau_kanwil: [DASBOR, ...BERSAMA],
  pemantau_pusat: [DASBOR, ...BERSAMA],
  pengawal: [
    { href: "/lapangan", label: "Tugas lapangan", icon: "kegiatan" },
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
              "group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-white/14 text-white shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.08)]"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-[hsl(173_70%_55%)] md:block" aria-hidden />}
            <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active && "text-[hsl(173_70%_65%)]")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
