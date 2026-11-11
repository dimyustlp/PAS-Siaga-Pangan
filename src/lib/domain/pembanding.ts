// Perbandingan kondisi awal (sebelum SOP) dengan hasil sistem (sesudah) untuk evaluasi proyek perubahan.

export type KondisiAwalBaris = {
  kegiatan_per_bulan: number | null;
  pct_catatan_lengkap: number | null;
  pct_serah_terima_cocok: number | null;
  pct_temuan_tindak_lanjut: number | null;
  pct_tindak_lanjut_selesai: number | null;
  menit_pelaporan_kejadian: number | null;
  gangguan_per_bulan: number | null;
};

export type Sesudah = {
  kegiatan_per_bulan: number | null;
  pct_catatan_lengkap: number | null;
  pct_serah_terima_cocok: number | null;
  pct_temuan_tindak_lanjut: number | null;
  pct_tindak_lanjut_selesai: number | null;
  menit_pelaporan_kejadian: number | null;
  gangguan_per_bulan: number | null;
};

export type BarisPembanding = {
  kunci: keyof KondisiAwalBaris;
  nama: string;
  satuan: string;
  awal: number | null;
  sesudah: number | null;
  /** sesudah - awal. null bila salah satu belum ada. */
  selisih: number | null;
  /** true bila perubahan menuju arah yang diinginkan; null bila belum bisa dinilai atau tidak berubah. */
  membaik: boolean | null;
};

const DEFINISI: { kunci: keyof KondisiAwalBaris; nama: string; satuan: string; makinBesarMakinBaik: boolean }[] = [
  { kunci: "kegiatan_per_bulan", nama: "Kegiatan berjalan per bulan", satuan: "kegiatan", makinBesarMakinBaik: true },
  { kunci: "pct_catatan_lengkap", nama: "Kelengkapan dokumen dan catatan", satuan: "%", makinBesarMakinBaik: true },
  { kunci: "pct_serah_terima_cocok", nama: "Catatan keluar dan kembali cocok", satuan: "%", makinBesarMakinBaik: true },
  { kunci: "pct_temuan_tindak_lanjut", nama: "Temuan yang punya tindak lanjut", satuan: "%", makinBesarMakinBaik: true },
  { kunci: "pct_tindak_lanjut_selesai", nama: "Tindak lanjut yang selesai", satuan: "%", makinBesarMakinBaik: true },
  { kunci: "menit_pelaporan_kejadian", nama: "Waktu pelaporan kejadian", satuan: "menit", makinBesarMakinBaik: false },
  { kunci: "gangguan_per_bulan", nama: "Gangguan per bulan", satuan: "kejadian", makinBesarMakinBaik: false },
];

const bulat = (x: number) => Math.round(x * 10) / 10;

/** Rata-rata nilai yang terisi per kolom. Kolom tanpa data tetap null (bukan nol). */
export function rataKondisiAwal(baris: KondisiAwalBaris[]): KondisiAwalBaris {
  const hasil = {} as KondisiAwalBaris;
  for (const d of DEFINISI) {
    const nilai = baris.map((b) => b[d.kunci]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    hasil[d.kunci] = nilai.length ? bulat(nilai.reduce((a, b) => a + b, 0) / nilai.length) : null;
  }
  return hasil;
}

/** Jumlah bulan pada periode. Periode di bawah tujuh hari dianggap terlalu pendek untuk dirata-ratakan per bulan. */
export function jumlahBulan(dari: string, sampai: string): number | null {
  const hari = (Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / 86_400_000 + 1;
  return Number.isFinite(hari) && hari >= 7 ? hari / 30.4375 : null;
}

export function bandingkan(awal: KondisiAwalBaris, sesudah: Sesudah): BarisPembanding[] {
  return DEFINISI.map((d) => {
    const a = awal[d.kunci];
    const s = sesudah[d.kunci];
    const selisih = a === null || s === null ? null : bulat(s - a);
    const membaik = selisih === null || selisih === 0 ? null : d.makinBesarMakinBaik ? selisih > 0 : selisih < 0;
    return { kunci: d.kunci, nama: d.nama, satuan: d.satuan, awal: a, sesudah: s, selisih, membaik };
  });
}
