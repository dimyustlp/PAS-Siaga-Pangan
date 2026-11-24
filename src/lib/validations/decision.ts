import { z } from "zod";

// Validasi keputusan Kepala Pengamanan. Aturan alurnya sendiri dijaga di database.

const sessionId = z.string().uuid("session_id harus berupa UUID.");

export const readinessDecisionSchema = z
  .object({
    session_id: sessionId,
    keputusan: z.enum(["Dapat Dimulai", "Perbaiki Dulu", "Ditunda"]),
    catatan: z.string().trim().max(1000).optional(),
    /** Syarat yang harus dipenuhi sebelum kegiatan dapat diajukan kembali (wajib untuk Ditunda). */
    syarat_pengajuan_ulang: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.keputusan === "Dapat Dimulai" || (v.catatan ?? "").length > 0, {
    path: ["catatan"],
    message: "Alasan wajib diisi untuk keputusan Perbaiki Dulu atau Ditunda.",
  })
  .refine((v) => v.keputusan !== "Ditunda" || (v.syarat_pengajuan_ulang ?? "").length > 0, {
    path: ["syarat_pengajuan_ulang"],
    message: "Syarat pengajuan ulang wajib diisi untuk keputusan Ditunda.",
  });

export const verifyIncidentSchema = z.object({
  session_id: sessionId,
  incident_id: z.string().uuid("incident_id harus berupa UUID."),
  catatan: z.string().trim().min(3, "Catatan verifikasi wajib diisi.").max(1000),
});

export const lowerStatusSchema = z.object({
  session_id: sessionId,
  /** Penurunan dilakukan bertahap. Bila kosong, dianggap turun ke HIJAU. */
  status_baru: z.enum(["HIJAU", "KUNING", "MERAH"]).optional(),
  /** Alamat foto bukti di bucket pas-siaga-evidence, pola: {session_id}/{nama_berkas}. */
  bukti_path: z.string().min(1, "Foto bukti pemulihan keadaan wajib diunggah.").max(300),
  catatan: z.string().trim().min(3, "Alasan penurunan status wajib dicatat.").max(1000),
});

export const directiveSchema = z.object({
  session_id: sessionId,
  catatan: z.string().trim().min(3, "Isi arahan tindakan wajib dicatat.").max(1000),
});

export const closeSessionSchema = z.object({ session_id: sessionId });

export type ReadinessDecisionInput = z.input<typeof readinessDecisionSchema>;
export type VerifyIncidentInput = z.input<typeof verifyIncidentSchema>;
export type LowerStatusInput = z.input<typeof lowerStatusSchema>;
