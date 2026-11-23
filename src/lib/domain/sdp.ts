/** Ringkasan dasbor "Detail Ketahanan Pangan" pada SDP Ditjenpas (data.ditjenpas.go.id). */

export const SDP_URL = "https://data.ditjenpas.go.id/sdp/detail/ketahanan-pangan";

export type BarisSdp = string[];

export type DataSdp = {
  kpi: {
    total_produksi: string;
    nilai_produksi: string;
    rata_wbp: string;
    rata_luas_wilayah: string;
    rata_luas_lahan: string;
  };
  komoditas?: string[];
  produksi_atas: BarisSdp[];
  produksi_bawah: BarisSdp[];
  wbp_atas: BarisSdp[];
  wbp_bawah: BarisSdp[];
  lahan_atas: BarisSdp[];
  lahan_bawah: BarisSdp[];
};

export const KPI_SDP: { kunci: keyof DataSdp["kpi"]; label: string }[] = [
  { kunci: "total_produksi", label: "Total produksi" },
  { kunci: "nilai_produksi", label: "Nilai produksi" },
  { kunci: "rata_wbp", label: "Rata-rata WBP terlibat" },
  { kunci: "rata_luas_wilayah", label: "Rata-rata luas wilayah" },
  { kunci: "rata_luas_lahan", label: "Rata-rata luas lahan digunakan" },
];

export type KunciTabel = "produksi_atas" | "produksi_bawah" | "wbp_atas" | "wbp_bawah" | "lahan_atas" | "lahan_bawah";

export const TABEL_SDP: { kunci: KunciTabel; judul: string; kolom: string[] }[] = [
  { kunci: "produksi_atas", judul: "10 Kanwil teratas (produksi dan omset)", kolom: ["Kanwil", "Total produksi", "Total omset"] },
  { kunci: "produksi_bawah", judul: "10 Kanwil terbawah (produksi dan omset)", kolom: ["Kanwil", "Total produksi", "Total omset"] },
  { kunci: "wbp_atas", judul: "10 Kanwil teratas (warga binaan terlibat)", kolom: ["Kanwil", "WBP terlibat (orang)"] },
  { kunci: "wbp_bawah", judul: "10 Kanwil terbawah (warga binaan terlibat)", kolom: ["Kanwil", "WBP terlibat (orang)"] },
  { kunci: "lahan_atas", judul: "10 Kanwil teratas (luas lahan)", kolom: ["Kanwil", "Luas lahan (m²)"] },
  { kunci: "lahan_bawah", judul: "10 Kanwil terbawah (luas lahan)", kolom: ["Kanwil", "Luas lahan (m²)"] },
];

export function bacaDataSdp(v: unknown): DataSdp | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Partial<DataSdp>;
  if (!d.kpi) return null;
  const arr = (x: unknown): BarisSdp[] => (Array.isArray(x) ? x.filter(Array.isArray).map((r) => (r as unknown[]).map((c) => String(c ?? ""))) : []);
  return {
    kpi: {
      total_produksi: String(d.kpi.total_produksi ?? ""),
      nilai_produksi: String(d.kpi.nilai_produksi ?? ""),
      rata_wbp: String(d.kpi.rata_wbp ?? ""),
      rata_luas_wilayah: String(d.kpi.rata_luas_wilayah ?? ""),
      rata_luas_lahan: String(d.kpi.rata_luas_lahan ?? ""),
    },
    komoditas: Array.isArray(d.komoditas) ? d.komoditas.map(String) : [],
    produksi_atas: arr(d.produksi_atas),
    produksi_bawah: arr(d.produksi_bawah),
    wbp_atas: arr(d.wbp_atas),
    wbp_bawah: arr(d.wbp_bawah),
    lahan_atas: arr(d.lahan_atas),
    lahan_bawah: arr(d.lahan_bawah),
  };
}

/** Teks isian "Kanwil ; nilai ; nilai" per baris menjadi baris tabel. */
export function teksKeBaris(teks: string, kolom: number): BarisSdp[] {
  return teks
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => b.split(/\s*[;|\t]\s*/).slice(0, kolom))
    .filter((r) => r[0])
    .slice(0, 20);
}

export function barisKeTeks(baris: BarisSdp[]): string {
  return baris.map((r) => r.join(" ; ")).join("\n");
}
