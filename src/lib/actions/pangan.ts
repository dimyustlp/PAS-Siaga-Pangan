"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import { beritaSchema, hapusBeritaSchema, hapusHasilSchema, hasilPanganSchema } from "@/lib/validations/induk";

const DITOLAK_HASIL = "Hanya Administrator atau Operator UPT yang dapat mencatat hasil pangan UPT-nya.";
const DITOLAK_BERITA = "Hanya Administrator atau Operator UPT yang dapat menerbitkan berita UPT-nya.";

export async function catatHasil(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = hasilPanganSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  if (auth.role === "administrator" && !parsed.data.kode_upt) return fail("Pilih UPT lebih dulu.");
  const d = parsed.data;
  const { error } = await auth.supabase.from("hasil_pangan").insert({
    ...(d.kode_upt && auth.role === "administrator" ? { kode_upt: d.kode_upt } : {}),
    activity_id: d.activity_id ?? null,
    jenis: d.jenis,
    komoditas: d.komoditas,
    tanggal: d.tanggal,
    volume: d.volume,
    satuan: d.satuan,
    luas_ha: d.luas_ha ?? null,
    catatan: d.catatan ?? null,
  });
  if (error) return fail(mapDbError(error, DITOLAK_HASIL));
  revalidatePath("/pangan");
  return success();
}

export async function hapusHasil(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = hapusHasilSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error, count } = await auth.supabase.from("hasil_pangan").delete({ count: "exact" }).eq("id", parsed.data.id);
  if (error) return fail(mapDbError(error, DITOLAK_HASIL));
  if (!count) return fail("Catatan tidak ditemukan atau di luar kewenangan Anda.");
  revalidatePath("/pangan");
  return success();
}

export async function terbitkanBerita(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = beritaSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  if (auth.role === "administrator" && !d.kode_upt) return fail("Pilih UPT penulis berita lebih dulu.");
  const { error } = await auth.supabase.from("berita_pangan").insert({
    kode_upt: d.kode_upt ?? null,
    kategori: d.kategori,
    judul: d.judul,
    ringkasan: d.ringkasan ?? null,
    isi: d.isi,
    tanggal: d.tanggal,
    foto_path: d.foto_path ?? null,
    diterbitkan: d.diterbitkan,
  });
  if (error) return fail(mapDbError(error, DITOLAK_BERITA));
  revalidatePath("/berita");
  return success();
}

export async function hapusBerita(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = hapusBeritaSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data: b } = await auth.supabase.from("berita_pangan").select("foto_path").eq("id", parsed.data.id).maybeSingle();
  const { error, count } = await auth.supabase.from("berita_pangan").delete({ count: "exact" }).eq("id", parsed.data.id);
  if (error) return fail(mapDbError(error, DITOLAK_BERITA));
  if (!count) return fail("Berita tidak ditemukan atau di luar kewenangan Anda.");
  if (b?.foto_path) await auth.supabase.storage.from("pas-siaga-berita").remove([b.foto_path]);
  revalidatePath("/berita");
  return success();
}
