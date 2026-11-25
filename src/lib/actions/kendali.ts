"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, fail, storageObjectExists, success, zodFail, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import { longgar } from "@/lib/supabase/longgar";

// Pencatatan pengendalian sesi menurut pedoman: dokumen wajib, kelompok kerja, perubahan rencana, status per variabel,
// kontrol alat dan bahan, akses pihak luar, pengembalian sebagian, dan verifikasi entri.
// Aturan sebenarnya dijaga RLS dan fungsi di database (migrasi 21).

const DITOLAK = "Pencatatan ditolak: sesi sudah ditutup, atau peran Anda tidak berwenang pada sesi ini.";
const sid = z.string().uuid("Sesi tidak valid.");
const teks = (maks: number) => z.string().trim().max(maks, `Maksimal ${maks} karakter.`);
const wajib = (maks: number, pesan: string) => z.string().trim().min(1, pesan).max(maks, `Maksimal ${maks} karakter.`);
const angka = (pesan: string) => z.number({ invalid_type_error: pesan, required_error: pesan }).finite(pesan).min(0, "Tidak boleh negatif.").max(10_000_000, "Angka terlalu besar.");

function segarkan(sessionId: string) {
  revalidatePath(`/sesi/${sessionId}/kendali`);
  revalidatePath(`/sesi/${sessionId}`);
  revalidatePath(`/lapangan/${sessionId}/kendali`);
  revalidatePath(`/kegiatan/${sessionId}`);
  revalidatePath("/");
}

const PETUGAS_CATAT = ["operator", "kepala_pengamanan", "pengawal"] as const;

// ---------- Dokumen wajib a-m ----------
const dokumenSchema = z.object({
  session_id: sid,
  kode: z.enum(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"]),
  berlaku: z.boolean(),
  tersedia: z.boolean(),
  nomor: teks(200).optional(),
  alasan_tb: teks(500).optional(),
});

export async function ubahDokumenWajib(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = dokumenSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  if (!v.berlaku && !v.alasan_tb) return fail("Alasan wajib diisi bila dokumen ditandai tidak berlaku.", { alasan_tb: ["Wajib diisi."] });
  const { data, error } = await longgar(auth.supabase)
    .from("sesi_dokumen")
    .update({ berlaku: v.berlaku, tersedia: v.berlaku ? v.tersedia : false, nomor: v.nomor || null, alasan_tb: v.berlaku ? null : v.alasan_tb })
    .eq("session_id", v.session_id)
    .eq("kode", v.kode)
    .select("kode");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Dokumen tidak ditemukan atau sesi sudah tidak bisa diubah.");
  segarkan(v.session_id);
  return success();
}

const lampiranSchema = z.object({
  session_id: sid,
  kode: z.enum(["a", "c", "f", "g", "h", "i", "j", "k", "l", "m"]),
  path: z.string().min(10).max(300),
  nama_berkas: teks(200).optional(),
  mime: teks(120).optional(),
  ukuran_byte: z.number().int().min(0).max(25 * 1024 * 1024).optional(),
});

/** Menautkan berkas hasil unggahan ke satu dokumen wajib. Dokumen otomatis ditandai tersedia. */
export async function lampirkanDokumenWajib(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = lampiranSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  if (!v.path.startsWith(`${v.session_id}/`) || v.path.includes("..")) return fail("Alamat berkas tidak valid untuk sesi ini.");
  if (!(await storageObjectExists(auth.supabase, "pas-siaga-documents", v.path))) return fail("Berkas belum ditemukan di penyimpanan. Unggah ulang lalu coba lagi.");
  const { data: lama } = await longgar(auth.supabase).from("sesi_dokumen").select("storage_path").eq("session_id", v.session_id).eq("kode", v.kode).maybeSingle();
  const { data, error } = await longgar(auth.supabase)
    .from("sesi_dokumen")
    .update({ berlaku: true, tersedia: true, alasan_tb: null, storage_path: v.path, nama_berkas: v.nama_berkas || null, mime: v.mime || null, ukuran_byte: v.ukuran_byte ?? null })
    .eq("session_id", v.session_id)
    .eq("kode", v.kode)
    .select("kode");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Dokumen tidak ditemukan atau sesi sudah tidak bisa diubah.");
  const sebelumnya = (lama as { storage_path?: string | null } | null)?.storage_path;
  if (sebelumnya && sebelumnya !== v.path) await auth.supabase.storage.from("pas-siaga-documents").remove([sebelumnya]);
  segarkan(v.session_id);
  return success();
}

/** Menghapus berkas yang tertaut pada dokumen wajib; dokumen kembali ditandai belum tersedia. */
export async function hapusLampiranDokumenWajib(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ session_id: sid, kode: lampiranSchema.shape.kode }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const { data: lama } = await longgar(auth.supabase).from("sesi_dokumen").select("storage_path").eq("session_id", v.session_id).eq("kode", v.kode).maybeSingle();
  const { data, error } = await longgar(auth.supabase)
    .from("sesi_dokumen")
    .update({ tersedia: false, storage_path: null, nama_berkas: null, mime: null, ukuran_byte: null })
    .eq("session_id", v.session_id)
    .eq("kode", v.kode)
    .select("kode");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Dokumen tidak ditemukan atau sesi sudah tidak bisa diubah.");
  const path = (lama as { storage_path?: string | null } | null)?.storage_path;
  if (path) await auth.supabase.storage.from("pas-siaga-documents").remove([path]);
  segarkan(v.session_id);
  return success();
}

