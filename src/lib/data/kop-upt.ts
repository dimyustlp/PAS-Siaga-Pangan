import { createClient } from "@/lib/supabase/server";
import type { KopUpt } from "@/lib/domain/kop";

/** Kop surat sebuah UPT (dari data induk dan pengaturan kop). Dipakai oleh formulir dan penilaian cetak. */
export async function ambilKopUpt(kodeUpt: string): Promise<KopUpt> {
  const supabase = await createClient();
  const { data: upt } = await supabase
    .from("master_upt")
    .select("nama,kanwil_id,alamat,telepon,email_kantor,kota_ttd,kab_kota,kop_baris,website,faksimile,kode_pos")
    .eq("kode", kodeUpt)
    .maybeSingle();
  let kanwil: string | null = null;
  if (upt?.kanwil_id) {
    const { data: k } = await supabase.from("master_kanwil").select("nama").eq("id", upt.kanwil_id).maybeSingle();
    kanwil = k?.nama ?? null;
  }
  return {
    baris: upt?.kop_baris ?? null,
    kanwil,
    upt: upt?.nama ?? kodeUpt,
    alamat: upt?.alamat ?? null,
    kodePos: upt?.kode_pos ?? null,
    telepon: upt?.telepon ?? null,
    faks: upt?.faksimile ?? null,
    email: upt?.email_kantor ?? null,
    website: upt?.website ?? null,
    kota: upt?.kota_ttd ?? upt?.kab_kota ?? null,
  };
}
