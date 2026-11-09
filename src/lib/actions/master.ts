"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { inmateSchema, locationSchema } from "@/lib/validations/planning";
import { isUniqueViolation, mapDbError } from "@/lib/errors";

const DITOLAK = "Hanya Operator UPT yang dapat mengelola data induk.";

export async function createLocation(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase.from("master_locations").insert(parsed.data).select("id").single();
  if (error) {
    if (isUniqueViolation(error)) return fail("Kode lokasi sudah dipakai.");
    return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/kegiatan");
  return success({ id: data.id });
}

export async function createInmate(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = inmateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase.from("master_inmates").insert(parsed.data).select("id").single();
  if (error) {
    if (isUniqueViolation(error)) return fail("Nomor registrasi sudah terdaftar.");
    return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/kegiatan");
  return success({ id: data.id });
}
