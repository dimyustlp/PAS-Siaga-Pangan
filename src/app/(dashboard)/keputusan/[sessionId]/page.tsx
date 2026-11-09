import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm } from "@/components/shared/action-form";
import { AksiTindakLanjut, FormTindakLanjutBaru } from "@/components/shared/followup-forms";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import {
  DaftarKeputusan,
  KepalaSesi,
  LiniMasa,
  PanelKesiapan,
  PanelRekonsiliasi,
  RiwayatStatusPanel,
} from "@/components/shared/session-panels";
import { UploadField } from "@/components/shared/upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { closeSession, decideReadiness, lowerSecurityStatus, recordDirective, verifyIncident } from "@/lib/actions/decisions";
import { perhatianSesi } from "@/lib/domain/attention";
import { STATUS_RANK } from "@/lib/domain/status";
import { getSessionFull } from "@/lib/data/session-full";
import { createClient } from "@/lib/supabase/server";
import { fmtWaktu } from "@/lib/format";

export const metadata = { title: "Keputusan sesi" };
export const dynamic = "force-dynamic";

export default async function KeputusanSesiPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const data = await getSessionFull(sessionId);
  if (!data) notFound();
  const { sesi, ringkas } = data;
  const now = new Date();
  const supabase = await createClient();
  const { data: pelaksana } = await supabase.from("profiles").select("id,full_name,role").in("role", ["operator", "pengawal"]).eq("is_active", true).order("full_name");

  const ditutup = !!sesi.ditutup_at;
  const menunggu = sesi.status_kesiapan === "Menunggu" && !ditutup;
  const berjalan = sesi.status_kesiapan === "Dapat Dimulai" && !ditutup;
  const status = sesi.status_keamanan;
  const targetTurun = (["HIJAU", "KUNING", "MERAH"] as const).filter((s) => STATUS_RANK[s] < STATUS_RANK[status]);
  const gangguanTerbuka = data.gangguan.filter((g) => !g.status_penyelesaian);
  const peringatan = perhatianSesi(ringkas, now);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Keputusan sesi"
        actions={<><RealtimeRefresh /><Button asChild size="sm" variant="outline"><Link href={`/sesi/${sessionId}`}>Detail & laporan</Link></Button></>}
      />
      {peringatan.map((p) => <Alert key={p.teks} tone={p.tingkat === "kritis" ? "bahaya" : "waspada"}>{p.teks}</Alert>)}
      <KepalaSesi data={data} />
      {ditutup && <Alert tone="info">Sesi sudah ditutup pada {fmtWaktu(sesi.ditutup_at)}. Tidak ada keputusan lagi yang bisa dibuat.</Alert>}

      {menunggu && (
        <>
          <PanelKesiapan data={data} />
          <Card>
            <CardHeader><CardTitle>Keputusan kesiapan</CardTitle><CardDescription>“Dapat Dimulai” ditolak otomatis bila dokumen, nominatif, atau indikator belum lengkap.</CardDescription></CardHeader>
            <CardContent>
              <ActionForm action={decideReadiness} submit="Putuskan" fields={{ session_id: { v: sessionId }, keputusan: { s: "keputusan" }, catatan: { s: "catatan" } }}>
                <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
                  <Field label="Keputusan" htmlFor="kp"><Select id="kp" name="keputusan" required defaultValue=""><option value="" disabled>Pilih</option><option>Dapat Dimulai</option><option>Perbaiki Dulu</option><option>Ditunda</option></Select></Field>
                  <Field label="Catatan" htmlFor="kp-cat" hint="Wajib diisi untuk Perbaiki Dulu atau Ditunda."><Input id="kp-cat" name="catatan" /></Field>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </>
      )}

      {berjalan && (
        <>
          <Card>
            <CardHeader><CardTitle>Gangguan</CardTitle><CardDescription>Setiap gangguan harus diverifikasi sebelum status bisa dipulihkan ke HIJAU.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {data.gangguan.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada gangguan tercatat.</p>}
              {data.gangguan.map((g) => (
                <div key={g.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm"><Pill tone={g.status_penyelesaian ? "hijau" : "merah"}>{g.status_penyelesaian ? "Terverifikasi" : "Belum terverifikasi"}</Pill><span className="font-medium">{g.kategori_gangguan}</span></p>
                  {g.tindakan_awal && <p className="text-xs text-muted-foreground">{g.tindakan_awal}</p>}
                  {!g.status_penyelesaian && (
                    <ActionForm action={verifyIncident} submit="Verifikasi pemulihan" fields={{ session_id: { v: sessionId }, incident_id: { v: g.id }, catatan: { s: "catatan" } }} className="flex flex-wrap items-end gap-2 space-y-0">
                      <Field label="Catatan verifikasi" htmlFor={`g-${g.id}`} className="min-w-64 flex-1"><Input id={`g-${g.id}`} name="catatan" required placeholder="Mis. situasi kondusif, WB lengkap" /></Field>
                    </ActionForm>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {status !== "HIJAU" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Turunkan status keamanan</CardTitle><CardDescription>Bertahap atau langsung ke HIJAU. Wajib ada alasan dan foto bukti pemulihan keadaan.</CardDescription></CardHeader>
                <CardContent>
                  <ActionForm action={lowerSecurityStatus} submit="Turunkan status" confirm="Turunkan status keamanan sesi ini?" fields={{ session_id: { v: sessionId }, status_baru: { s: "status_baru" }, catatan: { s: "catatan" }, bukti_path: { s: "bukti" } }}>
                    <Field label="Status baru" htmlFor="turun"><Select id="turun" name="status_baru" defaultValue={targetTurun[0]}>{targetTurun.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                    <Field label="Alasan" htmlFor="turun-alasan"><Textarea id="turun-alasan" name="catatan" rows={2} required /></Field>
                    <Field label="Foto bukti pemulihan" hint="Wajib. JPG, PNG, atau WebP, maksimal 10 MB."><UploadField bucket="pas-siaga-evidence" sessionId={sessionId} name="bukti" accept="image/jpeg,image/png,image/webp" /></Field>
                    {gangguanTerbuka.length > 0 && <Alert tone="waspada">Turun ke HIJAU baru bisa setelah {gangguanTerbuka.length} gangguan di atas diverifikasi.</Alert>}
                  </ActionForm>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Arahan tindakan</CardTitle><CardDescription>Catat arahan Anda selama status KUNING, MERAH, atau KRITIS agar terdokumentasi.</CardDescription></CardHeader>
                <CardContent>
                  <ActionForm action={recordDirective} submit="Catat arahan" fields={{ session_id: { v: sessionId }, catatan: { s: "catatan" } }}>
                    <Field label="Isi arahan" htmlFor="arahan"><Textarea id="arahan" name="catatan" rows={3} required placeholder="Mis. tambah satu pengawal di pos 2, hentikan kegiatan di kolom B" /></Field>
                  </ActionForm>
                </CardContent>
              </Card>
            </div>
          )}

          <PanelRekonsiliasi rek={data.rekonsiliasi} />
          <Card>
            <CardHeader><CardTitle>Tutup kegiatan</CardTitle><CardDescription>Ditolak otomatis bila rekonsiliasi belum cocok.</CardDescription></CardHeader>
            <CardContent>
              <ActionForm action={closeSession} submit="Tutup kegiatan" variant="destructive" confirm="Tutup kegiatan ini? Setelah ditutup, sesi tidak bisa dibuka lagi." fields={{ session_id: { v: sessionId } }} disabled={!data.rekonsiliasi?.siapTutup}>
                {!data.rekonsiliasi?.siapTutup && <p className="text-sm text-muted-foreground">Tombol aktif setelah semua syarat rekonsiliasi di atas terpenuhi.</p>}
              </ActionForm>
            </CardContent>
          </Card>
        </>
      )}

      {!ditutup && sesi.status_kesiapan !== "Menunggu" && (
        <Card>
          <CardHeader><CardTitle>Tindak lanjut</CardTitle><CardDescription>Tugaskan dengan penanggung jawab dan tenggat; verifikasi setelah pelaksana menyatakan selesai.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            {data.tindakLanjut.map((f) => (
              <div key={f.id} className="space-y-2 border-b pb-4 last:border-0">
                <p className="text-sm"><Pill tone={f.status === "Terbuka" ? "kuning" : f.status === "Dikerjakan" ? "biru" : "hijau"}>{f.status}</Pill> <span className="font-medium">{f.uraian}</span></p>
                <p className="text-xs text-muted-foreground">PJ {f.penanggung_jawab_nama} · tenggat {fmtWaktu(f.tenggat)}{f.catatan_selesai ? ` · ${f.catatan_selesai}` : ""}</p>
                <AksiTindakLanjut f={f} peran="kepala" />
              </div>
            ))}
            <div>
              <h3 className="mb-3 font-medium">Tugaskan tindak lanjut baru</h3>
              <FormTindakLanjutBaru sessionId={sessionId} gangguan={data.gangguan} pelaksana={pelaksana ?? []} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RiwayatStatusPanel data={data} />
        <DaftarKeputusan data={data} />
      </div>
      <LiniMasa data={data} batas={40} />
    </div>
  );
}
