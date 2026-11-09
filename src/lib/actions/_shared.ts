// Pembantu bersama untuk server actions. Sengaja TANPA "use server":
// berkas "use server" hanya boleh mengekspor fungsi async.

import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/rbac";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const success = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });

export const fail = (error: string, fieldErrors?: Record<string, string[]>): { ok: false; error: string; fieldErrors?: Record<string, string[]> } => ({
  ok: false,
  error,
  fieldErrors,
});

/** Mengubah galat Zod menjadi pesan pertama (untuk banner) dan peta per kolom (untuk formulir). */
export function zodFail(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail(error.issues[0]?.message ?? "Isian tidak valid.", fieldErrors);
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type Authorized =
  | { ok: true; supabase: ServerClient; userId: string; role: Role }
  | { ok: false; error: string };

/**
 * Memastikan pemanggil sudah masuk, akunnya aktif, dan perannya termasuk yang diizinkan.
 * Pemeriksaan ini hanya lapis pertama. Penjaga sebenarnya adalah RLS dan pemicu di database.
 */
export async function authorize(roles: Role[]): Promise<Authorized> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };

  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_active) return { ok: false, error: "Akun tidak aktif atau belum terdaftar." };
  if (!roles.includes(profile.role)) return { ok: false, error: "Anda tidak berwenang melakukan tindakan ini." };

  return { ok: true, supabase, userId: user.id, role: profile.role };
}

/** Memastikan berkas benar-benar ada di bucket sebelum alamatnya ditautkan ke data. */
export async function storageObjectExists(supabase: ServerClient, bucket: string, path: string): Promise<boolean> {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return false;
  const folder = path.slice(0, idx);
  const name = path.slice(idx + 1);
  const { data, error } = await supabase.storage.from(bucket).list(folder, { search: name, limit: 20 });
  if (error || !data) return false;
  return data.some((f) => f.name === name);
}
