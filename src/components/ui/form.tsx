import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-input bg-white px-3.5 py-2 transition-[border-color,box-shadow] duration-300 text-base placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 py-2 transition-[border-color,box-shadow] duration-300 text-base placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const TONE = {
  info: "border-primary/25 bg-primary/5 text-foreground",
  waspada: "border-status-kuning/40 bg-status-kuning/15 text-[hsl(32_90%_26%)]",
  bahaya: "border-destructive/40 bg-destructive/10 text-[hsl(0_70%_38%)]",
  sukses: "border-status-hijau/40 bg-status-hijau/10 text-[hsl(152_70%_22%)]",
} as const;

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof TONE; children: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "bahaya" ? "alert" : "status"} className={cn("rounded-xl border px-3.5 py-2.5 text-sm", TONE[tone], className)}>
      {children}
    </div>
  );
}

const PILL = {
  netral: "bg-ink/[0.06] text-secondary-foreground ring-1 ring-inset ring-ink/10",
  biru: "bg-primary/12 text-[hsl(224_76%_40%)] ring-1 ring-inset ring-primary/25",
  hijau: "bg-status-hijau/12 text-status-hijau ring-1 ring-inset ring-status-hijau/25",
  kuning: "bg-status-kuning/12 text-[hsl(34_92%_30%)] ring-1 ring-inset ring-status-kuning/25",
  merah: "bg-status-merah/12 text-status-merah ring-1 ring-inset ring-status-merah/25",
} as const;

export function Pill({ tone = "netral", children, className }: { tone?: keyof typeof PILL; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PILL[tone], className)}>{children}</span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          PAS-SIAGA Pangan
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
