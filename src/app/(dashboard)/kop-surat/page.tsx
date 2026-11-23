import { FormKop } from "@/components/shared/form-kop";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Kop surat UPT" };
export const dynamic = "force-dynamic";

export default async function KopSuratPage({ searchParams }: { searchParams: Promise<{ kanwil?: string; upt?: string }> }) {
  const q = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const cak = await ambilCakupan(supabase, user, q);
  const kode = cak.uptDipilih;
  const { data: upt } = kode
    ? await supabase.from("master_upt").select("kode,nama,kanwil_id,alamat,telepon,email_kantor,kota_ttd,kab_kota,kop_baris,website,faksimile,kode_pos").eq("kode", kode).maybeSingle()
    : { data: null };
  const kanwil = upt?.kanwil_id ? (await supabase.from("master_kanwil").select("nama").eq("id", upt.kanwil_id).maybeSingle()).data?.nama ?? null : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Kop surat UPT" description="Seluruh isi kop dapat diisi sendiri. Setelah disimpan, kop dipakai pada laporan dan surat UPT; untuk satu surat tertentu isinya masih bisa disesuaikan tanpa mengubah kop tersimpan." />
      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={cak.uptDipilih} bolehSemua={false} />}
      {!upt ? (
        <Alert>Pilih UPT lebih dulu.</Alert>
      ) : (
        <Card>
          <CardHeader><CardTitle>{upt.nama}</CardTitle><CardDescription>Logo kementerian di kiri dan logo Pemasyarakatan di kanan, garis ganda di bawahnya.</CardDescription></CardHeader>
          <CardContent>
            <FormKop
              key={upt.kode}
              awal={{
                kode: upt.kode, upt: upt.nama, kanwil, baris: upt.kop_baris,
                alamat: upt.alamat ?? "", kodePos: upt.kode_pos ?? "", telepon: upt.telepon ?? "", faks: upt.faksimile ?? "",
                email: upt.email_kantor ?? "", website: upt.website ?? "", kota: upt.kota_ttd ?? upt.kab_kota ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
