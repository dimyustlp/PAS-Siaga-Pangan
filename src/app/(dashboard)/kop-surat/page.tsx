/* eslint-disable @next/next/no-img-element */
import { ActionForm } from "@/components/shared/action-form";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ubahKopSurat } from "@/lib/actions/tahap";
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
    ? await supabase.from("master_upt").select("kode,nama,kanwil_id,alamat,telepon,email_kantor,kota_ttd,kab_kota").eq("kode", kode).maybeSingle()
    : { data: null };
  const kanwil = upt?.kanwil_id ? (await supabase.from("master_kanwil").select("nama").eq("id", upt.kanwil_id).maybeSingle()).data?.nama : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Kop surat UPT" description="Kop ini dipakai pada setiap Laporan Pelaksanaan Kegiatan Ketahanan Pangan yang diunduh sebagai PDF." />
      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={cak.uptDipilih} bolehSemua={false} />}
      {!upt ? (
        <Alert>Pilih UPT lebih dulu.</Alert>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Pratinjau</CardTitle><CardDescription>Logo kementerian di kiri dan logo Pemasyarakatan di kanan, garis ganda di bawahnya.</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border bg-white p-3 font-serif text-black sm:p-5">
                <div className="flex items-center gap-2 sm:gap-4">
                  <img src="/logo-kemenimipas.png" alt="" className="h-10 w-10 shrink-0 sm:h-16 sm:w-16" />
                  <div className="min-w-0 flex-1 break-words text-center leading-tight">
                    <p className="text-[10px] font-bold sm:text-[13px]">KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN</p><p className="text-[10px] font-bold sm:text-[13px]">REPUBLIK INDONESIA</p>
                    <p className="text-[10px] font-bold sm:text-[13px]">DIREKTORAT JENDERAL PEMASYARAKATAN</p>
                    {kanwil && <p className="text-[10px] font-bold sm:text-[13px]">{kanwil.toUpperCase()}</p>}
                    <p className="text-[12px] font-bold sm:text-[15px]">{upt.nama.toUpperCase()}</p>
                    <p className="mt-1 text-[10px]">{[upt.alamat, upt.telepon ? `Telepon ${upt.telepon}` : null, upt.email_kantor ? `Pos-el ${upt.email_kantor}` : null].filter(Boolean).join(" · ") || "Alamat belum diisi"}</p>
                  </div>
                  <img src="/logo-pemasyarakatan.png" alt="" className="h-10 w-auto shrink-0 sm:h-16" />
                </div>
                <div className="mt-2 border-b-[3px] border-black" /><div className="mt-[2px] border-b border-black" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Isi kop</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={ubahKopSurat} submit="Simpan kop surat" resetOnSuccess={false} fields={{ kode: { v: upt.kode }, alamat: { s: "alamat" }, telepon: { s: "telepon" }, email: { s: "email" }, kota: { s: "kota" } }}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Alamat kantor" htmlFor="alamat" className="sm:col-span-2"><Input id="alamat" name="alamat" defaultValue={upt.alamat ?? ""} placeholder="Jl. …, Kecamatan …, Kabupaten …, Kode Pos …" /></Field>
                  <Field label="Telepon" htmlFor="telepon"><Input id="telepon" name="telepon" defaultValue={upt.telepon ?? ""} /></Field>
                  <Field label="Pos-el (email) kantor" htmlFor="email"><Input id="email" name="email" defaultValue={upt.email_kantor ?? ""} /></Field>
                  <Field label="Kota penandatanganan" htmlFor="kota" hint="Muncul di atas tanda tangan, mis. Tangerang."><Input id="kota" name="kota" defaultValue={upt.kota_ttd ?? upt.kab_kota ?? ""} /></Field>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
