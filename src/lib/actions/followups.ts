"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, storageObjectExists, success, zodFail, type ActionResult } from "./_shared";
import { followUpCreateRefined, followUpProgressSchema, followUpVerifySchema } from "@/lib/validations/followup";
import { isSafeStoragePath } from "@/lib/validations/storage";
import { mapDbError } from "@/lib/errors";

const DITOLAK = "Tindakan ditolak: peran Anda tidak berwenang atau tindak lanjut ini bukan tugas Anda.";

function refresh() {
  revalidatePath("/");
  revalidatePath("/keputusan");
  revalidatePath("/tindak-lanjut");
  revalidatePath("/lapangan");
}

/** Kepala Pengamanan menugaskan tindak lanjut dengan penanggung jawab dan tenggat. */
export async function createFollowUp(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = followUpCreateRefined.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const p = parsed.data;

  let namaPj = p.penanggung_jawab_nama;
  if (!namaPj && p.penanggung_jawab_id) {
    const { data: prof } = await auth.supabase.from("profiles").select("full_name").eq("id", p.penanggung_jawab_id).maybeSingle();
    namaPj = prof?.full_name;
  }
  if (!namaPj) return fail("Penanggung jawab tidak ditemukan. Tulis namanya.");

  const { error } = await auth.supabase.from("follow_ups").insert({
    session_id: p.session_id,
    incident_id: p.incident_id ?? null,
    sumber: p.sumber,
    uraian: p.uraian,
    penanggung_jawab_id: p.penanggung_jawab_id ?? null,
    penanggung_jawab_nama: namaPj,
    tenggat: p.tenggat,
    pemeriksaan_ulang_at: p.pemeriksaan_ulang_at ?? null,
  });
  if (error) return fail(mapDbError(error, DITOLAK));
  refresh();
  return success();
}

/** Pelaksana (Operator, atau Pengawal yang ditunjuk) menandai tindak lanjut sedang dikerjakan atau selesai. */
export async function progressFollowUp(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["operator", "pengawal"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = followUpProgressSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, status, catatan_selesai, bukti_path } = parsed.data;

  const { data: fu } = await auth.supabase.from("follow_ups").select("session_id").eq("id", id).maybeSingle();
  if (!fu) return fail("Tindak lanjut tidak ditemukan.");
  if (bukti_path) {
    if (!isSafeStoragePath(bukti_path, fu.session_id)) return fail("Alamat foto bukti tidak valid untuk sesi ini.");
    if (!(await storageObjectExists(auth.supabase, "pas-siaga-evidence", bukti_path))) {
      return fail("Foto bukti belum ditemukan di penyimpanan. Unggah ulang lalu coba lagi.");
    }
  }

  const { data, error } = await auth.supabase
    .from("follow_ups")
    .update({ status, catatan_selesai: catatan_selesai ?? null, bukti_url: bukti_path ?? null })
    .eq("id", id)
    .select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Tindak lanjut tidak ditemukan atau bukan tugas Anda.");
  refresh();
  return success();
}

/** Kepala Pengamanan memeriksa hasil pekerjaan, lalu memverifikasi. Setelah itu tindak lanjut terkunci. */
export async function verifyFollowUp(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["kepala_pengamanan"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = followUpVerifySchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { data, error } = await auth.supabase
    .from("follow_ups")
    .update({ status: "Terverifikasi", catatan_selesai: parsed.data.hasil })
    .eq("id", parsed.data.id)
    .eq("status", "Selesai")
    .select("id");
  if (error) return fail(mapDbError(error, DITOLAK));
  if (!data || data.length === 0) return fail("Hanya tindak lanjut berstatus Selesai yang bisa diverifikasi.");
  refresh();
  return success();
}
