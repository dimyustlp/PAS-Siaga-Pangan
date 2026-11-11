"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import { aktifGrupSchema, grupTelegramSchema, idGrupSchema, pengaturanSchema, tokenTelegramSchema } from "@/lib/validations/induk";

const DITOLAK = "Hanya Administrator yang dapat mengatur notifikasi.";
const segarkan = () => {
  revalidatePath("/admin/notifikasi");
  revalidatePath("/", "layout");
};

/** Token bot langsung masuk ke Vault database. Aplikasi tidak pernah membacanya kembali. */
export async function simpanTokenTelegram(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = tokenTelegramSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.rpc("admin_simpan_token_telegram", { p_token: parsed.data.token });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function aturPengaturan(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = pengaturanSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.rpc("admin_atur_pengaturan", {
    p_latihan: parsed.data.latihan,
    p_telegram: parsed.data.telegram,
    p_rekap_jam: parsed.data.rekap_jam,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function simpanGrupTelegram(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = grupTelegramSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const p = parsed.data;
  const { error } = await auth.supabase.from("grup_telegram").insert({
    nama: p.nama,
    chat_id: p.chat_id,
    tingkat: p.tingkat,
    kode_upt: p.tingkat === "UPT" ? p.kode_upt! : null,
    kanwil_id: p.tingkat === "Kanwil" ? p.kanwil_id! : null,
    minimal_status: p.minimal_status,
    kirim_rekap: p.kirim_rekap,
    ikut_latihan: p.ikut_latihan,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function ubahAktifGrup(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = aktifGrupSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.from("grup_telegram").update({ aktif: parsed.data.aktif }).eq("id", parsed.data.id);
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function hapusGrupTelegram(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = idGrupSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.from("grup_telegram").delete().eq("id", parsed.data.id);
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function tesGrupTelegram(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = idGrupSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.rpc("admin_tes_telegram", { p_grup: parsed.data.id });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function kirimRekapSekarang(): Promise<ActionResult<{ jumlah: number }>> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const { data, error } = await auth.supabase.rpc("admin_kirim_rekap_sekarang");
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success({ jumlah: Number(data ?? 0) });
}
