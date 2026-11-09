"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, storageObjectExists, success, zodFail, type ActionResult, type ServerClient } from "./_shared";
import {
  closeSessionSchema,
  lowerStatusSchema,
  readinessDecisionSchema,
  verifyIncidentSchema,
} from "@/lib/validations/decision";
import { isSafeStoragePath } from "@/lib/validations/storage";
import { mapDbError } from "@/lib/errors";
import { parseRekonsiliasi, type Rekonsiliasi } from "@/lib/domain/reconciliation";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { z } from "zod";

const DITOLAK = "Keputusan ditolak: hanya Kepala Pengamanan yang dapat memutuskan, dan sesi harus dalam keadaan yang sesuai.";

function refresh() {
  revalidatePath("/");
  revalidatePath("/keputusan");
  revalidatePath("/kegiatan");
  revalidatePath("/lapangan");
}

/**
 * Semua aturan alur (dokumen lengkap, gangguan terverifikasi, bukti foto, rekonsiliasi penutupan)
 * dijaga oleh pemicu di database. Pesan penolakannya berbahasa Indonesia dan diteruskan ke pengguna.
 */
async function insertDecision(supabase: ServerClient, row: TablesInsert<"decisions">): Promise<ActionResult> {
  const { error } = await supabase.from("decisions").insert(row);
  if (error) return fail(mapDbError(error, DITOLAK));
  refresh();
  return success();
}

/** Dapat Dimulai, Perbaiki Dulu, atau Ditunda. */
export async function decideReadiness(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = readinessDecisionSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  return insertDecision(auth.supabase, {
    session_id: parsed.data.session_id,
    jenis_keputusan: parsed.data.keputusan,
    catatan_keputusan: parsed.data.catatan || null,
  });
}

/** Menyatakan satu gangguan sudah dipulihkan dan diverifikasi. */
export async function verifyIncident(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = verifyIncidentSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  return insertDecision(auth.supabase, {
    session_id: parsed.data.session_id,
    jenis_keputusan: "Verifikasi Gangguan",
    incident_id: parsed.data.incident_id,
    catatan_keputusan: parsed.data.catatan,
  });
}

/**
 * Menurunkan status keamanan ke HIJAU. Wajib ada foto bukti dan semua gangguan sudah terverifikasi.
 * Foto diunggah langsung dari browser ke bucket pas-siaga-evidence, alamatnya dikirim ke sini.
 */
export async function lowerSecurityStatus(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = lowerStatusSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { session_id, bukti_path, catatan } = parsed.data;

  if (!isSafeStoragePath(bukti_path, session_id)) return fail("Alamat foto bukti tidak valid untuk sesi ini.");
  if (!(await storageObjectExists(auth.supabase, "pas-siaga-evidence", bukti_path))) {
    return fail("Foto bukti belum ditemukan di penyimpanan. Unggah ulang lalu coba lagi.");
  }

  return insertDecision(auth.supabase, {
    session_id,
    jenis_keputusan: "Penurunan Status",
    bukti_url: bukti_path,
    catatan_keputusan: catatan || null,
  });
}

/** Menutup kegiatan. Ditolak otomatis bila rekonsiliasi belum cocok. */
export async function closeSession(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = closeSessionSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  return insertDecision(auth.supabase, { session_id: parsed.data.session_id, jenis_keputusan: "Tutup Kegiatan" });
}

/** Cek syarat penutupan tanpa menutup (untuk menampilkan alasan di dasbor). */
export async function checkReconciliation(sessionId: unknown): Promise<ActionResult<Rekonsiliasi>> {
  const auth = await authorize(["operator", "kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const id = z.string().uuid().safeParse(sessionId);
  if (!id.success) return fail("Sesi tidak valid.");

  const { data, error } = await auth.supabase.rpc("rekonsiliasi_sesi", { p_session: id.data });
  if (error) return fail(mapDbError(error));
  const rek = parseRekonsiliasi(data);
  if (!rek) return fail("Hasil rekonsiliasi tidak terbaca.");
  return success(rek);
}
