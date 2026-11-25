import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FasePill } from "@/components/shared/session-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { LABEL_STATUS_RENCANA, statusRencana } from "@/lib/domain/rencana";
import { fmtTanggal, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { RincianEditor } from "@/components/rencana/rincian-editor";
import { PenugasanSesi } from "@/components/rencana/penugasan-sesi";
import { FormSesiMudah } from "@/components/shared/form-kegiatan";
import { labelJenis } from "@/lib/domain/jenis-kegiatan";

export const metadata = { title: "Rincian rencana kegiatan" };
export const dynamic = "force-dynamic";

function Baris({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{k}</dt>
      <dd className="whitespace-pre-line text-sm">{v || <span className="text-muted-foreground">-</span>}</dd>
    </div>
  );
}

export default async function RincianRencanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: r }, { data: a }, { data: sesi }, { data: ov }, { data: pengawal }] = await Promise.all([
    supabase.from("v_rencana_kegiatan").select("*").eq("activity_id", id).maybeSingle(),
    supabase.from("activities").select("batas_area,rute,titik_komunikasi,akses_warga").eq("id", id).maybeSingle(),
    supabase.from("daily_sessions").select("id,tanggal_sesi,jumlah_narapidana,status_kesiapan,petugas_ids,dokumen_surat_perintah,dokumen_rencana_pengamanan").eq("activity_id", id).order("tanggal_sesi", { ascending: false }),
    supabase.from("v_session_overview").select("session_id,fase,status_keamanan").eq("activity_id", id),
    user.role === "operator" ? supabase.from("profiles").select("id,full_name,nip").eq("role", "pengawal").eq("is_active", true).order("full_name") : Promise.resolve({ data: [] as { id: string; full_name: string; nip: string | null }[] }),
  ]);
  if (!r) notFound();
  const bisaUbah = user.role === "operator" && !!user.kodeUpt && user.kodeUpt === r.kode_upt;
  const daftarPengawal = pengawal ?? [];
  const fase = new Map((ov ?? []).map((o) => [o.session_id, o]));
  const st = statusRencana(r.tanggal_mulai ?? hariIniWib(), r.rencana_berakhir, hariIniWib());

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={r.kode_kegiatan ?? "Rencana kegiatan"}
        description={`${labelJenis(r.jenis_kegiatan, r.detail_kegiatan)} · ${r.lokasi_nama ?? "-"} · ${r.upt_nama ?? r.kode_upt}`}
        actions={<Button asChild variant="outline" size="sm"><Link href="/rencana">Kembali ke daftar</Link></Button>}
      />
      {bisaUbah ? (
        <Alert>Lengkapi rincian per bagian, tambah sesi harian satu per satu, lalu tugaskan pengawalnya. Pengawal yang dipilih langsung melihat tugasnya di dasbor mereka; sesi baru bisa dimulai setelah Kepala Pengamanan menyatakan siap.</Alert>
      ) : (
        <Alert>Halaman ini hanya untuk dilihat. Rincian rencana dan penugasan diisi Operator UPT yang bersangkutan.</Alert>
      )}

      {bisaUbah && (
        <Card>
          <CardHeader><CardTitle>Isi rincian kegiatan</CardTitle></CardHeader>
          <CardContent>
            <RincianEditor awal={{ id, tanggal_mulai: r.tanggal_mulai ?? hariIniWib(), rencana_berakhir: r.rencana_berakhir ?? null, luas_lahan_ha: r.luas_lahan_ha ?? null, nomor_surat_perintah: r.nomor_surat_perintah ?? null, nomor_persetujuan: r.nomor_persetujuan ?? null, titik_komunikasi: a?.titik_komunikasi ?? null, batas_area: a?.batas_area ?? null, rute: a?.rute ?? null, akses_warga: a?.akses_warga ?? null }} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2">Rencana <Pill tone={st === "berjalan" ? "hijau" : st === "akan" ? "biru" : "netral"}>{LABEL_STATUS_RENCANA[st]}</Pill>{r.latihan && <Pill tone="kuning">Latihan</Pill>}</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y divide-border/60">
            <Baris k="UPT" v={`${r.upt_nama ?? "-"}${r.kanwil_nama ? ` · ${r.kanwil_nama}` : ""}`} />
            <Baris k="Periode" v={`${fmtTanggal(r.tanggal_mulai)}${r.rencana_berakhir ? ` s.d. ${fmtTanggal(r.rencana_berakhir)}` : ""}`} />
            <Baris k="Luas lahan atau kolam" v={r.luas_lahan_ha != null ? `${r.luas_lahan_ha} ha` : null} />
            <Baris k="Nomor surat perintah" v={r.nomor_surat_perintah} />
            <Baris k="Nomor persetujuan" v={r.nomor_persetujuan} />
            <Baris k="Titik komunikasi" v={a?.titik_komunikasi} />
            <Baris k="Batas area kegiatan" v={a?.batas_area} />
            <Baris k="Rute berangkat dan pulang" v={a?.rute} />
            <Baris k="Akses warga sekitar" v={a?.akses_warga} />
          </dl>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border/60 px-4 py-3 font-semibold">Sesi harian dan lampirannya ({sesi?.length ?? 0})</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5 font-medium">Tanggal</th><th className="px-3 py-2.5 font-medium">Kesiapan</th><th className="px-3 py-2.5 font-medium">Posisi</th><th className="px-3 py-2.5 text-right font-medium">WB</th><th className="px-3 py-2.5 font-medium">Pengawal bertugas</th><th className="px-3 py-2.5 font-medium">Lampiran</th><th className="px-3 py-2.5" /></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(sesi ?? []).length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada sesi harian untuk rencana ini.</td></tr>}
              {(sesi ?? []).map((s) => {
                const o = fase.get(s.id);
                return (
                  <tr key={s.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3">{fmtTanggal(s.tanggal_sesi)}</td>
                    <td className="px-3 py-3">{s.status_kesiapan}</td>
                    <td className="px-3 py-3">{o?.fase ? <FasePill fase={o.fase} /> : "-"}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.jumlah_narapidana}</td>
                    <td className="px-3 py-3">
                      {bisaUbah ? (
                        <PenugasanSesi sessionId={s.id} awal={s.petugas_ids ?? []} pengawal={daftarPengawal} />
                      ) : (
                        <span className="text-sm">{(s.petugas_ids ?? []).length} pengawal</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        {s.dokumen_surat_perintah ? <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={`/dokumen/${s.id}/surat_perintah`}>Surat perintah</a> : <span className="text-xs text-muted-foreground">Surat perintah belum ada</span>}
                        {s.dokumen_rencana_pengamanan ? <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={`/dokumen/${s.id}/rencana_pengamanan`}>Rencana pengamanan</a> : <span className="text-xs text-muted-foreground">Rencana pengamanan belum ada</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right"><Button asChild size="sm" variant="outline"><Link href={`/sesi/${s.id}`}>Buka sesi</Link></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {bisaUbah && (
        <Card>
          <CardHeader><CardTitle>Tambah sesi harian</CardTitle><CardDescription>Satu sesi per tanggal. Tambahkan satu per satu sesuai jadwal; pengawal bisa dipilih sekarang atau nanti lewat tabel di atas.</CardDescription></CardHeader>
          <CardContent>
            <FormSesiMudah kegiatan={[{ id, label: `${r.kode_kegiatan} · ${labelJenis(r.jenis_kegiatan, r.detail_kegiatan)} · ${r.lokasi_nama ?? "-"}`, mulai: r.tanggal_mulai ?? hariIniWib(), berakhir: r.rencana_berakhir ?? null }]} pengawal={daftarPengawal} hariIni={hariIniWib()} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
