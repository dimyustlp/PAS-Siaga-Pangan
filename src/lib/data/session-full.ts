// Seluruh data satu sesi untuk halaman detail, keputusan, persiapan, dan laporan cetak.

import { createClient } from "@/lib/supabase/server";
import { periodicCheckState, type CheckState } from "@/lib/domain/status";
import { parseRekonsiliasi, type Rekonsiliasi } from "@/lib/domain/reconciliation";
import type { Overview } from "@/lib/domain/attention";
import type { Tables } from "@/lib/supabase/database.types";

export type SesiLengkap = {
  ringkas: Overview;
  sesi: Tables<"daily_sessions">;
  kegiatan: Tables<"activities">;
  lokasi: Tables<"master_locations"> | null;
  logs: Tables<"field_logs">[];
  gangguan: Tables<"incidents">[];
  keputusan: Tables<"decisions">[];
  riwayatStatus: Tables<"status_history">[];
  tindakLanjut: Tables<"follow_ups">[];
  kesiapan: Tables<"session_readiness">[];
  nominatif: { inmate_id: string; nama: string; nomor_registrasi: string }[] | null;
  rekonsiliasi: Rekonsiliasi | null;
  pemeriksaan: CheckState;
  nama: Map<string, string>;
};

export async function getSessionFull(id: string, opts: { dengan_nominatif?: boolean } = {}): Promise<SesiLengkap | null> {
  const supabase = await createClient();

  const { data: ringkas } = await supabase.from("v_session_overview").select("*").eq("session_id", id).maybeSingle();
  if (!ringkas) return null;
  const { data: sesi } = await supabase.from("daily_sessions").select("*").eq("id", id).maybeSingle();
  if (!sesi) return null;

  const [kegiatan, logs, gangguan, keputusan, riwayat, tl, kesiapan, rek, nom] = await Promise.all([
    supabase.from("activities").select("*").eq("id", sesi.activity_id).maybeSingle(),
    supabase.from("field_logs").select("*").eq("session_id", id).order("waktu_kejadian", { ascending: false }).limit(500),
    supabase.from("incidents").select("*").eq("session_id", id).order("created_at", { ascending: false }),
    supabase.from("decisions").select("*").eq("session_id", id).order("created_at", { ascending: false }),
    supabase.from("status_history").select("*").eq("session_id", id).order("waktu", { ascending: false }),
    supabase.from("follow_ups").select("*").eq("session_id", id).order("tenggat", { ascending: true }),
    supabase.from("session_readiness").select("*").eq("session_id", id).order("kode"),
    supabase.rpc("rekonsiliasi_sesi", { p_session: id }),
    opts.dengan_nominatif === false ? Promise.resolve({ data: null }) : supabase.rpc("daftar_nominatif", { p_session: id }),
  ]);
  if (!kegiatan.data) return null;

  const lokasi = (await supabase.from("master_locations").select("*").eq("id", kegiatan.data.lokasi_id).maybeSingle()).data;

  const logList = logs.data ?? [];
  const terakhirPeriksa = logList.find((l) => l.jenis_entri === "Pemeriksaan berkala" || l.jenis_entri === "Pindah area atau ganti pengawal");
  const tiba = [...logList].reverse().find((l) => l.jenis_entri === "Tiba di lokasi");
  const pemeriksaan = periodicCheckState({
    intervalMinutes: sesi.interval_pemeriksaan,
    lastCheckAt: terakhirPeriksa?.waktu_kejadian ?? tiba?.waktu_kejadian ?? null,
    startedAt: tiba?.waktu_kejadian ?? null,
    now: new Date(),
  });

  const ids = new Set<string>(sesi.petugas_ids);
  logList.forEach((l) => ids.add(l.pengawal_id));
  (keputusan.data ?? []).forEach((d) => ids.add(d.pejabat_id));
  (tl.data ?? []).forEach((f) => f.penanggung_jawab_id && ids.add(f.penanggung_jawab_id));
  const nama = new Map<string, string>();
  if (ids.size > 0) {
    const { data: profil } = await supabase.from("profiles").select("id,full_name").in("id", [...ids]);
    (profil ?? []).forEach((p) => nama.set(p.id, p.full_name));
  }

  return {
    ringkas,
    sesi,
    kegiatan: kegiatan.data,
    lokasi,
    logs: logList,
    gangguan: gangguan.data ?? [],
    keputusan: keputusan.data ?? [],
    riwayatStatus: riwayat.data ?? [],
    tindakLanjut: tl.data ?? [],
    kesiapan: kesiapan.data ?? [],
    nominatif: Array.isArray(nom.data) ? (nom.data as SesiLengkap["nominatif"]) : null,
    rekonsiliasi: parseRekonsiliasi(rek.data),
    pemeriksaan,
    nama,
  };
}
