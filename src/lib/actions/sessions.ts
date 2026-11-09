"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, storageObjectExists, success, zodFail, type ActionResult } from "./_shared";
import { activitySchema, documentKindSchema, sessionSchema, sessionUpdateSchema } from "@/lib/validations/planning";
import { isSafeStoragePath } from "@/lib/validations/storage";
import { isUniqueViolation, mapDbError } from "@/lib/errors";
import { z } from "zod";

const DITOLAK = "Hanya Operator UPT yang dapat menyiapkan kegiatan, dan sesi yang sudah disetujui tidak bisa diubah lagi.";

function refresh() {
  revalidatePath("/");
  revalidatePath("/kegiatan");
  revalidatePath("/keputusan");
}

/** Rencana kegiatan jangka panjang. Kode kegiatan dibuat otomatis oleh database: [KODE_UPT]-[YYYYMMDD]-[URUT]. */
export async function createActivity(input: unknown): Promise<ActionResult<{ id: string; kode_kegiatan: string }>> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase
    .from("activities")
    // kode_kegiatan kosong sengaja dikirim: pemicu database mengisinya.
    .insert({ ...parsed.data, kode_kegiatan: "" })
    .select("id,kode_kegiatan")
    .single();
  if (error) return fail(mapDbError(error, DITOLAK));
  refresh();
  return success({ id: data.id, kode_kegiatan: data.kode_kegiatan });
}

/** Sesi harian (Form Persiapan). Status awal selalu Menunggu dan HIJAU, dipaksa oleh database. */
export async function createSession(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase.from("daily_sessions").insert(parsed.data).select("id").single();
  if (error) {
    if (isUniqueViolation(error, "daily_sessions_unik")) return fail("Sesi untuk kegiatan dan tanggal ini sudah ada.");
    return fail(mapDbError(error, DITOLAK));
  }
  refresh();
  return success({ id: data.id });
}

/** Mengubah isian sesi selama masih Menunggu, Perbaiki Dulu, atau Ditunda. */
export async function updateSession(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = sessionUpdateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { session_id, ...fields } = parsed.data;
  const { data, error } = await auth.supabase.from("daily_sessions").update(fields).eq("id", session_id).select("id");
  if (error) {
    if (isUniqueViolation(error, "daily_sessions_unik")) return fail("Sesi untuk kegiatan dan tanggal ini sudah ada.");
    return fail(mapDbError(error, DITOLAK));
  }
  if (!data || data.length === 0) return fail("Sesi tidak ditemukan atau sudah tidak bisa diubah pada statusnya sekarang.");
  refresh();
  return success();
}

/** Setelah memperbaiki sesi berstatus Perbaiki Dulu atau Ditunda, Operator mengajukan ulang ke Kepala Pengamanan. */
export async function resubmitSession(sessionId: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const id = z.string().uuid().safeParse(sessionId);
  if (!id.success) return fail("Sesi tidak valid.");

  const { data, error } = await auth.supabase
    .from("daily_sessions")
    .update({ status_kesiapan: "Menunggu" })
    .eq("id", id.data)
    .in("status_kesiapan", ["Perbaiki Dulu", "Ditunda"])
    .select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Sesi tidak ditemukan atau tidak sedang berstatus Perbaiki Dulu atau Ditunda.");
  refresh();
  return success();
}

/**
 * Menautkan dokumen yang sudah diunggah ke bucket pas-siaga-documents.
 * Unggah dilakukan langsung dari browser ke Storage (menghindari batas ukuran permintaan server),
 * lalu alamatnya dicatat di sini setelah diperiksa.
 */
export async function attachSessionDocument(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = z
    .object({ session_id: z.string().uuid(), jenis: documentKindSchema, path: z.string() })
    .safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { session_id, jenis, path } = parsed.data;

  if (!isSafeStoragePath(path, session_id)) return fail("Alamat berkas tidak valid untuk sesi ini.");
  if (!(await storageObjectExists(auth.supabase, "pas-siaga-documents", path))) {
    return fail("Berkas belum ditemukan di penyimpanan. Unggah ulang lalu coba lagi.");
  }

  const perubahan =
    jenis === "surat_perintah" ? { dokumen_surat_perintah: path } : { dokumen_rencana_pengamanan: path };
  const { data, error } = await auth.supabase.from("daily_sessions").update(perubahan).eq("id", session_id).select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Sesi tidak ditemukan atau sudah tidak bisa diubah pada statusnya sekarang.");
  refresh();
  return success();
}
