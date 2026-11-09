"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, storageObjectExists, success, zodFail, type ActionResult } from "./_shared";
import { createBerkasSchema, deleteBerkasSchema } from "@/lib/validations/berkas";
import { mapDbError } from "@/lib/errors";

const DITOLAK = "Berkas ditolak: Anda hanya bisa mengelola berkas untuk UPT Anda sendiri.";
const BUCKET = "pas-siaga-berkas";

/** Mencatat berkas: hasil unggahan langsung ke Storage, atau tautan (mis. folder Google Drive hasil Google Form). */
export async function createBerkas(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator", "kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = createBerkasSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const p = parsed.data;

  if (p.sumber === "unggah" && !(await storageObjectExists(auth.supabase, BUCKET, p.path!))) {
    return fail("Berkas belum ditemukan di penyimpanan. Unggah ulang, lalu simpan.");
  }

  const { error } = await auth.supabase.from("berkas").insert({
    kode_upt: p.kode_upt,
    kategori: p.kategori,
    judul: p.judul,
    keterangan: p.keterangan ?? null,
    tanggal: p.tanggal,
    sumber: p.sumber,
    storage_path: p.sumber === "unggah" ? p.path! : null,
    nama_berkas: p.nama_berkas ?? null,
    ukuran_byte: p.ukuran_byte ?? null,
    mime: p.mime ?? null,
    tautan: p.sumber === "tautan" ? p.tautan! : null,
    diunggah_oleh: auth.userId,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  revalidatePath("/berkas");
  return success();
}

export async function deleteBerkas(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = deleteBerkasSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data: baris } = await auth.supabase.from("berkas").select("id,sumber,storage_path").eq("id", parsed.data.id).maybeSingle();
  if (!baris) return fail("Berkas tidak ditemukan atau bukan milik UPT Anda.");

  const { error } = await auth.supabase.from("berkas").delete().eq("id", baris.id);
  if (error) return fail(mapDbError(error, DITOLAK));
  if (baris.sumber === "unggah" && baris.storage_path) await auth.supabase.storage.from(BUCKET).remove([baris.storage_path]);
  revalidatePath("/berkas");
  return success();
}
