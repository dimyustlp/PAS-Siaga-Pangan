import { cn } from "@/lib/utils";

export type SecurityStatus = "HIJAU" | "KUNING" | "MERAH" | "KRITIS";

const STYLE: Record<SecurityStatus, string> = {
  HIJAU: "bg-status-hijau/12 text-status-hijau border-status-hijau/30",
  KUNING: "bg-status-kuning/12 text-[hsl(34_92%_30%)] border-status-kuning/35",
  MERAH: "bg-status-merah/12 text-status-merah border-status-merah/30",
  KRITIS: "bg-status-kritis/20 text-[hsl(322_80%_34%)] border-status-kritis/50",
};

const DOT: Record<SecurityStatus, string> = {
  HIJAU: "bg-status-hijau",
  KUNING: "bg-status-kuning",
  MERAH: "bg-status-merah",
  KRITIS: "bg-status-kritis",
};

export function StatusBadge({ status, className }: { status: SecurityStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        STYLE[status],
        className
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", DOT[status], (status === "MERAH" || status === "KRITIS") && "titik-hidup")} aria-hidden />
      {status}
    </span>
  );
}
