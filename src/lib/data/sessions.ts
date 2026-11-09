// Lapisan baca data (dipanggil dari Server Component). Hak akses ditentukan RLS di database:
// Operator dan Kepala Pengamanan melihat semua sesi, Pengawal hanya sesi tempat ia ditugaskan.

import { createClient } from "@/lib/supabase/server";
import { periodicCheckState, type CheckState } from "@/lib/domain/status";

export type SesiRingkas = {
  id: string;
  tanggal_sesi: string;
  status_kesiapan: "Menunggu" | "Dapat Dimulai" | "Perbaiki Dulu" | "Ditunda";
  status_keamanan: "HIJAU" | "KUNING" | "MERAH" | "KRITIS";
  ditutup_at: string | null;
  interval_pemeriksaan: number;
  jumlah_narapidana: number;
  activities: {
    kode_kegiatan: string;
    jenis_kegiatan: "Pertanian" | "Peternakan" | "Perikanan";
    master_locations: { nama: string } | null;
  } | null;
};

export async function listSessions(limit = 200): Promise<SesiRingkas[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_sessions")
    .select(
      "id,tanggal_sesi,status_kesiapan,status_keamanan,ditutup_at,interval_pemeriksaan,jumlah_narapidana,activities(kode_kegiatan,jenis_kegiatan,master_locations(nama))"
    )
    .order("tanggal_sesi", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Gagal membaca daftar sesi.");
  return (data ?? []) as unknown as SesiRingkas[];
}

export async function getSessionDetail(sessionId: string) {
  const supabase = await createClient();

  const { data: sesi, error } = await supabase
    .from("daily_sessions")
    .select("*,activities(kode_kegiatan,jenis_kegiatan,tanggal_mulai,rencana_berakhir,master_locations(nama,keterangan))")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error("Gagal membaca sesi.");
  if (!sesi) return null;

  const [logs, incidents, decisions, petugas, lastCheck, firstArrival] = await Promise.all([
    supabase.from("field_logs").select("*").eq("session_id", sessionId).order("waktu_kejadian", { ascending: false }).limit(200),
    supabase.from("incidents").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    supabase.from("decisions").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,full_name").in("id", sesi.petugas_ids),
    supabase
      .from("field_logs")
      .select("waktu_kejadian")
      .eq("session_id", sessionId)
      .eq("jenis_entri", "Pemeriksaan berkala")
      .order("waktu_kejadian", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("field_logs")
      .select("waktu_kejadian")
      .eq("session_id", sessionId)
      .eq("jenis_entri", "Tiba di lokasi")
      .order("waktu_kejadian", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const pemeriksaan: CheckState = periodicCheckState({
    intervalMinutes: sesi.interval_pemeriksaan,
    lastCheckAt: lastCheck.data?.waktu_kejadian ?? null,
    startedAt: firstArrival.data?.waktu_kejadian ?? null,
    now: new Date(),
  });

  return {
    sesi,
    logs: logs.data ?? [],
    incidents: incidents.data ?? [],
    decisions: decisions.data ?? [],
    petugas: petugas.data ?? [],
    pemeriksaan,
  };
}
