import { z } from "zod";

// Validasi data persiapan: lokasi, warga binaan, kegiatan, sesi harian (peran Operator).

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus TTTT-BB-HH.")
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Tanggal tidak valid.");

/**
 * Membaca titik koordinat yang ditempel dari Google Maps ("-6.2995, 106.5960" atau "-6,2995 106,5960").
 * Hanya menerima titik di wilayah Indonesia. Kosong = tidak diisi.
 */
export function bacaTitik(v: string | undefined | null): { lat: number; lng: number } | null | "salah" {
  const t = (v ?? "").trim();
  if (!t) return null;
  const angka = t.match(/-?\d+(?:[.,]\d+)?/g);
  if (!angka || angka.length !== 2) return "salah";
  // Koma desimal hanya bila pemisahnya spasi; "x, y" dianggap pemisah koma.
  const [a, b] = angka.map((x) => Number(x.replace(",", ".")));
  if (!(a >= -11 && a <= 7 && b >= 94 && b <= 142)) return "salah";
  return { lat: Math.round(a * 1e6) / 1e6, lng: Math.round(b * 1e6) / 1e6 };
}

export const POSISI_LOKASI = ["Dalam UPT", "Luar UPT"] as const;

export const locationSchema = z
  .object({
    nama: z.string().trim().min(1, "Nama lokasi wajib diisi.").max(150),
    kode: opt(40),
    keterangan: opt(500),
    posisi: z.enum(POSISI_LOKASI, { errorMap: () => ({ message: "Pilih lokasi di dalam atau di luar UPT." }) }).default("Dalam UPT"),
    titik: z.string().trim().max(80).optional(),
    luas_ha: z.number().min(0).max(100000).optional(),
    kode_upt: opt(40),
    jenis_lahan: opt(60),
    status_lahan: z.enum(["Milik UPT", "Pinjam pakai", "Kerja sama", "Lainnya"]).optional(),
    komoditas_utama: opt(120),
    jarak_km: z.number().min(0).max(100000).optional(),
    daya_tampung_wbp: z.number().int().min(0).max(100000).optional(),
    pj_lokasi: opt(150),
  })
  .superRefine((v, ctx) => {
    if (bacaTitik(v.titik) === "salah") ctx.addIssue({ code: "custom", path: ["titik"], message: "Titik tidak terbaca. Tempel dari Google Maps, contoh: -6.2995, 106.5960" });
    if (v.posisi === "Luar UPT" && !bacaTitik(v.titik)) ctx.addIssue({ code: "custom", path: ["titik"], message: "Lokasi di luar UPT wajib diberi titik koordinat agar tampil di peta." });
  })
  .transform(({ titik, ...rest }) => {
    const t = bacaTitik(titik);
    return { ...rest, latitude: t && t !== "salah" ? t.lat : undefined, longitude: t && t !== "salah" ? t.lng : undefined };
  });

export const titikUptSchema = z
  .object({ kode: z.string().trim().min(2).max(30), titik: z.string().trim().min(3, "Isi titik koordinat.").max(80) })
  .superRefine((v, ctx) => {
    const t = bacaTitik(v.titik);
    if (!t || t === "salah") ctx.addIssue({ code: "custom", path: ["titik"], message: "Titik tidak terbaca. Tempel dari Google Maps, contoh: -6.2995, 106.5960" });
  });

export const inmateSchema = z.object({
  nomor_registrasi: z.string().trim().min(1, "Nomor registrasi wajib diisi.").max(40),
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(150),
});