// ---------- Kelompok kerja ----------
const kelompokSchema = z.object({
  session_id: sid,
  nama: wajib(150, "Nama kelompok wajib diisi."),
  jumlah_wb: z.number().int("Isi dengan bilangan bulat.").min(0).max(10_000),
  area_aktif: teks(300).optional(),
  pengawas: teks(200).optional(),
  pengganti: teks(200).optional(),
  jalur_serah_terima: teks(300).optional(),
});

export async function tambahKelompok(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = kelompokSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const { error } = await longgar(auth.supabase).from("sesi_kelompok").insert({
    session_id: v.session_id, nama: v.nama, jumlah_wb: v.jumlah_wb,
    area_aktif: v.area_aktif || null, pengawas: v.pengawas || null, pengganti: v.pengganti || null, jalur_serah_terima: v.jalur_serah_terima || null,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(v.session_id);
  return success();
}

export async function hapusKelompok(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ session_id: sid, id: z.string().uuid() }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await longgar(auth.supabase).from("sesi_kelompok").delete().eq("id", p.data.id).eq("session_id", p.data.session_id);
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(p.data.session_id);
  return success();
}

// ---------- Lahan aktif dan batas keterlambatan entri ----------
export async function ubahLahanAktif(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator"]);
  if (!auth.ok) return fail(auth.error);
  const p = z
    .object({
      session_id: sid,
      lahan_aktif_ha: z.number().min(0, "Tidak boleh negatif.").max(100_000).nullable(),
      batas_keterlambatan_menit: z.number().int("Isi dengan bilangan bulat.").min(1, "Minimal 1 menit.").max(1440, "Maksimal 1440 menit."),
    })
    .safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { data, error } = await longgar(auth.supabase)
    .from("daily_sessions")
    .update({ lahan_aktif_ha: p.data.lahan_aktif_ha, batas_keterlambatan_menit: p.data.batas_keterlambatan_menit })
    .eq("id", p.data.session_id)
    .select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Sesi tidak ditemukan atau sudah tidak bisa diubah pada statusnya sekarang.");
  segarkan(p.data.session_id);
  return success();
}

// ---------- Perubahan rencana dan koreksi data ----------
const perubahanSchema = z.object({
  session_id: sid,
  jenis: z.enum(["Perubahan rencana", "Koreksi data"]),
  bagian: wajib(200, "Bagian yang diubah wajib diisi."),
  nilai_awal: teks(1000),
  nilai_baru: wajib(1000, "Nilai baru wajib diisi."),
  alasan: wajib(1000, "Alasan wajib diisi."),
  pejabat: teks(200).optional(),
  bukti_url: teks(500).optional(),
});

export async function catatPerubahanRencana(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator", "kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const p = perubahanSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  if (v.jenis === "Perubahan rencana" && !v.pejabat) return fail("Nama pejabat yang menyetujui perubahan wajib diisi.", { pejabat: ["Wajib diisi."] });
  const { error } = await longgar(auth.supabase).from("perubahan_rencana").insert({
    session_id: v.session_id, jenis: v.jenis, bagian: v.bagian, nilai_awal: v.nilai_awal, nilai_baru: v.nilai_baru, alasan: v.alasan,
    pejabat: v.pejabat || null, bukti_url: v.bukti_url || null, dicatat_oleh: auth.userId,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(v.session_id);
  return success();
}

// ---------- Status per variabel ----------
const variabelSchema = z.object({
  session_id: sid,
  no: z.number().int().min(1).max(8),
  /** Kosong = Tidak Berlaku (khusus variabel gelang monitor). */
  status: z.enum(["HIJAU", "KUNING", "MERAH", "KRITIS", ""]),
  alasan_tb: teks(500).optional(),
  bukti: teks(1000).optional(),
  tindak_lanjut: teks(1000).optional(),
  kondisi: z.enum(["", "belum_pasti", "tidak_ditemukan"]).optional(),
});

export async function catatStatusVariabel(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PETUGAS_CATAT]);
  if (!auth.ok) return fail(auth.error);
  const p = variabelSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  if (v.status !== "" && v.status !== "HIJAU" && !v.tindak_lanjut && !v.bukti) {
    return fail("Catat temuan atau tindakan awalnya, supaya status dapat ditelusuri.", { tindak_lanjut: ["Wajib diisi."] });
  }
  const { error } = await longgar(auth.supabase).rpc("catat_status_variabel", {
    p_session: v.session_id,
    p_no: v.no,
    p_status: v.status === "" ? null : v.status,
    p_alasan_tb: v.alasan_tb || null,
    p_bukti: v.bukti || null,
    p_tindak_lanjut: v.tindak_lanjut || null,
    p_kondisi: v.kondisi || null,
  });
  if (error) return fail(pesanFungsi(error));
  segarkan(v.session_id);
  return success();
}

/** Pesan dari fungsi database berbahasa Indonesia diteruskan apa adanya; selebihnya dipetakan. */
function pesanFungsi(error: { message?: string }): string {
  const m = (error.message ?? "").trim();
  return m && /^[A-Z]/.test(m) && !/violates|row-level security|permission denied/i.test(m) ? m : mapDbError(error as never, DITOLAK);
}

// ---------- Kontrol alat, mesin, bahan ----------
const alatSchema = z.object({
  session_id: sid,
  id: z.string().uuid().optional(),
  jenis: z.enum(["Alat", "Mesin", "Bahan", "APD", "Sarana", "Gelang"]),
  nama: wajib(200, "Nama wajib diisi."),
  satuan: teks(30).optional(),
  diserahkan: angka("Isi jumlah diserahkan."),
  digunakan: angka("Isi jumlah digunakan."),
  kembali: angka("Isi jumlah kembali atau sisa."),
  tindakan: teks(1000).optional(),
  petugas: teks(150).optional(),
});

export async function simpanKontrolAlat(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PETUGAS_CATAT]);
  if (!auth.ok) return fail(auth.error);
  const p = alatSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { id, session_id, ...v } = p.data;
  const baris = { ...v, satuan: v.satuan || null, tindakan: v.tindakan || null, petugas: v.petugas || null };
  const db = longgar(auth.supabase);
  const { error } = id
    ? await db.from("kontrol_alat").update(baris).eq("id", id).eq("session_id", session_id)
    : await db.from("kontrol_alat").insert({ ...baris, session_id, dicatat_oleh: auth.userId });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(session_id);
  return success();
}

