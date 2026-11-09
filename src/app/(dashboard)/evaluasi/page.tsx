import { CalendarRange, CheckCheck, Download, History, Play } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ActionForm } from "@/components/shared/action-form";
import { TrenChartLazy } from "@/components/shared/tren-chart-lazy";
import type { TitikTren } from "@/components/shared/tren-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { addWeeklyNote } from "@/lib/actions/notes";
import { requireUser } from "@/lib/auth";
import { hitungEvaluasi, parseIndikator } from "@/lib/domain/evaluasi";
import { awalMinggu, fmtTanggal, fmtTanggalPendek, hariIniWib, tambahHari } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Evaluasi" };
export const dynamic = "force-dynamic";

const TGL = /^\d{4}-\d{2}-\d{2}$/;

export default async function EvaluasiPage({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string }> }) {
  const q = await searchParams;
  const sampai = q.sampai && TGL.test(q.sampai) ? q.sampai : hariIniWib();
  const dari = q.dari && TGL.test(q.dari) ? q.dari : tambahHari(sampai, -60);

  const supabase = await createClient();
  const [user, ind, tren, catatan] = await Promise.all([
    requireUser(),
    supabase.rpc("indikator_evaluasi", { p_dari: dari, p_sampai: sampai }),
    supabase.rpc("tren_mingguan", { p_dari: dari, p_sampai: sampai }),
    supabase.from("weekly_notes").select("*").order("minggu_mulai", { ascending: false }).limit(20),
  ]);
  const indikator = parseIndikator(ind.data);
  const baris = indikator ? hitungEvaluasi(indikator) : [];
  const titik: TitikTren[] = Array.isArray(tren.data)
    ? (tren.data as { minggu: string; sesi: number; ditutup: number; merah_kritis: number; gangguan: number }[]).map((t) => ({ ...t, minggu: fmtTanggalPendek(t.minggu) }))
    : [];
  const bisaCatat = ["administrator", "operator", "kepala_pengamanan"].includes(user.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Evaluasi uji coba"
        description="Capaian indikator keberhasilan dari rencana proyek, dihitung langsung dari catatan sistem pada cakupan Anda."
        actions={<Button asChild size="sm" variant="outline"><a href={`/evaluasi/ekspor?dari=${dari}&sampai=${sampai}`}><Download className="h-4 w-4" aria-hidden />Unduh CSV</a></Button>}
      />

      <form className="flex flex-wrap items-end gap-3" aria-label="Periode evaluasi">
        <Field label="Dari" htmlFor="dari"><Input id="dari" name="dari" type="date" defaultValue={dari} /></Field>
        <Field label="Sampai" htmlFor="sampai"><Input id="sampai" name="sampai" type="date" defaultValue={sampai} /></Field>
        <Button type="submit" variant="outline">Terapkan</Button>
      </form>

      {!indikator ? (
        <Alert tone="bahaya">Indikator belum bisa dihitung. Muat ulang halaman, atau hubungi Administrator bila berulang.</Alert>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Ringkasan">
            <StatCard icon={CalendarRange} nada="biru" nilai={indikator.total_sesi} label="sesi pada periode" />
            <StatCard icon={Play} nada="teal" nilai={indikator.sesi_dijalankan} label="sesi dijalankan" />
            <StatCard icon={CheckCheck} nada="hijau" nilai={indikator.sesi_ditutup} label="sesi ditutup" />
            <StatCard icon={History} nada="kuning" nilai={`${indikator.entri_susulan}/${indikator.entri_total}`} label="entri susulan dari total" />
          </section>

          <Card>
            <CardHeader><CardTitle>Capaian indikator</CardTitle><CardDescription>“Belum dinilai” berarti belum ada data untuk diukur, bukan berarti lulus.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="py-2 pr-3">Indikator</th><th className="py-2 pr-3">Capaian</th><th className="py-2 pr-3">Target</th><th className="py-2">Hasil</th></tr>
                </thead>
                <tbody className="divide-y">
                  {baris.map((b) => (
                    <tr key={b.kode} className="align-top">
                      <td className="py-2.5 pr-3"><span className="font-medium">{b.kode}. {b.nama}</span><span className="block text-xs text-muted-foreground">{b.rujukan}</span></td>
                      <td className="py-2.5 pr-3 tabular-nums">{b.tampil}</td>
                      <td className="py-2.5 pr-3">{b.target}</td>
                      <td className="py-2.5"><Pill tone={b.tercapai === null ? "netral" : b.tercapai ? "hijau" : "merah"}>{b.tercapai === null ? "Belum dinilai" : b.tercapai ? "Tercapai" : "Belum tercapai"}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sebaran status kegiatan berjalan</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {(["HIJAU", "KUNING", "MERAH", "KRITIS"] as const).map((s) => (
                <div key={s} className="flex items-center gap-2"><StatusBadge status={s} /><span className="text-xl font-semibold tabular-nums">{indikator.status[s]}</span></div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Tren mingguan</CardTitle><CardDescription>Jumlah sesi, sesi ditutup, sesi berstatus merah atau kritis, dan gangguan per minggu.</CardDescription></CardHeader>
        <CardContent>
          {titik.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data pada periode ini.</p> : (
            <>
              <TrenChartLazy data={titik} />
              <table className="sr-only"><caption>Data tren mingguan</caption><thead><tr><th>Minggu</th><th>Sesi</th><th>Ditutup</th><th>Merah/Kritis</th><th>Gangguan</th></tr></thead>
                <tbody>{titik.map((t) => <tr key={t.minggu}><td>{t.minggu}</td><td>{t.sesi}</td><td>{t.ditutup}</td><td>{t.merah_kritis}</td><td>{t.gangguan}</td></tr>)}</tbody></table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Catatan kendala mingguan</CardTitle><CardDescription>Dasar perbaikan pedoman dan SOP pada kegiatan berikutnya.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {bisaCatat && (
            <ActionForm action={addWeeklyNote} submit="Simpan catatan" fields={{ minggu_mulai: { s: "minggu" }, kendala: { s: "kendala" }, tindak_lanjut: { s: "tl" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Minggu (hari Senin)" htmlFor="minggu"><Input id="minggu" name="minggu" type="date" required defaultValue={awalMinggu(hariIniWib())} /></Field>
                <span />
                <Field label="Kendala yang dihadapi" htmlFor="kendala"><Textarea id="kendala" name="kendala" rows={3} required /></Field>
                <Field label="Rencana perbaikan" htmlFor="tl"><Textarea id="tl" name="tl" rows={3} /></Field>
              </div>
            </ActionForm>
          )}
          {(catatan.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada catatan.</p> : (
            <ul className="space-y-3">
              {(catatan.data ?? []).map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="text-xs text-muted-foreground">Minggu {fmtTanggal(c.minggu_mulai)} · {c.kode_upt}</p>
                  <p>{c.kendala}</p>
                  {c.tindak_lanjut && <p className="text-muted-foreground">Perbaikan: {c.tindak_lanjut}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
