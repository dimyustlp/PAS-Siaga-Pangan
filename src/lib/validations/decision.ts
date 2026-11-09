import { z } from "zod";

// Validasi keputusan Kepala Pengamanan. Aturan alurnya sendiri dijaga di database.

const sessionId = z.string().uuid("session_id harus berupa UUID.");

export const readinessDecisionSchema = z
  .object({
    session_id: sessionId,
    keputusan: z.enum(["Dapat Dimulai", "Perbaiki Dulu", "Ditunda"]),
    catatan: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.keputusan === "Dapat Dimulai" || (v.catatan ?? "").length > 0, {
    path: ["catatan"],
    message: "Catatan wajib diisi untuk keputusan Perbaiki Dulu atau Ditunda.",
  });

export const verifyIncidentSchema = z.object({
  session_id: sessionId,
  incident_id: z.string().uuid("incident_id harus berupa UUID."),
  catatan: z.string().trim().min(3, "Catatan verifikasi wajib diisi.").max(1000),
});

export const lowerStatusSchema = z.object({
  session_id: sessionId,
  /** Alamat foto bukti di bucket pas-siaga-evidence, pola: {session_id}/{nama_berkas}. */
  bukti_path: z.string().min(1, "Foto bukti pemulihan keadaan wajib diunggah.").max(300),
  catatan: z.string().trim().max(1000).optional(),
});

export const closeSessionSchema = z.object({ session_id: sessionId });

export type ReadinessDecisionInput = z.input<typeof readinessDecisionSchema>;
export type VerifyIncidentInput = z.input<typeof verifyIncidentSchema>;
export type LowerStatusInput = z.input<typeof lowerStatusSchema>;
