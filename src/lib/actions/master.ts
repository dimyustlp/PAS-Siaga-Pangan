"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { inmateSchema, locationSchema } from "@/lib/validations/planning";
import { isUniqueViolation, mapDbError } from "@/lib/errors";

const DITOLAK = "Hanya Administrator atau Operator UPT yang dapat mengelola data induk.";

export async function createLocation(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase.from("master_locations").insert(parsed.data).select("id").single();
  if (error) {
    if (isUniqueViolation(error)) return fail("Kode lokasi sudah dipakai.");
    return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/kegiatan");
  revalidatePath("/admin/data-induk");
  return success({ id: data.id });
}

export async function createInmate(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = inmateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase.from("master_inmates").insert(parsed.data).select("id").single();
  if (error) {
    if (isUniqueViolation(error)) return fail("Nomor registrasi sudah terdaftar.");
    return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/kegiatan");
  revalidatePath("/admin/data-induk");
  return success({ id: data.id });
}

/** Impor banyak WB sekaligus (satu per baris: nomor registrasi dan nama). Baris yang sudah terdaftar dilewati. */
export async function importInmates(input: unknown): Promise<ActionResult<{ ditambah: number; dilewati: number; salah: string[] }>> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const teks = typeof (input as { teks?: unknown })?.teks === "string" ? (input as { teks: string }).teks : "";
  const baris = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
  if (baris.length === 0) return fail("Tempel minimal satu baris data.");
  if (baris.length > 1000) return fail("Maksimal 1000 baris per impor.");

  const valid: { nomor_registrasi: string; nama: string }[] = [];
  const salah: string[] = [];
  const lihat = new Set<string>();
  for (const b of baris) {
    const bagian = b.split(/[\t;|,]/).map((x) => x.trim());
    const p = inmateSchema.safeParse({ nomor_registrasi: bagian[0], nama: bagian.slice(1).join(" ") });
    if (!p.success || lihat.has(p.data.nomor_registrasi)) salah.push(b);
    else {
      lihat.add(p.data.nomor_registrasi);
      valid.push(p.data);
    }
  }
  if (valid.length === 0) return fail(`Tidak ada baris yang valid. Format: nomor registrasi, lalu nama (dipisah koma, titik koma, atau tab).`);

  const { data: ada } = await auth.supabase.from("master_inmates").select("nomor_registrasi").in("nomor_registrasi", valid.map((v) => v.nomor_registrasi));
  const sudah = new Set((ada ?? []).map((a) => a.nomor_registrasi));
  const baru = valid.filter((v) => !sudah.has(v.nomor_registrasi));
  if (baru.length > 0) {
    const { error } = await auth.supabase.from("master_inmates").insert(baru);
    if (error) return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/kegiatan");
  revalidatePath("/admin/data-induk");
  return success({ ditambah: baru.length, dilewati: valid.length - baru.length, salah: salah.slice(0, 5) });
}
