import { cn } from "@/lib/utils";

export type SecurityStatus = "HIJAU" | "KUNING" | "MERAH" | "KRITIS";

const STYLE: Record<SecurityStatus, string> = {
  HIJAU: "bg-status-hijau/12 text-status-hijau border-status-hijau/30",
  KUNING: "bg-status-kuning/15 text-[hsl(38_90%_28%)] border-status-kuning/40",
  MERAH: "bg-status-merah/12 text-status-merah border-status-merah/30",
  KRITIS: "bg-status-kritis text-white border-status-kritis",
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
      {status}
    </span>
  );
}
