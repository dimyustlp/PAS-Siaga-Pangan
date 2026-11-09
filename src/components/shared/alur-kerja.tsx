import Link from "next/link";
import { ChevronDown, Route } from "lucide-react";
import { ALUR_KERJA, type PelakuAlur } from "@/lib/domain/alur";
import { ROLE_LABEL, canAccess, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const WARNA: Record<PelakuAlur, string> = {
  Administrator: "bg-secondary text-secondary-foreground",
  Operator: "bg-primary/10 text-primary",
  "Kepala Pengamanan": "bg-[hsl(234_80%_60%/0.12)] text-[hsl(234_70%_40%)]",
  Pengawal: "bg-[hsl(188_80%_42%/0.14)] text-[hsl(188_85%_26%)]",
  Sistem: "bg-ink/[0.06] text-muted-foreground",
  Pemantau: "bg-[hsl(262_60%_58%/0.12)] text-[hsl(262_55%_40%)]",
};

/** Peta alur kerja sistem. Tahap milik peran pengguna ditandai agar langsung tahu bagiannya. */
export function AlurKerja({ role }: { role: Role }) {
  const milik = ALUR_KERJA.filter((t) => t.peran.includes(role));
  const awal = milik[0];

  return (
    <details open className="kaca group rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Route className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold tracking-tight">Alur kerja PAS-SIAGA Pangan</span>
          <span className="block text-sm text-muted-foreground">
            {milik.length > 0
              ? `Anda masuk sebagai ${ROLE_LABEL[role]}. Bagian Anda: tahap ${milik.map((t) => t.no).join(", ")}.`
              : `Anda masuk sebagai ${ROLE_LABEL[role]}. Delapan tahap dari persiapan sampai evaluasi.`}
          </span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="border-t border-border/60 p-4 md:p-5">
        <ol className="grid gap-3 md:grid-cols-2">
          {ALUR_KERJA.map((t) => {
            const saya = t.peran.includes(role);
            const bisaBuka = t.tautan && canAccess(role, t.tautan.href);
            return (
              <li
                key={t.no}
                className={cn(
                  "relative rounded-xl border p-4",
                  saya ? "border-primary/40 bg-primary/[0.07]" : "border-border bg-white"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", saya ? "bg-primary text-primary-foreground" : "bg-ink/[0.06] text-secondary-foreground")}>
                    {t.no}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="font-semibold leading-tight">{t.judul}</h3>
                      {saya && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-[hsl(224_76%_40%)] ring-1 ring-primary/30">Bagian Anda</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.pelaku.map((p) => (
                        <span key={p} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", WARNA[p])}>{p}</span>
                      ))}
                    </div>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {t.isi.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                    {bisaBuka && t.tautan && (
                      <Link href={t.tautan.href} className="inline-block text-sm font-semibold text-brand hover:underline">
                        {t.tautan.label} →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {awal && <p className="mt-4 text-sm text-muted-foreground">Mulai dari tahap {awal.no}: {awal.judul.toLowerCase()}.</p>}
      </div>
    </details>
  );
}
