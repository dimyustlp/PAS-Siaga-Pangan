import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { DokumenUpload, NominatifEditor } from "@/components/shared/operator-widgets";
import { FormSesiUbah } from "@/components/shared/forms-operator";
import { DaftarTindakLanjut, KepalaSesi } from "@/components/shared/session-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { resubmitSession, setReadinessItem } from "@/lib/actions/sessions";
import { getSessionFull } from "@/lib/data/session-full";
import { createClient } from "@/lib/supabase/server";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";

export const metadata = { title: "Persiapan sesi" };
export const dynamic = "force-dynamic";

export default async function PersiapanSesiPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const data = await getSessionFull(sessionId);
  if (!data) notFound();
  const { sesi } = data;

  const supabase = await createClient();
  const [pengawal, wb] = await Promise.all([
    supabase.from("profiles").select("id,full_name,nip").eq("role", "pengawal").eq("is_active", true).order("full_name"),
    supabase.from("master_inmates").select("id,nama,nomor_registrasi").eq("aktif", true).order("nama").limit(2000),
  ]);

  const editable = ["Menunggu", "Perbaiki Dulu", "Ditunda"].includes(sesi.status_kesiapan) && !sesi.ditutup_at;
  const peta = new Map(data.kesiapan.map((k) => [k.kode, k]));
  const catatanKepala = data.keputusan.find((d) => ["Perbaiki Dulu", "Ditunda"].includes(d.jenis_keputusan));
  const jumlahNominatif = data.nominatif?.length ?? 0;

  const kurang: string[] = [];
  if (!sesi.dokumen_surat_perintah) kurang.push("surat perintah belum diunggah");
  if (!sesi.dokumen_rencana_pengamanan) kurang.push("rencana pengamanan belum diunggah");
  if (jumlahNominatif === 0) kurang.push("daftar nominatif masih kosong");
  INDIKATOR_KESIAPAN.filter((i) => i.kode !== "f" || sesi.pakai_gelang_monitor).forEach((i) => {
    if (!peta.get(i.kode)?.terpenuhi) kurang.push(`indikator ${i.kode.toUpperCase()} (${i.judul}) belum dicentang`);
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Persiapan sesi"
        description="Lengkapi semuanya sebelum Kepala Pengamanan memutuskan kesiapan."
        actions={<Button asChild size="sm" variant="outline"><Link href={`/sesi/${sessionId}`}>Lihat detail sesi</Link></Button>}
      />

      <KepalaSesi data={data} />

      {sesi.status_kesiapan === "Menunggu" && (
        <Alert tone={kurang.length ? "waspada" : "sukses"}>
          {kurang.length ? (
            <>
              <p className="font-medium">Kepala Pengamanan belum bisa memberi izin mulai karena:</p>
              <ul className="mt-1 list-disc pl-5">{kurang.map((k) => <li key={k}>{k}</li>)}</ul>
            </>
          ) : (
            "Semua syarat terpenuhi. Sesi menunggu keputusan Kepala Pengamanan."
          )}
        </Alert>
      )}
      {(sesi.status_kesiapan === "Perbaiki Dulu" || sesi.status_kesiapan === "Ditunda") && (
        <Alert tone="bahaya">
          <p className="font-medium">Status {sesi.status_kesiapan}.</p>
          {catatanKepala?.catatan_keputusan && <p className="mt-1">Catatan Kepala Pengamanan: {catatanKepala.catatan_keputusan}</p>}
          <div className="mt-3">
            <ActionButton action={resubmitSession} input={sessionId} label="Ajukan ulang setelah diperbaiki" variant="default" confirm="Ajukan ulang sesi ini ke Kepala Pengamanan?" />
          </div>
        </Alert>
      )}
      {sesi.status_kesiapan === "Dapat Dimulai" && <Alert tone="sukses">Sesi sudah disetujui dan tidak bisa diubah lagi. Pelaksanaan dicatat Pengawal di lapangan.</Alert>}

      <Card>
        <CardHeader><CardTitle>Enam indikator kesiapan</CardTitle><CardDescription>Centang setelah Anda memeriksa sendiri kondisinya; tambahkan catatan bila perlu.</CardDescription></CardHeader>
        <CardContent className="divide-y">
          {INDIKATOR_KESIAPAN.map((i) => {
            const k = peta.get(i.kode);
            const berlaku = i.kode !== "f" || sesi.pakai_gelang_monitor;
            return (
              <div key={i.kode} className="py-3 first:pt-0 last:pb-0">
                <p className="flex items-center gap-2 font-medium">{i.kode.toUpperCase()}. {i.judul}{!berlaku && <Pill>Tidak berlaku (tanpa gelang)</Pill>}</p>
                <p className="mb-2 text-sm text-muted-foreground">{i.uraian}</p>
                {berlaku && (
                  <ActionForm
                    action={setReadinessItem}
                    submit="Simpan"
                    resetOnSuccess={false}
                    disabled={!editable}
                    className="flex flex-wrap items-center gap-3 space-y-0"
                    fields={{ session_id: { v: sessionId }, kode: { v: i.kode }, terpenuhi: { b: "terpenuhi" }, catatan: { s: "catatan" } }}
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="terpenuhi" defaultChecked={k?.terpenuhi} disabled={!editable} className="h-4 w-4" />
                      Terpenuhi
                    </label>
                    <Input name="catatan" defaultValue={k?.catatan ?? ""} placeholder="Catatan (opsional)" disabled={!editable} className="min-w-48 flex-1" aria-label={`Catatan indikator ${i.kode}`} />
                  </ActionForm>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dokumen</CardTitle><CardDescription>Wajib ada sebelum izin mulai diberikan.</CardDescription></CardHeader>
          <CardContent>
            <DokumenUpload sessionId={sessionId} suratAda={!!sesi.dokumen_surat_perintah} rencanaAda={!!sesi.dokumen_rencana_pengamanan} editable={editable} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daftar nominatif WB</CardTitle><CardDescription>Jumlah WB pada rencana mengikuti daftar ini ({sesi.jumlah_narapidana} saat ini).</CardDescription></CardHeader>
          <CardContent>
            <NominatifEditor sessionId={sessionId} semua={wb.data ?? []} terpilih={(data.nominatif ?? []).map((n) => n.inmate_id)} editable={editable} />
          </CardContent>
        </Card>
      </div>

      {editable && (
        <Card>
          <CardHeader><CardTitle>Ubah isian sesi</CardTitle><CardDescription>Tanggal, pengawal, interval, alat, dan petugas pendukung.</CardDescription></CardHeader>
          <CardContent><FormSesiUbah sesi={sesi} pengawal={pengawal.data ?? []} /></CardContent>
        </Card>
      )}

      <DaftarTindakLanjut data={data} now={new Date()} />
    </div>
  );
}
