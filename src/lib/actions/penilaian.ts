"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import { longgar } from "@/lib/supabase/longgar";

// Penilaian pelaksanaan pengamanan (19 indikator). Aturan penguncian, pengesahan, dan penyelesaian tindak lanjut dijaga fungsi database.

const PENILAI = ["administrator", "operator", "kepala_pengamanan"] as const;
const DITOLAK = "Tindakan ditolak: peran atau status penilaian saat ini tidak mengizinkannya.";
const id = z.string().uuid("Penilaian tidak valid.");
const teks = (maks: number) => z.string().trim().max(maks, `Maksimal ${maks} karakter.`);
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.");

function segarkan(penilaianId?: string) {
  revalidatePath("/penilaian");
  if (penilaianId) {
    revalidatePath(`/penilaian/${penilaianId}`);
    revalidatePath(`/penilaian/${penilaianId}/cetak`);
  }
}

function pesan(error: { code?: string | null; message?: string | null }): string {
  return mapDbError(error, DITOLAK);
}

const buatSchema = z
  .object({
    kode_upt: z.string().trim().min(1, "UPT wajib dipilih."),
    activity_id: z.string().uuid().optional(),
    kegiatan_lokasi: z.string().trim().min(1, "Kegiatan dan lokasi wajib diisi.").max(300),
    periode_dari: tanggal,
    periode_sampai: tanggal,
    tanggal_penilaian: tanggal,
    penilai_nama: z.string().trim().min(1, "Nama penilai wajib diisi.").max(200),
    penilai_jabatan: z.string().trim().min(1, "Jabatan penilai wajib diisi.").max(200),
    penanggung_jawab: teks(200).optional(),
    sertakan_latihan: z.boolean().default(false),
  })
  .refine((v) => v.periode_sampai >= v.periode_dari, { message: "Akhir periode tidak boleh sebelum awal periode.", path: ["periode_sampai"] });

export async function buatPenilaian(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = buatSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const db = longgar(auth.supabase);
  const { data, error } = await db
    .from("penilaian_evaluasi")
    .insert({
      kode_upt: v.kode_upt, activity_id: v.activity_id ?? null, kegiatan_lokasi: v.kegiatan_lokasi, periode_dari: v.periode_dari, periode_sampai: v.periode_sampai,
      tanggal_penilaian: v.tanggal_penilaian, penilai_nama: v.penilai_nama, penilai_jabatan: v.penilai_jabatan, penanggung_jawab: v.penanggung_jawab || null,
      sertakan_latihan: v.sertakan_latihan, dibuat_oleh: auth.userId,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error ? pesan(error) : "Penilaian gagal dibuat.");
  // Isi awal dari data aplikasi; skor akhir tetap ditentukan penilai.
  await db.rpc("isi_saran_penilaian", { p_id: data.id, p_terapkan: true });
  segarkan(data.id);
  return success({ id: String(data.id) });
}

export async function isiSaran(input: unknown): Promise<ActionResult<{ jumlah: number }>> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id, terapkan: z.boolean().default(false) }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { data, error } = await longgar(auth.supabase).rpc("isi_saran_penilaian", { p_id: p.data.id, p_terapkan: p.data.terapkan });
  if (error) return fail(pesan(error));
  segarkan(p.data.id);
  return success({ jumlah: Number(data) || 0 });
}

const skorSchema = z.object({
  id,
  no: z.number().int().min(1).max(19),
  /** "2", "1", "0", "TB", atau kosong (belum dinilai). */
  nilai: z.enum(["2", "1", "0", "TB", ""]),
  alasan_tb: teks(500).optional(),
  bukti: teks(2000).optional(),
});

export async function simpanSkor(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = skorSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  if (v.nilai === "TB" && !v.alasan_tb) return fail("Alasan wajib diisi bila memilih TB.", { alasan_tb: ["Wajib diisi."] });
  const { data, error } = await longgar(auth.supabase)
    .from("penilaian_skor")
    .update({
      skor: v.nilai === "" || v.nilai === "TB" ? null : Number(v.nilai),
      tb: v.nilai === "TB",
      alasan_tb: v.nilai === "TB" ? v.alasan_tb : null,
      bukti: v.bukti || null,
    })
    .eq("penilaian_id", v.id)
    .eq("no", v.no)
    .select("no");
  if (error) return fail(pesan(error));
  if (!data || data.length === 0) return fail("Penilaian sudah dikunci atau tidak ditemukan.");
  segarkan(v.id);
  return success();
}

