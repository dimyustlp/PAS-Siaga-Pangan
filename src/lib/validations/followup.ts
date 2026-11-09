import { z } from "zod";

const sessionId = z.string().uuid("session_id harus berupa UUID.");

export const SUMBER_TINDAK_LANJUT = ["Gangguan", "Status keamanan", "Kesiapan", "Alarm gelang", "Evaluasi", "Lainnya"] as const;

/** Tindak lanjut selalu punya penanggung jawab dan tenggat (RPP: tidak ada tindak lanjut tanpa pemilik). */
export const followUpCreateSchema = z.object({
  session_id: sessionId,
  incident_id: z.string().uuid().optional(),
  sumber: z.enum(SUMBER_TINDAK_LANJUT),
  uraian: z.string().trim().min(3, "Uraian tindak lanjut wajib diisi.").max(1000),
  penanggung_jawab_id: z.string().uuid().optional(),
  /** Boleh kosong bila penanggung jawab dipilih dari daftar akun; namanya diisi dari profil. */
  penanggung_jawab_nama: z.string().trim().max(150).optional().transform((v) => (v ? v : undefined)),
  tenggat: z.string().datetime({ offset: true, message: "Tenggat tidak valid." }),
  pemeriksaan_ulang_at: z.string().datetime({ offset: true }).optional(),
});

export const followUpCreateRefined = followUpCreateSchema.refine((v) => !!v.penanggung_jawab_id || !!v.penanggung_jawab_nama, {
  path: ["penanggung_jawab_nama"],
  message: "Penanggung jawab wajib diisi: pilih akun atau tulis namanya.",
});

export const followUpProgressSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Dikerjakan", "Selesai"]),
  catatan_selesai: z.string().trim().max(1000).optional(),
  bukti_path: z.string().max(300).optional(),
});

export const followUpVerifySchema = z.object({
  id: z.string().uuid(),
  hasil: z.string().trim().min(3, "Hasil pemeriksaan wajib dicatat.").max(1000),
});

export type FollowUpCreateInput = z.input<typeof followUpCreateSchema>;
