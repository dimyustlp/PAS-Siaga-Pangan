"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, fail, success, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";

function pesan(error: { code?: string | null; message?: string | null }, cadangan: string): string {
  const m = (error.message ?? "").trim();
  if (m && /^[A-Z]/.test(m) && !/violates|duplicate key|row-level security|permission denied|syntax|function public\./i.test(m)) return m;
  return mapDbError(error, cadangan);
}

const catatSchema = z.object({
  session_id: z.string().uuid(),
  nama: z.string().trim().min(3, "Tulis nama lengkap petugas (minimal 3 huruf).").max(120, "Nama terlalu panjang."),
  nip: z.string().trim().max(30, "NIP terlalu panjang.").optional(),
  seksi: z.string().trim().max(120, "Nama seksi terlalu panjang.").optional(),
});

/** Pengawal mencatat nama petugas yang bertugas. Satu akun dipakai bergantian oleh beberapa petugas. */
export async function catatPetugas(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["pengawal"]);
  if (!auth.ok) return fail(auth.error);
  const p = catatSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Isian tidak valid.");
  const { data, error } = await auth.supabase.rpc("catat_petugas_sesi", {
    p_session: p.data.session_id,
    p_nama: p.data.nama,
    p_nip: p.data.nip || null,
    p_seksi: p.data.seksi || null,
  });
  if (error) return fail(pesan(error, "Nama petugas belum bisa dicatat."));
  revalidatePath(`/lapangan/${p.data.session_id}/entri`);
  return success({ id: data as string });
}

export async function hapusPetugas(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["pengawal"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id: z.string().uuid(), session_id: z.string().uuid() }).safeParse(input);
  if (!p.success) return fail("Isian tidak valid.");
  const { error } = await auth.supabase.rpc("hapus_petugas_sesi", { p_id: p.data.id });
  if (error) return fail(pesan(error, "Petugas belum bisa dihapus."));
  revalidatePath(`/lapangan/${p.data.session_id}/entri`);
  return success();
}
