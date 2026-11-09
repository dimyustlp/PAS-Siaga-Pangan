"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import {
  accountCreateSchema,
  accountDeleteSchema,
  accountUpdateSchema,
  kanwilSchema,
  passwordResetSchema,
  uptSchema,
} from "@/lib/validations/admin";
import { isUniqueViolation, mapDbError } from "@/lib/errors";
import { kanwilTautanSchema } from "@/lib/validations/berkas";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const DITOLAK = "Hanya Administrator yang dapat melakukan tindakan ini.";

/** Pesan dari fungsi database kita berbahasa Indonesia dan boleh ditampilkan; galat teknis Postgres tidak. */
function pesanRpc(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? "").trim();
  if (m && !/violates|duplicate key|row-level security|permission denied|syntax|function public\./i.test(m) && /^[A-Z]/.test(m)) return m;
  return mapDbError(error, DITOLAK);
}

/** Membuat akun baru (tanpa kunci layanan: fungsi database yang menulis ke sistem login). */
export async function createAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = accountCreateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const p = parsed.data;

  const { data, error } = await auth.supabase.rpc("admin_buat_akun", {
    p_email: p.email,
    p_password: p.password,
    p_nama: p.nama,
    p_nip: p.nip ?? null,
    p_role: p.role,
    p_kode_upt: p.kode_upt ?? null,
    p_kanwil: p.kanwil_id ?? null,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  revalidatePath("/admin/akun");
  revalidatePath("/admin/audit");
  return success({ id: data as string });
}

/** Mengubah peran, status aktif, UPT, NIP, atau Kanwil sebuah akun. Setiap perubahan masuk jejak audit. */
export async function updateAccount(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = accountUpdateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, nama, email, ...rest } = parsed.data;

  if (nama !== undefined && email !== undefined) {
    const { error: eIdent } = await auth.supabase.rpc("admin_ubah_akun", { p_id: id, p_nama: nama, p_email: email });
    if (eIdent) return fail(pesanRpc(eIdent));
  }

  const fields: TablesUpdate<"profiles"> = {};
  if (rest.role !== undefined) fields.role = rest.role;
  if (rest.is_active !== undefined) fields.is_active = rest.is_active;
  if (rest.kode_upt !== undefined) fields.kode_upt = rest.kode_upt;
  if (rest.nip !== undefined) fields.nip = rest.nip;
  if (rest.kanwil_id !== undefined) fields.kanwil_id = rest.kanwil_id;
  if (Object.keys(fields).length === 0) {
    revalidatePath("/admin/akun");
    return nama !== undefined ? success() : fail("Tidak ada yang diubah.");
  }

  const { data, error } = await auth.supabase.from("profiles").update(fields).eq("id", id).select("id");
  if (error) {
    if (isUniqueViolation(error)) return fail("NIP ini sudah dipakai akun lain.");
    return fail(mapDbError(error, DITOLAK));
  }
  if (!data || data.length === 0) return fail("Akun tidak ditemukan.");
  revalidatePath("/admin/akun");
  revalidatePath("/admin/audit");
  return success();
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { error } = await auth.supabase.rpc("admin_atur_kata_sandi", { p_user: parsed.data.id, p_password: parsed.data.password });
  if (error) return fail(mapDbError(error, DITOLAK));
  revalidatePath("/admin/audit");
  return success();
}

export async function createKanwil(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = kanwilSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.from("master_kanwil").insert(parsed.data);
  if (error) {
    if (isUniqueViolation(error)) return fail("Kode Kanwil sudah dipakai.");
    return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/admin/wilayah");
  return success();
}

export async function createUpt(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = uptSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase
    .from("master_upt")
    .insert({ ...parsed.data, jenis: parsed.data.jenis ?? null, kanwil_id: parsed.data.kanwil_id ?? null });
  if (error) {
    if (isUniqueViolation(error)) return fail("Kode UPT sudah dipakai.");
    return fail(mapDbError(error, DITOLAK));
  }
  revalidatePath("/admin/wilayah");
  return success();
}

/** Menghapus akun. Akun yang sudah punya catatan di sistem ditolak database (jejak audit); sarankan nonaktifkan. */
export async function deleteAccount(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = accountDeleteSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.rpc("admin_hapus_akun", { p_id: parsed.data.id });
  if (error) return fail(pesanRpc(error));
  revalidatePath("/admin/akun");
  revalidatePath("/admin/audit");
  return success();
}

/** Mengatur tautan Google Form dan folder Drive penampung berkas sebuah Kanwil. */
export async function updateKanwilTautan(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = kanwilTautanSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, tautan_form, tautan_folder } = parsed.data;
  const { data, error } = await auth.supabase.from("master_kanwil").update({ tautan_form, tautan_folder }).eq("id", id).select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Kanwil tidak ditemukan.");
  revalidatePath("/admin/wilayah");
  revalidatePath("/berkas");
  return success();
}
