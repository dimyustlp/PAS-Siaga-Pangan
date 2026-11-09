// Menentukan sesi mana yang perlu perhatian di dasbor. Murni, tanpa akses database.

import type { Tables } from "@/lib/supabase/database.types";

export type Overview = Tables<"v_session_overview">;
export type Perhatian = { tingkat: "kritis" | "waspada"; teks: string };

const FASE_BERJALAN = new Set(["Dalam perjalanan", "Di lokasi"]);

/** Menit sejak ada data masuk terakhir, hanya untuk kegiatan yang sedang berjalan. */
export function menitTanpaData(o: Pick<Overview, "fase" | "diperbarui_at" | "ditutup_at">, now: Date): number | null {
  if (o.ditutup_at || !o.fase || !FASE_BERJALAN.has(o.fase) || !o.diperbarui_at) return null;
  const t = Date.parse(o.diperbarui_at);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now.getTime() - t) / 60_000));
}

/** Batas wajar tanpa data: dua kali interval pemeriksaan, paling sedikit 30 menit. */
export function batasTanpaData(intervalMenit: number | null): number {
  return Math.max(30, 2 * (intervalMenit ?? 60));
}

export function perhatianSesi(o: Overview, now: Date): Perhatian[] {
  if (o.ditutup_at) return [];
  const out: Perhatian[] = [];
  if (o.status_keamanan === "KRITIS") out.push({ tingkat: "kritis", teks: "Status KRITIS" });
  else if (o.status_keamanan === "MERAH") out.push({ tingkat: "kritis", teks: "Status MERAH" });
  if (o.terlambat_periksa) out.push({ tingkat: "waspada", teks: "Pemeriksaan berkala terlambat" });
  const diam = menitTanpaData(o, now);
  if (diam !== null && diam >= batasTanpaData(o.interval_pemeriksaan)) {
    out.push({
      tingkat: "waspada",
      teks: `Tidak ada data masuk ${diam} menit. Ketiadaan data bukan berarti aman: hubungi pengawal.`,
    });
  }
  if ((o.gangguan_terbuka ?? 0) > 0) out.push({ tingkat: "waspada", teks: `${o.gangguan_terbuka} gangguan belum diverifikasi` });
  if ((o.tindak_lanjut_terlambat ?? 0) > 0) out.push({ tingkat: "waspada", teks: `${o.tindak_lanjut_terlambat} tindak lanjut lewat tenggat` });
  if (
    o.status_kesiapan === "Dapat Dimulai" &&
    o.fase === "Sudah kembali ke blok" &&
    o.wbp_keluar !== null &&
    o.wbp_kembali !== null &&
    o.wbp_keluar !== o.wbp_kembali
  ) {
    out.push({ tingkat: "kritis", teks: `Jumlah WB kembali (${o.wbp_kembali}) tidak sama dengan yang keluar (${o.wbp_keluar})` });
  }
  return out;
}

/** Urutan tampil: yang paling mendesak di atas. */
export function skorUrgensi(o: Overview, now: Date): number {
  const p = perhatianSesi(o, now);
  const rank = { HIJAU: 0, KUNING: 1, MERAH: 2, KRITIS: 3 }[o.status_keamanan ?? "HIJAU"];
  return (o.ditutup_at ? -100 : 0) + rank * 100 + p.filter((x) => x.tingkat === "kritis").length * 20 + p.length * 5;
}
