/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Check, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/server";
import { TAHAP, judulButir } from "@/lib/domain/tahap";
import { waktuLengkap } from "@/lib/domain/laporan-format";
import { cn } from "@/lib/utils";

/** Kemajuan 4 tahap pengawalan beserta foto dan berkas, untuk halaman detail sesi. */
export async function PanelTahap({ sessionId }: { sessionId: string }) {
  const supabase = await createClient();
  const [t, l, s] = await Promise.all([
    supabase.from("tahap_pengawalan").select("tahap,jumlah_wb,jumlah_alat,waktu_sistem").eq("session_id", sessionId).order("tahap"),
    supabase.from("lampiran_tahap").select("id,tahap,butir,jenis,nama_berkas,waktu_sistem").eq("session_id", sessionId).order("waktu_sistem"),
    supabase.from("daily_sessions").select("disahkan_at").eq("id", sessionId).maybeSingle(),
  ]);
  const selesai = new Map((t.data ?? []).map((x) => [x.tahap, x]));
  const lamp = l.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Tahap pengawalan dan dokumentasi</CardTitle>
          <CardDescription>Diisi Pengawal dari P2U sampai kembali ke UPT. Waktu dicatat otomatis oleh sistem.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {s.data?.disahkan_at ? <Pill tone="hijau">Berkas disahkan</Pill> : selesai.size === 4 ? <Pill tone="kuning">Menunggu pengesahan</Pill> : <Pill tone="biru">{selesai.size}/4 tahap</Pill>}
          <Link href={`/sesi/${sessionId}/laporan`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><FileText className="h-4 w-4" aria-hidden />Laporan resmi</Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="grid gap-2 sm:grid-cols-4">
          {TAHAP.map((d) => {
            const x = selesai.get(d.no);
            return (
              <li key={d.no} className={cn("rounded-xl border p-3 text-sm", x ? "border-status-hijau/40 bg-status-hijau/[0.06]" : "border-border bg-white/70")}>
                <p className="flex items-center gap-2 font-semibold">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", x ? "bg-status-hijau text-white" : "bg-ink/10")}>{x ? <Check className="h-3.5 w-3.5" aria-hidden /> : d.no}</span>
                  {d.judul}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{x ? `${waktuLengkap(x.waktu_sistem)} · ${x.jumlah_wb} WB` : "Belum"}</p>
                <p className="text-xs text-muted-foreground">{lamp.filter((a) => a.tahap === d.no).length} lampiran</p>
              </li>
            );
          })}
        </ol>
        {lamp.some((a) => a.jenis === "foto") && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {lamp.filter((a) => a.jenis === "foto").map((a) => (
              <a key={a.id} href={`/lampiran/${a.id}`} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border bg-white" title={`${judulButir(a.butir)} · ${waktuLengkap(a.waktu_sistem)}`}>
                <img src={`/lampiran/${a.id}`} alt={judulButir(a.butir)} loading="lazy" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 text-[9px] text-white">Tahap {a.tahap}</span>
              </a>
            ))}
          </div>
        )}
        {lamp.some((a) => a.jenis === "berkas") && (
          <ul className="space-y-1 text-sm">
            {lamp.filter((a) => a.jenis === "berkas").map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-brand" aria-hidden />
                <a href={`/lampiran/${a.id}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{a.nama_berkas}</a>
                <span className="text-xs text-muted-foreground">Tahap {a.tahap} · {judulButir(a.butir)} · {waktuLengkap(a.waktu_sistem)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
