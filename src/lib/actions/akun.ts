"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import { ROLE_VALUES } from "@/lib/validations/admin";

const PENGELOLA = ["administrator", "pemantau_pusat", "pemantau_kanwil"] as const;

function pesan(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? "").trim();
  if (m && /^[A-Z]/.test(m) && !/violates|duplicate key|row-level security|permission denied|syntax|function public\./i.test(m)) return m;
  return mapDbError(error, "Anda tidak berwenang atas akun ini.");
}

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

const buatSchema = z.object({
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72),
  nama: z.string().trim().min(1, "Nama lengkap wajib diisi.").max(150),
  nip: opt(30),
  role: z.enum(ROLE_VALUES),
  kode_upt: opt(30),
  kanwil_id: z.string().uuid().optional(),
});

/** Membuat akun sesuai wewenang: Pusat (Kanwil dan UPT), Kanwil (UPT pada wilayahnya), Administrator (semua). */
export async function buatAkun(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize([...PENGELOLA]);
  if (!auth.ok) return fail(auth.error);
  const p = buatSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { data, error } = await auth.supabase.rpc("kelola_buat_akun", {
    p_email: p.data.email,
    p_password: p.data.password,
    p_nama: p.data.nama,
    p_nip: p.data.nip ?? null,
    p_role: p.data.role,
    p_kode_upt: p.data.kode_upt ?? null,
    p_kanwil: p.data.kanwil_id ?? null,
  });
  if (error) return fail(pesan(error));
  revalidatePath("/akun");
  return success({ id: data as string });
}

const ubahSchema = z.object({
  id: z.string().uuid(),
  nama: opt(150),
  nip: z.string().trim().max(30).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  kode_upt: opt(30),
  kanwil_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});

export async function ubahAkun(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENGELOLA]);
  if (!auth.ok) return fail(auth.error);
  const p = ubahSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await auth.supabase.rpc("kelola_ubah_akun", {
    p_id: p.data.id,
    p_nama: p.data.nama ?? null,
    p_nip: p.data.nip ?? null,
    p_role: p.data.role ?? null,
    p_kode_upt: p.data.kode_upt ?? null,
    p_kanwil: p.data.kanwil_id ?? null,
    p_aktif: p.data.is_active ?? null,
  });
  if (error) return fail(pesan(error));
  revalidatePath("/akun");
  return success();
}

export async function aturSandi(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENGELOLA]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id: z.string().uuid(), password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72) }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await auth.supabase.rpc("kelola_atur_kata_sandi", { p_id: p.data.id, p_password: p.data.password });
  if (error) return fail(pesan(error));
  return success();
}
