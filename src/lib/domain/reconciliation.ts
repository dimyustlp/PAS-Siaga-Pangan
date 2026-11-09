// Bentuk hasil fungsi database rekonsiliasi_sesi (cek syarat tutup kegiatan).

export type Rekonsiliasi = {
  siapTutup: boolean;
  alasan: string[];
  wbpKeluar: number | null;
  wbpKembali: number | null;
  alatKeluar: number | null;
  alatKembali: number | null;
  penggeledahan: boolean | null;
  gangguanBelumDiverifikasi: number;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function parseRekonsiliasi(raw: unknown): Rekonsiliasi | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.siap_tutup !== "boolean" || !Array.isArray(r.alasan)) return null;
  return {
    siapTutup: r.siap_tutup,
    alasan: r.alasan.filter((a): a is string => typeof a === "string"),
    wbpKeluar: num(r.wbp_keluar),
    wbpKembali: num(r.wbp_kembali),
    alatKeluar: num(r.alat_keluar),
    alatKembali: num(r.alat_kembali),
    penggeledahan: r.penggeledahan === "true" ? true : r.penggeledahan === "false" ? false : null,
    gangguanBelumDiverifikasi: num(r.gangguan_belum_diverifikasi) ?? 0,
  };
}
