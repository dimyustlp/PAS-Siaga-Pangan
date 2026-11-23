"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderOpen, ListChecks, Newspaper, Radio, Route } from "lucide-react";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "/lapangan", label: "Tugas saya", icon: ListChecks, tepat: true },
  { href: "/lapangan/alur", label: "Alur kerja", icon: Route },
  { href: "/pedoman", label: "Pedoman", icon: BookOpen },
  { href: "/berkas", label: "Berkas", icon: FolderOpen },
  { href: "/gelang", label: "Gelang", icon: Radio },
  { href: "/berita", label: "Berita", icon: Newspaper },
];

/** Menu atas untuk Pengawal: menyesuaikan lebar layar, bisa digeser di HP. */
export function NavLapangan() {
  const path = usePathname();
  return (
    <nav aria-label="Menu Pengawal" className="border-b border-border/60 bg-white/80 backdrop-blur">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1.5 sm:px-4">
        {MENU.map(({ href, label, icon: Ikon, tepat }) => {
          const on = tepat ? path === href || (path.startsWith("/lapangan/") && !path.startsWith("/lapangan/alur")) : path === href || path.startsWith(href + "/");
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Ikon className="h-4 w-4" aria-hidden />{label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
