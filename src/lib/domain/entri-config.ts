// Daftar jenis entri lapangan, isian tiap jenis, dan pembentuk payload. Murni: dipakai formulir Pengawal dan diuji.

export type FieldDef = {
  name: string;
  label: string;
  tipe: "angka" | "teks" | "pilih" | "yt" | "area";
  pilihan?: string[];
  wajib?: boolean;
  hint?: string;
  /** Tampil hanya bila isian lain bernilai tertentu. */
  jika?: { name: string; nilai: string };
};

export type JenisDef = { jenis: string; judul: string; ringkas: string; fields: FieldDef[]; perluGelang?: boolean };

const catatan: FieldDef = { name: "catatan", label: "Catatan", tipe: "area" };

export const KATEGORI_GANGGUAN = [
  "WB tidak ditemukan",
  "Selisih jumlah WB",
  "Kecelakaan atau cedera",
  "Kekerasan atau perkelahian",
  "Kehilangan alat kerja",
  "Gangguan komunikasi atau perangkat",
  "Gangguan dari pihak luar",
  "Lainnya",
];

export const JENIS_ENTRI: JenisDef[] = [
  {
    jenis: "Serah terima di blok",
    judul: "Serah terima di blok",
    ringkas: "Keluar dari blok, atau kembali ke blok.",
    fields: [
      { name: "tahap", label: "Tahap", tipe: "pilih", pilihan: ["keluar", "kembali"], wajib: true },
      { name: "jumlah_wbp", label: "Jumlah WB (hasil hitung)", tipe: "angka", wajib: true },
      { name: "jumlah_alat", label: "Jumlah alat kerja", tipe: "angka", wajib: true },
      { name: "penggeledahan", label: "Penggeledahan sudah dilakukan?", tipe: "yt", wajib: true, jika: { name: "tahap", nilai: "kembali" } },
      { name: "penerima", label: "Petugas yang menerima", tipe: "teks" },
    ],
  },
  {
    jenis: "P2U keluar atau masuk",
    judul: "Pos P2U",
    ringkas: "Pencatatan keluar atau masuk di P2U.",
    fields: [{ name: "arah", label: "Arah", tipe: "pilih", pilihan: ["keluar", "masuk"], wajib: true }, { name: "jumlah", label: "Jumlah orang", tipe: "angka" }, catatan],
  },
  {
    jenis: "Tiba di lokasi",
    judul: "Tiba di lokasi",
    ringkas: "Hitung WB saat tiba di lokasi kegiatan.",
    fields: [{ name: "jumlah_wbp", label: "Jumlah WB (hasil hitung)", tipe: "angka", wajib: true }, catatan],
  },
  {
    jenis: "Pemeriksaan berkala",
    judul: "Pemeriksaan berkala",
    ringkas: "Hitung WB sesuai interval.",
    fields: [
      { name: "jumlah_wbp", label: "Jumlah WB (hasil hitung)", tipe: "angka", wajib: true },
      { name: "jumlah_alat", label: "Jumlah alat kerja", tipe: "angka" },
      catatan,
    ],
  },
  {
    jenis: "Pindah area atau ganti pengawal",
    judul: "Pindah area / ganti pengawal",
    ringkas: "Hitung WB setiap perpindahan lokasi atau serah terima antar pengawal.",
    fields: [
      { name: "jumlah_wbp", label: "Jumlah WB (hasil hitung)", tipe: "angka", wajib: true },
      { name: "area_baru", label: "Area baru", tipe: "teks" },
      { name: "pengawal_baru", label: "Pengawal pengganti", tipe: "teks", hint: "Isi area baru atau pengawal pengganti (atau keduanya)." },
      catatan,
    ],
  },
  {
    jenis: "Pihak luar dan kendaraan",
    judul: "Pihak luar / kendaraan",
    ringkas: "Orang atau kendaraan yang masuk area kegiatan.",
    fields: [
      { name: "jenis", label: "Jenis", tipe: "pilih", pilihan: ["Pihak luar", "Kendaraan"], wajib: true },
      { name: "keterangan", label: "Keterangan", tipe: "area", wajib: true },
      { name: "jumlah", label: "Jumlah orang", tipe: "angka" },
      { name: "nomor_kendaraan", label: "Nomor kendaraan", tipe: "teks", jika: { name: "jenis", nilai: "Kendaraan" } },
    ],
  },
  {
    jenis: "Pengembalian sebagian",
    judul: "Pengembalian sebagian",
    ringkas: "Sebagian WB dikembalikan ke blok lebih dulu.",
    fields: [
      { name: "jumlah_wbp", label: "Jumlah WB yang dikembalikan", tipe: "angka", wajib: true },
      { name: "jumlah_alat", label: "Jumlah alat yang dikembalikan", tipe: "angka" },
      { name: "penggeledahan", label: "Penggeledahan sudah dilakukan?", tipe: "yt" },
      catatan,
    ],
  },
  {
    jenis: "Alarm gelang",
    judul: "Alarm gelang",
    ringkas: "Setiap alarm wajib dikonfirmasi langsung ke petugas di lokasi.",
    perluGelang: true,
    fields: [
      { name: "jenis_alarm", label: "Jenis alarm", tipe: "pilih", pilihan: ["Keluar zona", "Perangkat dilepas atau dirusak", "Baterai lemah", "Sinyal terputus", "Lainnya"], wajib: true },
      { name: "dikonfirmasi_langsung", label: "Sudah dikonfirmasi langsung ke petugas di lokasi?", tipe: "yt", wajib: true },
      { name: "nomor_registrasi", label: "Nomor registrasi WB terkait", tipe: "teks" },
      { name: "tindakan", label: "Tindakan yang diambil", tipe: "area" },
    ],
  },
  {
    jenis: "Pemeriksaan gelang",
    judul: "Pemeriksaan gelang",
    ringkas: "Cek gelang terpasang dan berfungsi.",
    perluGelang: true,
    fields: [
      { name: "jumlah_diperiksa", label: "Jumlah gelang diperiksa", tipe: "angka", wajib: true },
      { name: "jumlah_berfungsi", label: "Jumlah yang berfungsi", tipe: "angka", wajib: true },
      catatan,
    ],
  },
  {
    jenis: "Gangguan",
    judul: "Gangguan",
    ringkas: "Catat kejadian. Status otomatis naik ke KUNING bila tidak diisi lain.",
    fields: [
      { name: "kategori", label: "Kategori", tipe: "pilih", pilihan: KATEGORI_GANGGUAN, wajib: true },
      { name: "tindakan_awal", label: "Tindakan awal", tipe: "area" },
      { name: "penanggung_jawab", label: "Penanggung jawab tindak lanjut", tipe: "teks" },
      { name: "status_baru", label: "Naikkan status ke", tipe: "pilih", pilihan: ["", "KUNING", "MERAH", "KRITIS"], hint: "Kosongkan untuk KUNING." },
    ],
  },
  {
    jenis: "Naikkan status",
    judul: "Naikkan status",
    ringkas: "Naikkan status tanpa menunggu dasbor. Menurunkan hanya oleh Kepala Pengamanan.",
    fields: [
      { name: "status_baru", label: "Status baru", tipe: "pilih", pilihan: ["KUNING", "MERAH", "KRITIS"], wajib: true },
      { name: "alasan", label: "Alasan", tipe: "area", wajib: true },
    ],
  },
];

