// Pembacaan ringkasan dasbor. Cakupan data (UPT, Kanwil, Pusat) ditentukan RLS di database.

import { createClient } from "@/lib/supabase/server";
import { hariIniWib, tambahHari } from "@/lib/format";
import type { Overview } from "@/lib/domain/attention";
import type { Tables } from "@/lib/supabase/database.types";

export async function listOverview(opts: { upt?: string; hariKebelakang?: number } = {}): Promise<{ rows: Overview[]; error: boolean }> {
  const supabase = await createClient();
  const batas = tambahHari(hariIniWib(), -(opts.hariKebelakang ?? 14));
  let q = supabase
    .from("v_session_overview")
    .select("*")
    .or(`ditutup_at.is.null,tanggal_sesi.gte.${batas}`)
    .order("tanggal_sesi", { ascending: false })
    .limit(400);
  if (opts.upt) q = q.eq("kode_upt", opts.upt);
  const { data, error } = await q;
  return { rows: data ?? [], error: !!error };
}

export async function listUpt(): Promise<Tables<"master_upt">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("master_upt").select("*").order("nama");
  return data ?? [];
}

export async function listKanwil(): Promise<Tables<"master_kanwil">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("master_kanwil").select("*").order("nama");
  return data ?? [];
}
