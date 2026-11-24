import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AngkaHitung } from "@/components/ui/angka-hitung";

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
  catatan,
  className,
}: {
  icon: LucideIcon;
  nilai: React.ReactNode;
  label: string;
  nada?: NadaKartu;
  catatan?: React.ReactNode;
  className?: string;
}) {
  const t = TONE[nada];
  return (
    <div className={cn("kaca lift group relative overflow-hidden rounded-xl p-4 md:p-5", className)}>
      <span className={cn("pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-gradient-to-b to-transparent", t.garis)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[2.1rem] font-bold leading-none tracking-tight text-ink tabular-nums">
          {typeof nilai === "number" ? <AngkaHitung nilai={nilai} /> : nilai}
        </p>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-transform duration-500 group-hover:-translate-y-0.5", t.ikon)}>
          <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-[0.82rem] leading-snug text-muted-foreground">{label}</p>
      {catatan ? <div className="mt-1.5 text-xs">{catatan}</div> : null}
    </div>
  );
}
