// Klasifikasi dan pembantu tampilan untuk penampungan berkas.

export const KATEGORI_BERKAS = [
  "Surat Perintah",
  "Rencana Pengamanan",
  "Daftar Nominatif",
  "Laporan Kegiatan",
  "Berita Acara",
  "Dokumentasi",
  "Data Dukung",
  "Lainnya",
] as const;
export type KategoriBerkas = (typeof KATEGORI_BERKAS)[number];

/** Kategori yang dipantau kelengkapannya per UPT. */
export const KATEGORI_POKOK: KategoriBerkas[] = ["Surat Perintah", "Rencana Pengamanan", "Laporan Kegiatan", "Berita Acara"];

export const BERKAS_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx";

export function fmtUkuran(byte: number | null | undefined): string {
  if (byte == null) return "-";
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}

export type RingkasUpt = { kode: string; total: number; perKategori: Record<string, number>; terakhir: string | null };

/** Menghitung jumlah berkas per UPT dan per kategori. UPT tanpa berkas tetap muncul dengan nol. */
export function ringkasPerUpt(
  daftarUpt: { kode: string }[],
  berkas: { kode_upt: string | null; kategori: string | null; tanggal: string | null }[]
): Map<string, RingkasUpt> {
  const peta = new Map<string, RingkasUpt>();
  for (const u of daftarUpt) peta.set(u.kode, { kode: u.kode, total: 0, perKategori: {}, terakhir: null });
  for (const b of berkas) {
    if (!b.kode_upt) continue;
    const r = peta.get(b.kode_upt);
    if (!r) continue;
    r.total += 1;
    if (b.kategori) r.perKategori[b.kategori] = (r.perKategori[b.kategori] ?? 0) + 1;
    if (b.tanggal && (!r.terakhir || b.tanggal > r.terakhir)) r.terakhir = b.tanggal;
  }
  return peta;
}
