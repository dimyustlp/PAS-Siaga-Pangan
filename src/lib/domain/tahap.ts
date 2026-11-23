// Empat tahap pengawalan kegiatan ketahanan pangan. Salinan tampilan dari private.butir_tahap() di database
// (database tetap penentu: urutan tahap, lampiran wajib, batas jumlah, dan batas ukuran).

export type Butir = { butir: string; jenis: "foto" | "berkas"; wajib: boolean; maks: number; judul: string; petunjuk: string };

export type IsianTahap = {
  name: string;
  label: string;
  tipe: "angka" | "teks" | "area" | "yt";
  wajib?: boolean;
  hint?: string;
};

export type TahapDef = {
  no: 1 | 2 | 3 | 4;
  judul: string;
  ringkas: string;
  lokasi: string;
  butir: Butir[];
  isian: IsianTahap[];
};

const catatan: IsianTahap = { name: "catatan", label: "Catatan", tipe: "area" };

export const TAHAP: TahapDef[] = [
  {
    no: 1,
    judul: "Pengeluaran melalui P2U",
    ringkas: "WB dikeluarkan dari blok dan diperiksa di Pintu Utama (P2U).",
    lokasi: "Di dalam UPT",
    butir: [
      { butir: "foto_p2u", jenis: "foto", wajib: true, maks: 5, judul: "Foto penghitungan dan pemeriksaan WB di P2U", petunjuk: "Ambil foto saat WB dihitung dan digeledah di P2U." },
      { butir: "ba_pengeluaran", jenis: "berkas", wajib: true, maks: 2, judul: "Berita acara / surat pengeluaran WB", petunjuk: "PDF hasil pindai yang sudah ditandatangani petugas P2U." },
    ],
    isian: [
      { name: "jumlah_wb", label: "Jumlah WB keluar (hasil hitung)", tipe: "angka", wajib: true },
      { name: "jumlah_alat", label: "Jumlah alat kerja dibawa", tipe: "angka", wajib: true },
      { name: "petugas_p2u", label: "Nama petugas P2U", tipe: "teks" },
      catatan,
    ],
  },
  {
    no: 2,
    judul: "Pengawalan menuju lokasi",
    ringkas: "WB dikawal dari UPT ke lokasi kegiatan pangan.",
    lokasi: "Perjalanan",
    butir: [
      { butir: "foto_berangkat", jenis: "foto", wajib: true, maks: 5, judul: "Foto keberangkatan dan kendaraan pengawalan", petunjuk: "Foto WB saat naik kendaraan atau berangkat berjalan kaki." },
      { butir: "dok_perjalanan", jenis: "berkas", wajib: false, maks: 2, judul: "Dokumen perjalanan (bila ada)", petunjuk: "Surat jalan atau izin keluar kendaraan, bila dipakai." },
    ],
    isian: [
      { name: "jumlah_wb", label: "Jumlah WB dalam pengawalan", tipe: "angka", wajib: true },
      { name: "kendaraan", label: "Kendaraan / nomor polisi", tipe: "teks", hint: "Tulis \"jalan kaki\" bila tanpa kendaraan." },
      catatan,
    ],
  },
  {
    no: 3,
    judul: "Pelaksanaan kegiatan pangan",
    ringkas: "WB tiba dan bekerja di lokasi (pertanian, perkebunan, perikanan, atau peternakan).",
    lokasi: "Lokasi kegiatan",
    butir: [
      { butir: "foto_kegiatan", jenis: "foto", wajib: true, maks: 5, judul: "Foto pelaksanaan kegiatan pangan", petunjuk: "Foto WB sedang bekerja; usahakan lokasi dan petugas terlihat." },
      { butir: "daftar_hadir", jenis: "berkas", wajib: true, maks: 2, judul: "Daftar hadir WB di lokasi kegiatan", petunjuk: "PDF atau foto daftar hadir yang ditandatangani." },
    ],
    isian: [
      { name: "jumlah_wb", label: "Jumlah WB di lokasi (hasil hitung)", tipe: "angka", wajib: true },
      { name: "uraian", label: "Uraian kegiatan", tipe: "area", wajib: true, hint: "Contoh: penanaman bibit cabai 200 polybag, pemberian pakan ikan lele kolam 3." },
      { name: "hasil", label: "Hasil atau capaian hari ini", tipe: "teks" },
      catatan,
    ],
  },
  {
    no: 4,
    judul: "Kembali ke UPT",
    ringkas: "WB kembali, dihitung, digeledah di P2U, dan diserahkan ke blok.",
    lokasi: "Di dalam UPT",
    butir: [
      { butir: "foto_kembali", jenis: "foto", wajib: true, maks: 5, judul: "Foto penghitungan dan penggeledahan saat kembali", petunjuk: "Foto saat WB dihitung ulang dan digeledah di P2U." },
      { butir: "ba_kembali", jenis: "berkas", wajib: true, maks: 2, judul: "Berita acara serah terima kembali ke blok", petunjuk: "PDF berita acara yang ditandatangani petugas blok." },
    ],
    isian: [
      { name: "jumlah_wb", label: "Jumlah WB kembali (hasil hitung)", tipe: "angka", wajib: true },
      { name: "jumlah_alat", label: "Jumlah alat kerja kembali", tipe: "angka", wajib: true },
      { name: "penggeledahan", label: "Penggeledahan sudah dilakukan?", tipe: "yt", wajib: true },
      { name: "penerima", label: "Petugas blok yang menerima", tipe: "teks" },
      catatan,
    ],
  },
];

export const NAMA_TAHAP: Record<number, string> = Object.fromEntries(TAHAP.map((t) => [t.no, t.judul]));

export function judulButir(butir: string): string {
  for (const t of TAHAP) for (const b of t.butir) if (b.butir === butir) return b.judul;
  return butir;
}

/** Membentuk isian tahap dari formulir (semua teks). Angka diubah jadi angka, ya/tidak jadi boolean. */
export function bangunIsian(no: number, nilai: Record<string, string>): Record<string, unknown> {
  const def = TAHAP.find((t) => t.no === no);
  const out: Record<string, unknown> = {};
  if (!def) return out;
  for (const f of def.isian) {
    const v = (nilai[f.name] ?? "").trim();
    if (!v) continue;
    if (f.tipe === "angka") out[f.name] = /^\d+$/.test(v) ? Number(v) : v;
    else if (f.tipe === "yt") out[f.name] = v === "ya" ? true : v === "tidak" ? false : v;
    else out[f.name] = v;
  }
  return out;
}

/** Butir wajib yang belum punya lampiran. */
export function butirKurang(no: number, ada: { butir: string }[]): Butir[] {
  const def = TAHAP.find((t) => t.no === no);
  return (def?.butir ?? []).filter((b) => b.wajib && !ada.some((a) => a.butir === b.butir));
}

export function fmtUkuran(byte: number): string {
  if (byte >= 1024 * 1024 * 1024) return `${(byte / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (byte >= 1024 * 1024) return `${(byte / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(byte / 1024))} KB`;
}
