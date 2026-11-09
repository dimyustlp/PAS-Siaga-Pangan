import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE = {
  biru: { ikon: "text-primary bg-primary/10 ring-primary/20", garis: "from-primary/70" },
  teal: { ikon: "text-[hsl(188_80%_30%)] bg-[hsl(188_80%_45%/0.12)] ring-[hsl(188_80%_40%/0.28)]", garis: "from-[hsl(188_80%_42%)]" },
  hijau: { ikon: "text-status-hijau bg-status-hijau/12 ring-status-hijau/25", garis: "from-status-hijau/80" },
  kuning: { ikon: "text-[hsl(34_92%_30%)] bg-status-kuning/12 ring-status-kuning/25", garis: "from-status-kuning/80" },
  merah: { ikon: "text-status-merah bg-status-merah/12 ring-status-merah/25", garis: "from-status-merah/80" },
  kritis: { ikon: "text-status-kritis bg-status-kritis/12 ring-status-kritis/25", garis: "from-status-kritis/80" },
} as const;

export type NadaKartu = keyof typeof TONE;

/** Kartu angka ringkas: angka besar berhuruf mono, ikon bercincin, garis warna tipis di atas. */
export function StatCard({
  icon: Icon,
  nilai,
  label,
  nada = "biru",
  className,
}: {
  icon: LucideIcon;
  nilai: React.ReactNode;
  label: string;
  nada?: NadaKartu;
  className?: string;
}) {
  const t = TONE[nada];
  return (
    <div className={cn("kaca lift group relative overflow-hidden rounded-2xl p-4 md:p-5", className)}>
      <span className={cn("pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r to-transparent", t.garis)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-3xl font-medium leading-none tracking-tight tabular-nums">{nilai}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-transform duration-500 group-hover:scale-110", t.ikon)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-xs leading-snug text-muted-foreground">{label}</p>
    </div>
  );
}
