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

export const locationSchema = z.object({
  nama: z.string().trim().min(1, "Nama lokasi wajib diisi.").max(150),
  kode: opt(40),
  keterangan: opt(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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
  interval_pemeriksaan: z.number().int().min(5, "Minimal 5 menit.").max(480, "Maksimal 480 menit."),
  pakai_gelang_monitor: z.boolean(),
};

export const sessionSchema = z.object({ activity_id: z.string().uuid("Pilih kegiatan."), ...sessionFields });

export const sessionUpdateSchema = z.object({ session_id: z.string().uuid(), ...sessionFields });

export const documentKindSchema = z.enum(["surat_perintah", "rencana_pengamanan"]);

export type LocationInput = z.input<typeof locationSchema>;
export type InmateInput = z.input<typeof inmateSchema>;
export type ActivityInput = z.input<typeof activitySchema>;
export type SessionInput = z.input<typeof sessionSchema>;
export type SessionUpdateInput = z.input<typeof sessionUpdateSchema>;
