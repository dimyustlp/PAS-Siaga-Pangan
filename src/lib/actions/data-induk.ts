"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { isUniqueViolation, mapDbError } from "@/lib/errors";
import {
  anggotaKelompokSchema, habituasiSchema, hapusAnggotaSchema, hapusIndukSchema, inventarisSchema,
  kelompokSchema, kondisiAwalSchema, kondisiInventarisSchema, petugasSchema,
} from "@/lib/validations/induk";

const DITOLAK = "Hanya Administrator atau Operator UPT yang dapat mengelola data induk UPT-nya.";
const PILIH_UPT = "Pilih UPT lebih dulu.";

const segarkan = () => revalidatePath("/data-induk");

/** Operator selalu memakai UPT-nya sendiri (diisi database). Administrator wajib menyebut UPT. */
function uptUntuk(role: string, kode: string | undefined): { ok: true; kode: string | undefined } | { ok: false } {
  if (role === "administrator") return kode ? { ok: true, kode } : { ok: false };
  return { ok: true, kode: undefined };
}

export async function simpanKelompok(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = kelompokSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const upt = uptUntuk(auth.role, parsed.data.kode_upt);
  if (!upt.ok) return fail(PILIH_UPT);
  const { error } = await auth.supabase.from("kelompok_kerja").insert({
    ...(upt.kode ? { kode_upt: upt.kode } : {}),
    nama: parsed.data.nama,
    jenis_kegiatan: parsed.data.jenis_kegiatan ?? null,
    lokasi_id: parsed.data.lokasi_id ?? null,
    pembimbing: parsed.data.pembimbing ?? null,
    keterangan: parsed.data.keterangan ?? null,
  });
  if (error) return fail(isUniqueViolation(error) ? "Nama kelompok sudah dipakai di UPT ini." : mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

/** Menambah anggota kelompok dari daftar nomor registrasi (satu per baris, koma, atau spasi). */
export async function tambahAnggotaKelompok(input: unknown): Promise<ActionResult<{ ditambah: number; tidakDitemukan: string[] }>> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = anggotaKelompokSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const nomor = [...new Set(parsed.data.teks.split(/[\s,;|]+/).map((x) => x.trim()).filter(Boolean))].slice(0, 500);
  if (nomor.length === 0) return fail("Tempel minimal satu nomor registrasi.");

  const { data: kel } = await auth.supabase.from("kelompok_kerja").select("id,kode_upt").eq("id", parsed.data.kelompok_id).maybeSingle();
  if (!kel) return fail("Kelompok tidak ditemukan atau di luar cakupan Anda.");

  const { data: wb } = await auth.supabase.from("master_inmates").select("id,nomor_registrasi").eq("kode_upt", kel.kode_upt).in("nomor_registrasi", nomor);
  const ditemukan = new Set((wb ?? []).map((w) => w.nomor_registrasi));
  const tidakDitemukan = nomor.filter((n) => !ditemukan.has(n));
  if ((wb ?? []).length === 0) return fail("Tidak ada nomor registrasi yang cocok dengan warga binaan di UPT ini.");

  const { error } = await auth.supabase
    .from("kelompok_kerja_anggota")
    .upsert((wb ?? []).map((w) => ({ kelompok_id: kel.id, inmate_id: w.id })), { onConflict: "kelompok_id,inmate_id", ignoreDuplicates: true });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success({ ditambah: (wb ?? []).length, tidakDitemukan: tidakDitemukan.slice(0, 5) });
}

export async function hapusAnggotaKelompok(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = hapusAnggotaSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await auth.supabase.from("kelompok_kerja_anggota").delete().eq("kelompok_id", parsed.data.kelompok_id).eq("inmate_id", parsed.data.inmate_id);
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function simpanPetugas(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = petugasSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const upt = uptUntuk(auth.role, parsed.data.kode_upt);
  if (!upt.ok) return fail(PILIH_UPT);
  const p = parsed.data;
  const { error } = await auth.supabase.from("petugas_upt").insert({
    ...(upt.kode ? { kode_upt: upt.kode } : {}),
    nama: p.nama,
    nip: p.nip ?? null,
    jabatan: p.jabatan ?? null,
    regu: p.regu ?? null,
    tanggal_habituasi: p.tanggal_habituasi ?? null,
    materi_habituasi: p.materi_habituasi ?? null,
  });
  if (error) return fail(isUniqueViolation(error) ? "NIP sudah terdaftar di UPT ini." : mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function catatHabituasi(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = habituasiSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data, error } = await auth.supabase
    .from("petugas_upt")
    .update({ tanggal_habituasi: parsed.data.tanggal_habituasi, materi_habituasi: parsed.data.materi_habituasi ?? null })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Petugas tidak ditemukan atau di luar cakupan Anda.");
  segarkan();
  return success();
}

export async function simpanInventaris(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = inventarisSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const upt = uptUntuk(auth.role, parsed.data.kode_upt);
  if (!upt.ok) return fail(PILIH_UPT);
  const p = parsed.data;
  const { error } = await auth.supabase.from("inventaris_upt").insert({
    ...(upt.kode ? { kode_upt: upt.kode } : {}),
    golongan: p.golongan,
    kategori: p.kategori ?? null,
    nama: p.nama,
    kode_inventaris: p.kode_inventaris ?? null,
    jumlah: p.jumlah,
    kondisi: p.kondisi,
    lokasi_simpan: p.lokasi_simpan ?? null,
    keterangan: p.keterangan ?? null,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  return success();
}

export async function ubahKondisiInventaris(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = kondisiInventarisSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data, error } = await auth.supabase.from("inventaris_upt").update({ kondisi: parsed.data.kondisi, jumlah: parsed.data.jumlah }).eq("id", parsed.data.id).select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Barang tidak ditemukan atau di luar cakupan Anda.");
  segarkan();
  return success();
}

export async function hapusInduk(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = hapusIndukSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { tabel, id } = parsed.data;
  const q =
    tabel === "kelompok_kerja" ? auth.supabase.from("kelompok_kerja").delete().eq("id", id).select("id")
    : tabel === "petugas_upt" ? auth.supabase.from("petugas_upt").delete().eq("id", id).select("id")
    : auth.supabase.from("inventaris_upt").delete().eq("id", id).select("id");
  const { data, error } = await q;
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Data tidak ditemukan atau di luar cakupan Anda.");
  segarkan();
  return success();
}

export async function simpanKondisiAwal(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = kondisiAwalSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const p = parsed.data;
  const { error } = await auth.supabase.from("kondisi_awal").upsert(
    {
      kode_upt: p.kode_upt,
      periode_dari: p.periode_dari ?? null,
      periode_sampai: p.periode_sampai ?? null,
      kegiatan_per_bulan: p.kegiatan_per_bulan ?? null,
      pct_catatan_lengkap: p.pct_catatan_lengkap ?? null,
      pct_serah_terima_cocok: p.pct_serah_terima_cocok ?? null,
      pct_temuan_tindak_lanjut: p.pct_temuan_tindak_lanjut ?? null,
      pct_tindak_lanjut_selesai: p.pct_tindak_lanjut_selesai ?? null,
      menit_pelaporan_kejadian: p.menit_pelaporan_kejadian ?? null,
      gangguan_per_bulan: p.gangguan_per_bulan ?? null,
      sumber_data: p.sumber_data ?? null,
      catatan: p.catatan ?? null,
      dicatat_oleh: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "kode_upt" }
  );
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan();
  revalidatePath("/evaluasi");
  return success();
}