export function tampilkan(f: FieldDef, nilai: Record<string, string>): boolean {
  return !f.jika || nilai[f.jika.name] === f.jika.nilai;
}

/** Mengubah isian formulir (semua berupa teks) menjadi payload entri. Isian kosong dibuang. */
export function bangunPayload(jenis: string, nilai: Record<string, string>): Record<string, unknown> {
  const def = JENIS_ENTRI.find((j) => j.jenis === jenis);
  const out: Record<string, unknown> = {};
  if (!def) return out;
  for (const f of def.fields) {
    if (!tampilkan(f, nilai)) continue;
    const mentah = (nilai[f.name] ?? "").trim();
    if (mentah === "") continue;
    if (f.tipe === "angka") {
      const n = Number(mentah.replace(",", "."));
      out[f.name] = Number.isNaN(n) ? mentah : n;
    } else if (f.tipe === "yt") {
      out[f.name] = mentah === "ya" ? true : mentah === "tidak" ? false : mentah;
    } else out[f.name] = mentah;
  }
  return out;
}

/** Perkiraan jumlah WB yang seharusnya ada saat ini, untuk membantu pengawal menghitung. */
export function jumlahDiharapkan(
  logs: { jenis_entri: string; payload: unknown; waktu_kejadian: string }[],
  rencana: number
): number {
  const urut = [...logs].sort((a, b) => Date.parse(a.waktu_kejadian) - Date.parse(b.waktu_kejadian));
  let dasar = rencana;
  let sebagian = 0;
  for (const l of urut) {
    const p = (l.payload ?? {}) as Record<string, unknown>;
    if (l.jenis_entri === "Serah terima di blok" && p.tahap === "keluar") {
      dasar = Number(p.jumlah_wbp) || dasar;
      sebagian = 0;
    } else if (l.jenis_entri === "Pengembalian sebagian") sebagian += Number(p.jumlah_wbp) || 0;
  }
  return dasar - sebagian;
}
