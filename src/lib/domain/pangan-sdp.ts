/** Rekap hasil ketahanan pangan berbentuk laporan "Detail Ketahanan Pangan" pada SDP Ditjenpas. */

export type RekapKpi = { ton: number; nilai: number; luas_m2: number; wbp_rata: number; upt: number; komoditas: number; catatan: number };
export type RekapBulan = { bulan: string; ton: number; nilai: number; wbp: number; premi: number };
export type RekapPeringkat = { nama: string; ton: number; nilai: number; wbp: number; luas_m2: number };
export type RekapKomoditas = { kom: string; jenis: string; ton: number; nilai: number; catatan: number; upt: number };
export type RekapTitik = { kode: string; nama: string; kanwil: string | null; lat: number; lng: number; kom: string; jenis: string; ton: number; nilai: number };

export type RekapPangan = {
  kpi: RekapKpi;
  sebelumnya: { ton: number; nilai: number };
  bulanan: RekapBulan[];
  peringkat: RekapPeringkat[];
  komoditas: RekapKomoditas[];
  upt: RekapTitik[];
};

const n = (x: unknown) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};
const daftar = <T,>(x: unknown, f: (o: Record<string, unknown>) => T): T[] =>
  Array.isArray(x) ? x.filter((o): o is Record<string, unknown> => !!o && typeof o === "object").map(f) : [];

/** Membaca hasil fungsi rekap_pangan_sdp dengan aman: angka selalu angka, daftar selalu daftar. */
export function bacaRekap(mentah: unknown): RekapPangan {
  const o = (mentah && typeof mentah === "object" ? mentah : {}) as Record<string, unknown>;
  const k = (o.kpi && typeof o.kpi === "object" ? o.kpi : {}) as Record<string, unknown>;
  const s = (o.sebelumnya && typeof o.sebelumnya === "object" ? o.sebelumnya : {}) as Record<string, unknown>;
  return {
    kpi: { ton: n(k.ton), nilai: n(k.nilai), luas_m2: n(k.luas_m2), wbp_rata: n(k.wbp_rata), upt: n(k.upt), komoditas: n(k.komoditas), catatan: n(k.catatan) },
    sebelumnya: { ton: n(s.ton), nilai: n(s.nilai) },
    bulanan: daftar(o.bulanan, (b) => ({ bulan: String(b.bulan ?? ""), ton: n(b.ton), nilai: n(b.nilai), wbp: n(b.wbp), premi: n(b.premi) })),
    peringkat: daftar(o.peringkat, (p) => ({ nama: String(p.nama ?? "-"), ton: n(p.ton), nilai: n(p.nilai), wbp: n(p.wbp), luas_m2: n(p.luas_m2) })),
    komoditas: daftar(o.komoditas, (c) => ({ kom: String(c.kom ?? ""), jenis: String(c.jenis ?? ""), ton: n(c.ton), nilai: n(c.nilai), catatan: n(c.catatan), upt: n(c.upt) })),
    upt: daftar(o.upt, (t) => ({ kode: String(t.kode ?? ""), nama: String(t.nama ?? ""), kanwil: t.kanwil ? String(t.kanwil) : null, lat: n(t.lat), lng: n(t.lng), kom: String(t.kom ?? ""), jenis: String(t.jenis ?? ""), ton: n(t.ton), nilai: n(t.nilai) })).filter((t) => t.kode && (t.lat !== 0 || t.lng !== 0)),
  };
}

const NF = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const NF0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const angka = (x: number) => NF.format(x);
export const angkaBulat = (x: number) => NF0.format(x);

/** Rupiah ringkas seperti di SDP: "Rp 20,61 Miliar", "Rp 311,64 Juta". */
export function rupiahRingkas(x: number): string {
  const a = Math.abs(x);
  if (a >= 1e12) return `Rp ${NF.format(x / 1e12)} Triliun`;
  if (a >= 1e9) return `Rp ${NF.format(x / 1e9)} Miliar`;
  if (a >= 1e6) return `Rp ${NF.format(x / 1e6)} Juta`;
  return `Rp ${NF0.format(x)}`;
}

/** Rupiah dipecah supaya angkanya bisa dibesarkan dan satuannya dikecilkan pada kartu. */
export function rupiahBagian(x: number): { angka: string; satuan: string } {
  const a = Math.abs(x);
  if (a >= 1e12) return { angka: NF.format(x / 1e12), satuan: "triliun" };
  if (a >= 1e9) return { angka: NF.format(x / 1e9), satuan: "miliar" };
  if (a >= 1e6) return { angka: NF.format(x / 1e6), satuan: "juta" };
  return { angka: NF0.format(x), satuan: "" };
}

/** Selisih terhadap periode sebelumnya yang sama panjang. Null bila periode sebelumnya kosong. */
export function tren(sekarang: number, sebelumnya: number): { arah: "naik" | "turun" | "tetap"; persen: number } | null {
  if (!(sebelumnya > 0)) return null;
  const p = ((sekarang - sebelumnya) / sebelumnya) * 100;
  if (Math.abs(p) < 0.005) return { arah: "tetap", persen: 0 };
  return { arah: p > 0 ? "naik" : "turun", persen: Math.abs(p) };
}

/** "Kantor Wilayah Ditjenpas Jawa Tengah" menjadi "Jawa Tengah", seperti penulisan di SDP. */
export const namaPendek = (nama: string) => nama.replace(/^Kantor Wilayah (Direktorat Jenderal Pemasyarakatan|Ditjenpas)\s+/i, "").trim() || nama;

export const kapital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function labelBulan(b: string): string {
  const [y, m] = b.split("-");
  const i = Number(m) - 1;
  return i >= 0 && i < 12 ? `${BULAN[i]}${y ? ` ${y.slice(2)}` : ""}` : b;
}

/** Warna tetap untuk delapan komoditas teratas pada peta dan keterangannya. */
export const WARNA_KOMODITAS = [
  "hsl(152 62% 38%)",
  "hsl(38 94% 48%)",
  "hsl(214 78% 50%)",
  "hsl(322 62% 48%)",
  "hsl(188 72% 36%)",
  "hsl(262 56% 54%)",
  "hsl(14 80% 52%)",
  "hsl(84 52% 40%)",
] as const;
export const WARNA_LAIN = "hsl(218 14% 55%)";

export const PERINGKAT_BATAS = 10;
export type KunciUrut = "nilai" | "ton" | "wbp" | "luas_m2";
/** Sepuluh teratas atau terbawah menurut satu ukuran. Yang bernilai nol tidak ikut diperingkat. */
export function peringkat(daftarP: RekapPeringkat[], kunci: KunciUrut, arah: "atas" | "bawah"): RekapPeringkat[] {
  const ada = daftarP.filter((p) => p[kunci] > 0);
  const urut = [...ada].sort((a, b) => (arah === "atas" ? b[kunci] - a[kunci] : a[kunci] - b[kunci]) || (arah === "atas" ? b.ton - a.ton : a.ton - b.ton));
  return urut.slice(0, PERINGKAT_BATAS);
}