export const activitySchema = z
  .object({
    jenis_kegiatan: z.enum(["Pertanian", "Peternakan", "Perikanan"]),
    lokasi_id: z.string().uuid("Pilih lokasi."),
    tanggal_mulai: tanggal,
    rencana_berakhir: tanggal.optional(),
    luas_lahan_ha: z.number().min(0, "Tidak boleh negatif.").max(100000).optional(),
    batas_area: opt(500),
    rute: opt(500),
    titik_komunikasi: opt(500),
    akses_warga: opt(500),
    nomor_persetujuan: opt(120),
    nomor_surat_perintah: opt(120),
  })
  .refine((v) => !v.rencana_berakhir || v.rencana_berakhir >= v.tanggal_mulai, {
    path: ["rencana_berakhir"],
    message: "Rencana berakhir tidak boleh sebelum tanggal mulai.",
  });

const sessionFields = {
  tanggal_sesi: tanggal,
  petugas_ids: z
    .array(z.string().uuid())
    .min(1, "Pilih minimal satu pengawal.")
    .max(20, "Maksimal 20 pengawal.")
    .refine((a) => new Set(a).size === a.length, "Ada pengawal yang dipilih dua kali."),
  jumlah_narapidana: z.number().int("Isi dengan bilangan bulat.").min(0).max(10_000),
  jumlah_alat_kerja: z.number().int("Isi dengan bilangan bulat.").min(0).max(10_000),
  rincian_alat: opt(1000),
  bimker_penanggung_jawab: opt(150),
  petugas_blok: opt(150),
  petugas_p2u: opt(150),
  interval_pemeriksaan: z.number().int().min(5, "Minimal 5 menit.").max(480, "Maksimal 480 menit."),
  pakai_gelang_monitor: z.boolean(),
};

export const sessionSchema = z.object({ activity_id: z.string().uuid("Pilih kegiatan."), ...sessionFields });

export const sessionUpdateSchema = z.object({ session_id: z.string().uuid(), ...sessionFields });

export const readinessItemSchema = z.object({
  session_id: z.string().uuid(),
  kode: z.enum(["a", "b", "c", "d", "e", "f"]),
  terpenuhi: z.boolean(),
  catatan: opt(500),
});

export const nominatifSchema = z.object({
  session_id: z.string().uuid(),
  inmate_ids: z.array(z.string().uuid()).max(2000, "Terlalu banyak warga binaan."),
});

/** Enam indikator kesiapan menurut RPP (alur keputusan operasional). Indikator f hanya berlaku bila sesi memakai gelang monitor. */
export const INDIKATOR_KESIAPAN: { kode: "a" | "b" | "c" | "d" | "e" | "f"; judul: string; uraian: string }[] = [
  { kode: "a", judul: "Persetujuan dan penugasan", uraian: "Persetujuan dan penugasan telah tercatat, serta petugas memahami peran dan batas kewenangannya." },
  { kode: "b", judul: "Nominatif dan rencana pergerakan", uraian: "Daftar nominatif, identitas, jumlah WB, dan rencana pergerakan telah diperiksa dan sesuai." },
  { kode: "c", judul: "Lokasi, akses, rute, dan komunikasi", uraian: "Lokasi, akses, batas area, rute, waktu, titik komunikasi, dan sarana pendukung telah diketahui petugas." },
  { kode: "d", judul: "Alat kerja", uraian: "Alat kerja telah diperiksa dan mekanisme pengembalian serta penyimpanannya telah ditetapkan." },
  { kode: "e", judul: "Sarana komunikasi dan log manual", uraian: "Sarana komunikasi berfungsi dan log manual tersedia apabila jaringan atau dasbor tidak dapat digunakan." },
  { kode: "f", judul: "Gelang pemantau", uraian: "Gelang pemantau, apabila ditetapkan, berfungsi dan penggunaannya telah dicatat sesuai ketentuan." },
];

export const documentKindSchema = z.enum(["surat_perintah", "rencana_pengamanan"]);

export type LocationInput = z.input<typeof locationSchema>;
export type InmateInput = z.input<typeof inmateSchema>;
export type ActivityInput = z.input<typeof activitySchema>;
export type SessionInput = z.input<typeof sessionSchema>;
export type SessionUpdateInput = z.input<typeof sessionUpdateSchema>;
