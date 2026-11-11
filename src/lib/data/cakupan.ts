import type { CurrentUser } from "@/lib/auth";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type KanwilRow = { id: string; nama: string };
export type UptRow = { kode: string; nama: string; kanwil_id: string | null };

export type Cakupan = {
  kanwil: KanwilRow[];
  upt: UptRow[];
  /** Kanwil terpilih ("" = semua dalam cakupan). */
  kanwilDipilih: string;
  /** UPT terpilih ("" = semua dalam cakupan). */
  uptDipilih: string;
  /** UPT terkunci karena akun terikat ke satu UPT. */
  terkunci: boolean;
  /** Apakah pengguna boleh menulis data induk untuk UPT terpilih. */
  bisaKelola: boolean;
};

/** Menentukan Kanwil dan UPT yang boleh dipilih pengguna serta pilihan saat ini dari parameter alamat. */
export async function ambilCakupan(supabase: Supabase, user: CurrentUser, q: { kanwil?: string; upt?: string }): Promise<Cakupan> {
  const [kw, up] = await Promise.all([
    supabase.from("master_kanwil").select("id,nama").order("urutan", { nullsFirst: false }).order("nama"),
    supabase.from("master_upt").select("kode,nama,kanwil_id").order("nama").limit(1000),
  ]);
  const semuaKanwil = (kw.data ?? []) as KanwilRow[];
  const semuaUpt = (up.data ?? []) as UptRow[];

  const luas = user.role === "administrator" || user.role === "pemantau_pusat";
  const upt = semuaUpt.filter((u) => (luas ? true : user.role === "pemantau_kanwil" ? u.kanwil_id === user.kanwilId : u.kode === user.kodeUpt));
  const kanwil = semuaKanwil.filter((k) => upt.some((u) => u.kanwil_id === k.id));

  const terkunci = !luas && user.role !== "pemantau_kanwil";
  let uptDipilih = terkunci ? (upt[0]?.kode ?? "") : upt.some((u) => u.kode === q.upt) ? (q.upt as string) : "";
  let kanwilDipilih = user.role === "pemantau_kanwil" && !q.kanwil ? (user.kanwilId ?? "") : kanwil.some((k) => k.id === q.kanwil) ? (q.kanwil as string) : "";
  if (uptDipilih) {
    const k = upt.find((u) => u.kode === uptDipilih)?.kanwil_id;
    if (k) kanwilDipilih = k;
  } else if (kanwilDipilih && !upt.some((u) => u.kanwil_id === kanwilDipilih)) {
    kanwilDipilih = "";
  }
  if (uptDipilih && !upt.some((u) => u.kode === uptDipilih)) uptDipilih = "";

  return {
    kanwil,
    upt,
    kanwilDipilih,
    uptDipilih,
    terkunci,
    bisaKelola: user.role === "administrator" || user.role === "operator",
  };
}
