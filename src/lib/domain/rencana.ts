// Status rencana kegiatan menurut tanggal, dan penyaring pencarian.

export type StatusRencana = "akan" | "berjalan" | "selesai";

export const LABEL_STATUS_RENCANA: Record<StatusRencana, string> = {
  akan: "Akan datang",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

/** Tanggal berformat YYYY-MM-DD (WIB) saling dibandingkan sebagai teks. */
export function statusRencana(mulai: string, berakhir: string | null, hariIni: string): StatusRencana {
  if (mulai > hariIni) return "akan";
  if (berakhir && berakhir < hariIni) return "selesai";
  return "berjalan";
}

/** Membuang karakter yang bermakna khusus pada penyaring PostgREST dan pola ilike. */
export function bersihkanKataCari(v: string | undefined): string {
  return (v ?? "").replace(/[%*_,()\\"'`;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const UKURAN_HALAMAN_RENCANA = 20;
