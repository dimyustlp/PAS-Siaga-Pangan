"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  Database,
  Gavel,
  GraduationCap,
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
  pembekalan: GraduationCap,
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
  { href: "/pembekalan", label: "Pembekalan", icon: "pembekalan" },
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
  pengawal: [],
};

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu utama">
      {ITEMS[role].map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/sesi") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
