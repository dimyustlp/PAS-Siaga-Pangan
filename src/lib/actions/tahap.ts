"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, fail, success, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";

function pesanDb(error: { code?: string | null; message?: string | null }, cadangan: string): string {
  const m = (error.message ?? "").trim();
  if (m && /^[A-Z]/.test(m) && !/violates|duplicate key|row-level security|permission denied|syntax|function public\./i.test(m)) return m;
  return mapDbError(error, cadangan);
}

const tahapSchema = z.object({
  session_id: z.string().uuid(),
  tahap: z.number().int().min(1).max(4),
  isian: z.record(z.union([z.string().max(2000), z.number(), z.boolean()])),
});

/** Pengawal menyelesaikan satu tahap. Urutan, lampiran wajib, dan waktu dicek dan dicatat database. */
export async function selesaikanTahap(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(["pengawal", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = tahapSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Isian tidak valid.");
  const { data, error } = await auth.supabase.rpc("selesaikan_tahap", {
    p_session: p.data.session_id,
    p_tahap: p.data.tahap,
    p_isian: p.data.isian as Json,
  });
  if (error) return fail(pesanDb(error, "Tahap belum bisa diselesaikan."));
  revalidatePath(`/lapangan/${p.data.session_id}/entri`);
  revalidatePath(`/sesi/${p.data.session_id}`);
  revalidatePath("/");
  return success({ id: data as string });
}

export async function hapusLampiran(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["pengawal", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id: z.string().uuid(), session_id: z.string().uuid() }).safeParse(input);
  if (!p.success) return fail("Isian tidak valid.");
  const { error } = await auth.supabase.rpc("hapus_lampiran", { p_id: p.data.id });
  if (error) return fail(pesanDb(error, "Lampiran tidak bisa dihapus."));
  revalidatePath(`/lapangan/${p.data.session_id}/entri`);
  return success();
}

export async function sahkanLaporan(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["ka_upt"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ session_id: z.string().uuid(), catatan: z.string().trim().max(1000).optional() }).safeParse(input);
  if (!p.success) return fail("Isian tidak valid.");
  const { error } = await auth.supabase.rpc("sahkan_laporan", { p_session: p.data.session_id, p_catatan: p.data.catatan ?? "" });
  if (error) return fail(pesanDb(error, "Laporan belum bisa disahkan."));
  revalidatePath(`/sesi/${p.data.session_id}`);
  revalidatePath(`/sesi/${p.data.session_id}/laporan`);
  revalidatePath("/laporan");
  return success();
}

const kopSchema = z.object({
  kode: z.string().trim().min(1).max(30),
  alamat: z.string().trim().max(300).optional(),
  telepon: z.string().trim().max(100).optional(),
  email: z.string().trim().max(150).optional(),
  kota: z.string().trim().max(80).optional(),
});

export async function ubahKopSurat(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = kopSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Isian tidak valid.");
  const { error } = await auth.supabase.rpc("ubah_kop_upt", {
    p_kode: p.data.kode,
    p_alamat: p.data.alamat ?? null,
    p_telepon: p.data.telepon ?? null,
    p_email: p.data.email ?? null,
    p_kota: p.data.kota ?? null,
  });
  if (error) return fail(pesanDb(error, "Kop surat belum bisa disimpan."));
  revalidatePath("/kop-surat");
  return success();
}

const kopLengkapSchema = z.object({
  kode: z.string().trim().min(1).max(30),
  baris: z.array(z.string().trim().max(150, "Satu baris kop paling panjang 150 huruf.")).max(8, "Kop paling banyak 8 baris judul."),
  alamat: z.string().trim().max(300).optional(),
  kode_pos: z.string().trim().max(10).optional(),
  telepon: z.string().trim().max(80).optional(),
  faks: z.string().trim().max(80).optional(),
  email: z.string().trim().max(120).optional(),
  website: z.string().trim().max(120).optional(),
  kota: z.string().trim().max(80).optional(),
});

/** Menyimpan seluruh isi kop surat UPT. Dipakai pada setiap surat dan laporan berikutnya. */
export async function ubahKopLengkap(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = kopLengkapSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Isian tidak valid.");
  const { error } = await auth.supabase.rpc("ubah_kop_upt_lengkap", {
    p_kode: p.data.kode,
    p_baris: p.data.baris,
    p_alamat: p.data.alamat ?? null,
    p_telepon: p.data.telepon ?? null,
    p_faks: p.data.faks ?? null,
    p_email: p.data.email ?? null,
    p_website: p.data.website ?? null,
    p_kodepos: p.data.kode_pos ?? null,
    p_kota: p.data.kota ?? null,
  });
  if (error) return fail(pesanDb(error, "Kop surat belum bisa disimpan."));
  revalidatePath("/kop-surat");
  revalidatePath("/laporan");
  return success();
}

const driveSchema = z.object({
  url: z.string().trim().max(300).optional(),
  aktif: z.boolean(),
  batas_foto: z.coerce.number().int().min(1).max(20),
  batas_berkas: z.coerce.number().int().min(1).max(40),
});

export async function aturDrive(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const p = driveSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Isian tidak valid.");
  if (p.data.aktif && p.data.url) {
    // Uji sambungan: aplikasi web yang benar menjawab {"ok":true,"layanan":"PAS-SIAGA Pangan"}.
    try {
      const r = await fetch(p.data.url, { redirect: "follow", cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; layanan?: string };
      if (!j.ok || j.layanan !== "PAS-SIAGA Pangan") return fail("Alamat bisa dibuka, tetapi bukan Apps Script PAS-SIAGA Pangan.");
    } catch {
      return fail("Apps Script belum bisa dihubungi. Pastikan sudah di-deploy sebagai aplikasi web dengan akses \"Anyone\".");
    }
  }
  const { error } = await auth.supabase.rpc("admin_atur_drive", {
    p_url: p.data.url ?? null,
    p_aktif: p.data.aktif,
    p_batas_foto: p.data.batas_foto,
    p_batas_berkas: p.data.batas_berkas,
  });
  if (error) return fail(pesanDb(error, "Pengaturan belum bisa disimpan."));
  revalidatePath("/admin/drive");
  return success();
}
