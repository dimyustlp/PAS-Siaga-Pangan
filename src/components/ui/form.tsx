import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
  waspada: "border-status-kuning/50 bg-status-kuning/10 text-foreground",
  bahaya: "border-destructive/40 bg-destructive/10 text-destructive",
  sukses: "border-status-hijau/40 bg-status-hijau/10 text-foreground",
} as const;

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof TONE; children: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "bahaya" ? "alert" : "status"} className={cn("rounded-md border px-3 py-2 text-sm", TONE[tone], className)}>
      {children}
    </div>
  );
}

const PILL = {
  netral: "bg-secondary text-secondary-foreground",
  biru: "bg-primary/10 text-primary",
  hijau: "bg-status-hijau/12 text-status-hijau",
  kuning: "bg-status-kuning/15 text-[hsl(38_90%_28%)]",
  merah: "bg-status-merah/12 text-status-merah",
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
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
