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

export type RingkasKanwil = {
  /** null = UPT yang belum terhubung ke Kanwil. */
  id: string | null;
  nama: string;
  jumlahUpt: number;
  /** UPT yang sudah punya berkas di semua kategori pokok. */
  uptLengkap: number;
  total: number;
  terakhir: string | null;
};

/** Merangkum berkas per Kanwil dari ringkasan per UPT. Kanwil tanpa UPT pada cakupan tidak dimunculkan. */
export function ringkasPerKanwil(
  daftarKanwil: { id: string; nama: string }[],
  daftarUpt: { kode: string; kanwil_id: string | null }[],
  perUpt: Map<string, RingkasUpt>
): RingkasKanwil[] {
  const hasil = new Map<string | null, RingkasKanwil>();
  for (const k of daftarKanwil) hasil.set(k.id, { id: k.id, nama: k.nama, jumlahUpt: 0, uptLengkap: 0, total: 0, terakhir: null });
  for (const u of daftarUpt) {
    const kunci = u.kanwil_id ?? null;
    let r = hasil.get(kunci);
    if (!r) {
      if (kunci !== null) continue;
      r = { id: null, nama: "Tanpa Kanwil", jumlahUpt: 0, uptLengkap: 0, total: 0, terakhir: null };
      hasil.set(null, r);
    }
    const s = perUpt.get(u.kode);
    r.jumlahUpt += 1;
    if (!s) continue;
    r.total += s.total;
    if (KATEGORI_POKOK.every((k) => (s.perKategori[k] ?? 0) > 0)) r.uptLengkap += 1;
    if (s.terakhir && (!r.terakhir || s.terakhir > r.terakhir)) r.terakhir = s.terakhir;
  }
  return [...hasil.values()].filter((r) => r.jumlahUpt > 0);
}