export async function hapusKontrolAlat(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PETUGAS_CATAT]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ session_id: sid, id: z.string().uuid() }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await longgar(auth.supabase).from("kontrol_alat").delete().eq("id", p.data.id).eq("session_id", p.data.session_id);
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(p.data.session_id);
  return success();
}

// ---------- Akses pihak luar dan serah terima hasil ----------
const waktuOpsional = z
  .string()
  .trim()
  .optional()
  .refine((s) => !s || !Number.isNaN(new Date(s).getTime()), "Waktu tidak valid.");

const aksesSchema = z.object({
  session_id: sid,
  identitas: wajib(300, "Identitas pihak luar atau kendaraan wajib diisi."),
  kendaraan: teks(100).optional(),
  tujuan: teks(300).optional(),
  waktu_masuk: waktuOpsional,
  waktu_keluar: waktuOpsional,
  barang_hasil: teks(300).optional(),
  satuan: teks(30).optional(),
  jumlah: z.number().min(0, "Tidak boleh negatif.").max(10_000_000).nullable().optional(),
  asal_tujuan: teks(300).optional(),
  pemeriksaan: teks(500).optional(),
  serah_terima: teks(500).optional(),
});

export async function catatAksesLuar(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PETUGAS_CATAT]);
  if (!auth.ok) return fail(auth.error);
  const p = aksesSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const { error } = await longgar(auth.supabase).from("akses_pihak_luar").insert({
    session_id: v.session_id, identitas: v.identitas, kendaraan: v.kendaraan || null, tujuan: v.tujuan || null,
    waktu_masuk: v.waktu_masuk ? new Date(v.waktu_masuk).toISOString() : null,
    waktu_keluar: v.waktu_keluar ? new Date(v.waktu_keluar).toISOString() : null,
    barang_hasil: v.barang_hasil || null, satuan: v.satuan || null, jumlah: v.jumlah ?? null, asal_tujuan: v.asal_tujuan || null,
    pemeriksaan: v.pemeriksaan || null, serah_terima: v.serah_terima || null, dicatat_oleh: auth.userId,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(v.session_id);
  return success();
}

export async function hapusAksesLuar(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PETUGAS_CATAT]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ session_id: sid, id: z.string().uuid() }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { error } = await longgar(auth.supabase).from("akses_pihak_luar").delete().eq("id", p.data.id).eq("session_id", p.data.session_id);
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(p.data.session_id);
  return success();
}

