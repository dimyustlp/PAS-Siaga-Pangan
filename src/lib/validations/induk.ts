import { z } from "zod";

// Validasi data induk lengkap, kondisi awal, hasil pangan, berita, dan pengaturan Telegram.

const opt = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter.`).optional().transform((v) => (v ? v : undefined));
const uptOpt = z.string().trim().max(40).optional().transform((v) => (v ? v : undefined));
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus TTTT-BB-HH.");
const tanggalOpt = tanggal.optional();
const uuid = z.string().uuid("Data tidak valid.");

export const JENIS_KEGIATAN = ["Pertanian", "Peternakan", "Perikanan"] as const;
export const GOLONGAN_INVENTARIS = ["Alat kerja", "Sarana dan prasarana"] as const;
export const KONDISI_INVENTARIS = ["Baik", "Rusak ringan", "Rusak berat", "Hilang"] as const;
export const SATUAN_PANGAN = ["kg", "kwintal", "ton", "liter", "ekor", "butir"] as const;
export const KATEGORI_BERITA = ["Panen", "Program", "Kunjungan", "Capaian", "Pengumuman"] as const;

export const kelompokSchema = z.object({
  kode_upt: uptOpt,
  nama: z.string().trim().min(2, "Nama kelompok minimal 2 karakter.").max(120),
  jenis_kegiatan: z.enum(JENIS_KEGIATAN).optional(),
  lokasi_id: uuid.optional(),
  pembimbing: opt(150),
  keterangan: opt(500),
});

export const anggotaKelompokSchema = z.object({
  kelompok_id: uuid,
  teks: z.string().trim().min(1, "Tempel minimal satu nomor registrasi.").max(20000),
});
export const hapusAnggotaSchema = z.object({ kelompok_id: uuid, inmate_id: uuid });

export const petugasSchema = z.object({
  kode_upt: uptOpt,
  nama: z.string().trim().min(2, "Nama minimal 2 karakter.").max(150),
  nip: z.string().trim().regex(/^[0-9]{8,24}$/, "NIP berupa angka 8 sampai 24 digit.").optional().or(z.literal("").transform(() => undefined)),
  jabatan: opt(120),
  regu: opt(60),
  tanggal_habituasi: tanggalOpt,
  materi_habituasi: opt(300),
});
export const habituasiSchema = z.object({ id: uuid, tanggal_habituasi: tanggal, materi_habituasi: opt(300) });

export const inventarisSchema = z.object({
  kode_upt: uptOpt,
  golongan: z.enum(GOLONGAN_INVENTARIS, { errorMap: () => ({ message: "Pilih golongan." }) }),
  kategori: opt(80),
  nama: z.string().trim().min(2, "Nama minimal 2 karakter.").max(150),
  kode_inventaris: opt(60),
  jumlah: z.number({ invalid_type_error: "Jumlah wajib diisi." }).int("Jumlah harus bilangan bulat.").min(0).max(1_000_000),
  kondisi: z.enum(KONDISI_INVENTARIS).default("Baik"),
  lokasi_simpan: opt(150),
  keterangan: opt(500),
});
export const kondisiInventarisSchema = z.object({
  id: uuid,
  kondisi: z.enum(KONDISI_INVENTARIS),
  jumlah: z.number().int().min(0).max(1_000_000),
});

export const hapusIndukSchema = z.object({ tabel: z.enum(["kelompok_kerja", "petugas_upt", "inventaris_upt"]), id: uuid });

const persen = z.number().min(0, "Persentase 0 sampai 100.").max(100, "Persentase 0 sampai 100.").optional();
const angka = (max: number) => z.number().min(0, "Tidak boleh negatif.").max(max).optional();

export const kondisiAwalSchema = z
  .object({
    kode_upt: z.string().trim().min(2, "Pilih UPT.").max(40),
    periode_dari: tanggalOpt,
    periode_sampai: tanggalOpt,
    kegiatan_per_bulan: angka(100000),
    pct_catatan_lengkap: persen,
    pct_serah_terima_cocok: persen,
    pct_temuan_tindak_lanjut: persen,
    pct_tindak_lanjut_selesai: persen,
    menit_pelaporan_kejadian: angka(100000),
    gangguan_per_bulan: angka(100000),
    sumber_data: opt(300),
    catatan: opt(1000),
  })
  .superRefine((v, ctx) => {
    if (v.periode_dari && v.periode_sampai && v.periode_sampai < v.periode_dari)
      ctx.addIssue({ code: "custom", path: ["periode_sampai"], message: "Akhir periode tidak boleh sebelum awalnya." });
  });

export const hasilPanganSchema = z.object({
  kode_upt: uptOpt,
  activity_id: uuid.optional(),
  jenis: z.enum(JENIS_KEGIATAN, { errorMap: () => ({ message: "Pilih jenis." }) }),
  komoditas: z.string().trim().min(2, "Komoditas minimal 2 karakter.").max(100),
  tanggal,
  volume: z.number({ invalid_type_error: "Volume wajib diisi." }).min(0, "Volume tidak boleh negatif.").max(1e9),
  satuan: z.enum(SATUAN_PANGAN, { errorMap: () => ({ message: "Pilih satuan." }) }),
  luas_ha: z.number().min(0).max(100000).optional(),
  catatan: opt(500),
});
export const hapusHasilSchema = z.object({ id: uuid });

export const beritaSchema = z.object({
  kode_upt: uptOpt,
  kategori: z.enum(KATEGORI_BERITA, { errorMap: () => ({ message: "Pilih kategori." }) }),
  judul: z.string().trim().min(5, "Judul minimal 5 karakter.").max(200),
  ringkasan: opt(400),
  isi: z.string().trim().min(10, "Isi berita minimal 10 karakter.").max(8000),
  tanggal,
  foto_path: opt(300),
  diterbitkan: z.boolean().default(true),
});
export const hapusBeritaSchema = z.object({ id: uuid });

export const tokenTelegramSchema = z.object({ token: z.string().trim().regex(/^[0-9]{6,14}:[A-Za-z0-9_-]{30,60}$/, "Format token tidak dikenali. Salin utuh dari BotFather.") });
export const pengaturanSchema = z.object({
  latihan: z.boolean(),
  telegram: z.boolean(),
  rekap_jam: z.number().int().min(0).max(23),
});
export const grupTelegramSchema = z
  .object({
    nama: z.string().trim().min(2, "Nama grup minimal 2 karakter.").max(120),
    chat_id: z.string().trim().regex(/^(-?[0-9]{5,20}|@[A-Za-z0-9_]{5,64})$/, "ID obrolan berupa angka (grup biasanya diawali minus) atau @namakanal."),
    tingkat: z.enum(["UPT", "Kanwil", "Direktorat"]),
    kode_upt: uptOpt,
    kanwil_id: uuid.optional(),
    minimal_status: z.enum(["HIJAU", "KUNING", "MERAH", "KRITIS"]).default("KUNING"),
    kirim_rekap: z.boolean().default(true),
    ikut_latihan: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.tingkat === "UPT" && !v.kode_upt) ctx.addIssue({ code: "custom", path: ["kode_upt"], message: "Pilih UPT untuk grup tingkat UPT." });
    if (v.tingkat === "Kanwil" && !v.kanwil_id) ctx.addIssue({ code: "custom", path: ["kanwil_id"], message: "Pilih Kanwil untuk grup tingkat Kanwil." });
  });
export const idGrupSchema = z.object({ id: uuid });
export const aktifGrupSchema = z.object({ id: uuid, aktif: z.boolean() });
