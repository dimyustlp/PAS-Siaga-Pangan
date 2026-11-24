import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader, Pill } from "@/components/ui/form";
import { PANDUAN, type Panduan } from "@/lib/domain/panduan";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rbac";

export const metadata = { title: "Panduan peran" };
export const dynamic = "force-dynamic";

function Isi({ p }: { p: Panduan }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tugas utama</h3>
        <ul className="mt-2 space-y-1.5">
          {p.tugas.map((t) => (
            <li key={t} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-hijau" aria-hidden />{t}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cara menggunakan</h3>
        <div className="mt-2 space-y-2">
          {p.langkah.map((l, i) => (
            <details key={l.judul} className="rounded-lg border border-border/70 p-3 text-sm">
              <summary className="cursor-pointer font-medium">{i + 1}. {l.judul}</summary>
              <div className="mt-2 space-y-1">
                <p className="text-muted-foreground">{l.isi}</p>
                {l.menu && <Link href={l.menu.href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Buka {l.menu.label}<ArrowRight className="h-3 w-3" aria-hidden /></Link>}
              </div>
            </details>
          ))}
        </div>
      </div>
      {p.catatan && (
        <ul className="space-y-1 rounded-xl bg-secondary/60 p-3 text-sm">
          {p.catatan.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
    </div>
  );
}

export default async function PanduanPage() {
  const user = await requireUser();
  const saya = PANDUAN.find((p) => p.role === user.role);
  const lain = PANDUAN.filter((p) => p.role !== user.role && ["operator", "kepala_pengamanan", "ka_upt", "pengawal"].includes(p.role));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Panduan peran" description="Tugas yang dikerjakan tiap peran dan cara memakai fitur-fiturnya. Panduan peran Anda ada di paling atas. Klik tiap langkah untuk melihat rinciannya." />
      {saya && (
        <section className="kaca space-y-4 rounded-2xl border-l-4 border-l-gold p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">{ROLE_LABEL[saya.role]}</h2>
            <Pill tone="hijau">Peran Anda</Pill>
          </div>
          <p className="text-sm text-muted-foreground">{saya.ringkas}</p>
          <Isi p={saya} />
        </section>
      )}
      <section className="space-y-3" aria-label="Peran lain di UPT">
        <h2 className="text-lg font-semibold tracking-tight">Peran lain di UPT</h2>
        <p className="text-sm text-muted-foreground">Berguna untuk tahu siapa mengerjakan apa dan ke mana pekerjaan Anda diteruskan.</p>
        {lain.map((p) => (
          <details key={p.role} className="rounded-2xl border border-border/70 bg-card shadow-soft">
            <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
              <span className="font-semibold">{ROLE_LABEL[p.role]}</span>
              <span className="block text-sm text-muted-foreground">{p.ringkas}</span>
            </summary>
            <div className="border-t p-4"><Isi p={p} /></div>
          </details>
        ))}
      </section>
    </div>
  );
}
