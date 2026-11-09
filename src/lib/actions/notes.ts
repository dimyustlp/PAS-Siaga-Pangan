"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { riskUpdateSchema, weeklyNoteSchema } from "@/lib/validations/admin";
import { mapDbError } from "@/lib/errors";

/** Catatan kendala mingguan UPT (dasar evaluasi per minggu). */
export async function addWeeklyNote(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator", "kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = weeklyNoteSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.from("weekly_notes").insert({
    minggu_mulai: parsed.data.minggu_mulai,
    kendala: parsed.data.kendala,
    tindak_lanjut: parsed.data.tindak_lanjut ?? null,
  });
  if (error) return fail(mapDbError(error));
  revalidatePath("/evaluasi");
  return success();
}

export async function updateRisk(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = riskUpdateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data, error } = await auth.supabase
    .from("risk_register")
    .update({ status: parsed.data.status, catatan: parsed.data.catatan ?? null })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(mapDbError(error));
  if (!data || data.length === 0) return fail("Risiko tidak ditemukan.");
  revalidatePath("/risiko");
  return success();
}
