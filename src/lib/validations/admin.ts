import { z } from "zod";

const opt = (max: number) =>
  z.string().trim().max(max, `Maksimal ${max} karakter.`).optional().transform((v) => (v ? v : undefined));

export const ROLE_VALUES = ["administrator", "operator", "pengawal", "kepala_pengamanan", "pemantau_kanwil", "pemantau_pusat"] as const;

export const accountCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Kata sandi maksimal 72 karakter."),
  nama: z.string().trim().min(1, "Nama lengkap wajib diisi.").max(150),
  nip: opt(30),
  role: z.enum(ROLE_VALUES),
  kode_upt: opt(30),
  kanwil_id: z.string().uuid().optional(),
});

export const accountUpdateSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(ROLE_VALUES).optional(),
  is_active: z.boolean().optional(),
  kode_upt: opt(30),
  nip: opt(30),
  kanwil_id: z.string().uuid().nullable().optional(),
});

export const passwordResetSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Kata sandi maksimal 72 karakter."),
});

const kode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,30}$/, "Kode 2–30 huruf besar atau angka, tanpa spasi.");

export const kanwilSchema = z.object({ kode, nama: z.string().trim().min(3, "Nama wajib diisi.").max(200) });
export const uptSchema = z.object({
  kode,
  nama: z.string().trim().min(3, "Nama wajib diisi.").max(200),
  jenis: opt(80),
  kanwil_id: z.string().uuid().optional(),
});

export const weeklyNoteSchema = z.object({
  minggu_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  kendala: z.string().trim().min(3, "Kendala wajib diisi.").max(2000),
  tindak_lanjut: opt(2000),
});

export const riskUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Dipantau", "Terjadi", "Terkendali"]),
  catatan: opt(1000),
});