export async function simpanTindakanSegera(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id, tindakan_segera: teks(2000).optional(), tindakan_dilaksanakan: teks(2000).optional(), penanggung_jawab: teks(200).optional() }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { data, error } = await longgar(auth.supabase)
    .from("penilaian_evaluasi")
    .update({ tindakan_segera: p.data.tindakan_segera || null, tindakan_dilaksanakan: p.data.tindakan_dilaksanakan || null, penanggung_jawab: p.data.penanggung_jawab || null })
    .eq("id", p.data.id)
    .select("id");
  if (error) return fail(pesan(error));
  if (!data || data.length === 0) return fail("Penilaian sudah dikunci atau tidak ditemukan.");
  segarkan(p.data.id);
  return success();
}

export async function kunciPenilaian(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await longgar(auth.supabase).rpc("kunci_penilaian", { p_id: p.data.id });
  if (error) return fail(pesan(error));
  segarkan(p.data.id);
  return success();
}

export async function sahkanPenilaian(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["ka_upt"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id, catatan: teks(1000).optional() }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await longgar(auth.supabase).rpc("sahkan_penilaian", { p_id: p.data.id, p_catatan: p.data.catatan || null });
  if (error) return fail(pesan(error));
  segarkan(p.data.id);
  return success();
}

export async function hapusPenilaian(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { data, error } = await longgar(auth.supabase).from("penilaian_evaluasi").delete().eq("id", p.data.id).select("id");
  if (error) return fail(pesan(error));
  if (!data || data.length === 0) return fail("Hanya penilaian berstatus Draf yang dapat dihapus.");
  segarkan();
  return success();
}

// ---------- Tindak lanjut ----------
const tlSchema = z.object({
  id,
  no_indikator: z.number().int().min(1).max(19).nullable().optional(),
  temuan: z.string().trim().min(1, "Temuan wajib diisi.").max(2000),
  tindakan: teks(2000).optional(),
  penanggung_jawab: teks(200).optional(),
  batas_waktu: tanggal.optional(),
});

export async function tambahTindakLanjutPenilaian(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PENILAI]);
  if (!auth.ok) return fail(auth.error);
  const p = tlSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const { error } = await longgar(auth.supabase).from("penilaian_tindak_lanjut").insert({
    penilaian_id: v.id, no_indikator: v.no_indikator ?? null, temuan: v.temuan, tindakan: v.tindakan || null, penanggung_jawab: v.penanggung_jawab || null, batas_waktu: v.batas_waktu || null,
  });
  if (error) return fail(pesan(error));
  segarkan(v.id);
  return success();
}

const tlUbahSchema = z.object({
  id,
  tl_id: z.string().uuid(),
  tindakan: teks(2000).optional(),
  penanggung_jawab: teks(200).optional(),
  batas_waktu: tanggal.optional(),
  bukti_penyelesaian: teks(2000).optional(),
  hasil_verifikasi: teks(2000).optional(),
  selesai: z.boolean(),
});

export async function ubahTindakLanjutPenilaian(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "operator", "kepala_pengamanan", "ka_upt"]);
  if (!auth.ok) return fail(auth.error);
  const p = tlUbahSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const pejabat = auth.role === "kepala_pengamanan" || auth.role === "ka_upt";
  const baris: Record<string, unknown> = {
    bukti_penyelesaian: v.bukti_penyelesaian || null,
    hasil_verifikasi: v.hasil_verifikasi || null,
  };
  if (auth.role !== "ka_upt") {
    baris.tindakan = v.tindakan || null;
    baris.penanggung_jawab = v.penanggung_jawab || null;
    baris.batas_waktu = v.batas_waktu || null;
  }
  if (pejabat) baris.selesai = v.selesai;
  const { data, error } = await longgar(auth.supabase).from("penilaian_tindak_lanjut").update(baris).eq("id", v.tl_id).eq("penilaian_id", v.id).select("id");
  if (error) return fail(pesan(error));
  if (!data || data.length === 0) return fail("Tindak lanjut tidak ditemukan.");
  segarkan(v.id);
  return success();
}
