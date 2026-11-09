import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE = {
  biru: { ikon: "bg-primary/10 text-primary", garis: "before:bg-primary" },
  teal: { ikon: "bg-brand-soft text-brand", garis: "before:bg-brand" },
  hijau: { ikon: "bg-status-hijau/12 text-status-hijau", garis: "before:bg-status-hijau" },
  kuning: { ikon: "bg-status-kuning/15 text-[hsl(38_90%_30%)]", garis: "before:bg-status-kuning" },
  merah: { ikon: "bg-status-merah/12 text-status-merah", garis: "before:bg-status-merah" },
  kritis: { ikon: "bg-status-kritis/12 text-status-kritis", garis: "before:bg-status-kritis" },
} as const;

export type NadaKartu = keyof typeof TONE;

/** Kartu angka ringkas: ikon berwarna, angka besar, keterangan. */
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
    <div
      className={cn(
        "lift relative flex items-center gap-4 overflow-hidden rounded-xl border border-border/70 bg-card p-4 shadow-soft before:absolute before:inset-y-0 before:left-0 before:w-1",
        t.garis,
        className
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", t.ikon)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{nilai}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
