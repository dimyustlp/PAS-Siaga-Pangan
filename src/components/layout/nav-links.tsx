"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Gavel, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/rbac";

const ICONS = { dasbor: LayoutDashboard, kegiatan: ClipboardList, keputusan: Gavel };

const ITEMS: Record<Role, { href: string; label: string; icon: keyof typeof ICONS }[]> = {
  administrator: [{ href: "/", label: "Dasbor", icon: "dasbor" }],
  operator: [
    { href: "/", label: "Dasbor", icon: "dasbor" },
    { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" },
  ],
  kepala_pengamanan: [
    { href: "/", label: "Dasbor", icon: "dasbor" },
    { href: "/keputusan", label: "Keputusan", icon: "keputusan" },
  ],
  pengawal: [],
};

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS[role].map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
