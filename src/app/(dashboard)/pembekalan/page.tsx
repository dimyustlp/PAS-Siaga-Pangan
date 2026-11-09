import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addTraining } from "@/lib/actions/notes";
import { requireUser } from "@/lib/auth";
import { fmtTanggal, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pembekalan" };
export const dynamic = "force-dynamic";

export default async function PembekalanPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainings").select("*").order("tanggal", { ascending: false }).limit(100);
  const bisaCatat = ["administrator", "operator", "kepala_pengamanan"].includes(user.role);
  const total = (data ?? []).reduce((a, t) => a + t.jumlah_peserta, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Pembekalan petugas" description="Catatan pengarahan, sosialisasi, dan pelatihan bagi pengawal serta petugas pendukung." />
      {error && <Alert tone="bahaya">Data belum bisa dibaca. Muat ulang halaman.</Alert>}
      {bisaCatat && (
        <Card>
          <CardHeader><CardTitle>Catat pembekalan</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={addTraining} submit="Simpan" fields={{ judul: { s: "judul" }, tanggal: { s: "tanggal" }, sasaran: { s: "sasaran" }, metode: { s: "metode" }, jumlah_peserta: { n: "peserta" }, keterangan: { s: "ket" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Judul" htmlFor="judul" className="sm:col-span-2"><Input id="judul" name="judul" required placeholder="Mis. Pengarahan penghitungan WB dan eskalasi status" /></Field>
                <Field label="Tanggal" htmlFor="tanggal"><Input id="tanggal" name="tanggal" type="date" required defaultValue={hariIniWib()} /></Field>
                <Field label="Jumlah peserta" htmlFor="peserta"><Input id="peserta" name="peserta" type="number" min={0} required /></Field>
                <Field label="Sasaran peserta" htmlFor="sasaran"><Input id="sasaran" name="sasaran" placeholder="Pengawal, petugas blok, P2U" /></Field>
                <Field label="Metode" htmlFor="metode"><Input id="metode" name="metode" placeholder="Tatap muka, simulasi, daring" /></Field>
                <Field label="Keterangan" htmlFor="ket" className="sm:col-span-2"><Textarea id="ket" name="ket" rows={2} /></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Riwayat pembekalan</CardTitle><CardDescription>{(data ?? []).length} kegiatan, {total} peserta.</CardDescription></CardHeader>
        <CardContent>
          {(data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada catatan.</p> : (
            <ul className="divide-y">
              {(data ?? []).map((t) => (
                <li key={t.id} className="py-3 text-sm first:pt-0 last:pb-0">
                  <p className="font-medium">{t.judul}</p>
                  <p className="text-xs text-muted-foreground">{fmtTanggal(t.tanggal)} · {t.jumlah_peserta} peserta{t.sasaran ? ` · ${t.sasaran}` : ""}{t.metode ? ` · ${t.metode}` : ""} · {t.kode_upt}</p>
                  {t.keterangan && <p className="text-muted-foreground">{t.keterangan}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
