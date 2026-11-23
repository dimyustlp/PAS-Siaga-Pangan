import { cache } from "react";
import type { CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Nama satuan kerja pengguna: UPT untuk peran UPT, Kanwil untuk Pemantau Kanwil, Direktorat untuk Pusat. */
export const namaUnit = cache(async (user: CurrentUser): Promise<string | null> => {
  const supabase = await createClient();
  if (user.kodeUpt) {
    const { data } = await supabase.from("master_upt").select("nama").eq("kode", user.kodeUpt).maybeSingle();
    return data?.nama ?? user.kodeUpt;
  }
  if (user.kanwilId) {
    const { data } = await supabase.from("master_kanwil").select("nama").eq("id", user.kanwilId).maybeSingle();
    return data?.nama ?? null;
  }
  if (user.role === "administrator" || user.role === "pemantau_pusat") return "Direktorat Pengamanan dan Intelijen";
  return null;
});
