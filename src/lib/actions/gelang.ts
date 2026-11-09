"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { bacaDaftarUnit, hapusUnitSchema, konfirmasiAlarmSchema, unitSchema } from "@/lib/validations/gelang";
import { mapDbError } from "@/lib/errors";

const DITOLAK = "Tindakan ditolak: di luar wewenang atau di luar UPT Anda.";

/** Pesan dari fungsi database kita berbahasa Indonesia dan boleh ditampilkan; galat teknis Postgres tidak. */
function pesanRpc(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? "").trim();
  if (m && !/violates|duplicate key|row-level security|permission denied|syntax|function public\./i.test(m) && /^[A-Z]/.test(m)) return m;
  return mapDbError(error, DITOLAK);
}

/** Konfirmasi alarm gelang dengan petugas di lapangan (SOP: setiap alarm dikonfirmasi langsung). */
export async function konfirmasiAlarm(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["pengawal", "operator", "kepala_pengamanan", "administrator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = konfirmasiAlarmSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const p = parsed.data;
  const { error } = await auth.supabase.rpc("konfirmasi_alarm_gelang", { p_id: p.id, p_status: p.status, p_tindakan: p.tindakan });
  if (error) return fail(pesanRpc(error));
  revalidatePath("/gelang");
  revalidatePath("/");
  return success();
}

/** Membuat kunci penerima baru. Kunci hanya tampil sekali; database menyimpan sidik jari (SHA-256) saja. */
export async function buatKunciGelang(): Promise<ActionResult<{ kunci: string }>> {
  const auth = await authorize(["administrator"]);
  if (!auth.ok) return fail(auth.error);
  const kunci = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(kunci).digest("hex");
  const { error } = await auth.supabase.rpc("admin_atur_kunci_gelang", { p_hash: hash });
  if (error) return fail(pesanRpc(error));
  revalidatePath("/admin/gelang");
  return success({ kunci });
}

/** Menambah atau memperbarui pemetaan unit gelang ke UPT dan warga binaan (impor beberapa baris sekaligus). */
export async function simpanUnitGelang(input: unknown): Promise<ActionResult<{ jumlah: number; tanpaWb: string[] }>> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { kode_upt, teks } = parsed.data;

  const { baris, salah } = bacaDaftarUnit(teks);
  if (salah.length) return fail(`Kode unit tidak valid pada baris: "${salah[0]}". Pakai huruf, angka, atau tanda hubung (maks. 30 karakter).`);
  if (baris.length === 0) return fail("Tidak ada baris yang bisa dibaca.");
  if (baris.length > 500) return fail("Maksimal 500 unit sekali simpan.");

  const nomor = [...new Set(baris.map((b) => b.nomor).filter((x): x is string => !!x))];
  const peta = new Map<string, string>();
  if (nomor.length) {
    const { data, error } = await auth.supabase.from("master_inmates").select("id,nomor_registrasi").eq("kode_upt", kode_upt).in("nomor_registrasi", nomor);
    if (error) return fail(mapDbError(error, DITOLAK));
    for (const r of data ?? []) peta.set(r.nomor_registrasi, r.id);
  }
  const tanpaWb = nomor.filter((n) => !peta.has(n));

  const { error } = await auth.supabase.from("gelang_unit").upsert(
    baris.map((b) => ({
      kode_upt,
      kode_unit: b.kode,
      nama_unit: b.nama,
      inmate_id: b.nomor ? (peta.get(b.nomor) ?? null) : null,
      aktif: true,
    })),
    { onConflict: "kode_unit" }
  );
  if (error) return fail(mapDbError(error, DITOLAK));
  revalidatePath("/gelang");
  return success({ jumlah: baris.length, tanpaWb });
}

export async function hapusUnitGelang(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = hapusUnitSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data, error } = await auth.supabase.from("gelang_unit").delete().eq("id", parsed.data.id).select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Unit tidak ditemukan atau bukan milik UPT Anda.");
  revalidatePath("/gelang");
  return success();
}