// ---------- Pengembalian sebagian ----------
const sebagianSchema = z.object({
  session_id: sid,
  jumlah_wb: z.number().int("Isi dengan bilangan bulat.").min(0).max(10_000),
  jumlah_alat: z.number().int("Isi dengan bilangan bulat.").min(0).max(10_000),
  penyerah: teks(150).optional(),
  penerima: wajib(150, "Nama petugas penerima wajib diisi."),
  catatan: teks(500).optional(),
});

export async function catatPengembalianSebagian(input: unknown): Promise<ActionResult> {
  const auth = await authorize([...PETUGAS_CATAT]);
  if (!auth.ok) return fail(auth.error);
  const p = sebagianSchema.safeParse(input);
  if (!p.success) return zodFail(p.error);
  const v = p.data;
  const { error } = await longgar(auth.supabase).from("pengembalian_sebagian").insert({
    session_id: v.session_id, jumlah_wb: v.jumlah_wb, jumlah_alat: v.jumlah_alat, penyerah: v.penyerah || null,
    penerima: v.penerima, catatan: v.catatan || null, dicatat_oleh: auth.userId,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  segarkan(v.session_id);
  return success();
}

// ---------- Verifikasi entri lapangan ----------
export async function verifikasiEntri(input: unknown): Promise<ActionResult<{ jumlah: number }>> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const p = z.object({ session_id: sid, log_id: z.string().uuid().optional() }).safeParse(input);
  if (!p.success) return zodFail(p.error);
  const { data, error } = await longgar(auth.supabase).rpc("verifikasi_entri", { p_session: p.data.session_id, p_log: p.data.log_id ?? null });
  if (error) return fail(pesanFungsi(error));
  segarkan(p.data.session_id);
  return success({ jumlah: Number(data) || 0 });
}
