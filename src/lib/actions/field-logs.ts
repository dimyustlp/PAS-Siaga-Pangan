"use server";

import { revalidatePath } from "next/cache";
import { authorize, fail, success, zodFail, type ActionResult, type ServerClient } from "./_shared";
import { fieldLogBatchSchema, fieldLogSchema, type FieldLogEntry } from "@/lib/validations/field-log";
import { isSafeStoragePath } from "@/lib/validations/storage";
import { isUniqueViolation, mapDbError } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";

const DITOLAK =
  "Entri ditolak: sesi belum berstatus Dapat Dimulai, sudah ditutup, atau Anda tidak ditugaskan pada sesi ini.";

type InsertOutcome = { ok: true; duplikat: boolean } | { ok: false; error: string };

/** Menyimpan satu entri. Pengiriman ulang entri yang sama (client_id sama) dianggap berhasil, bukan galat. */
async function insertEntry(supabase: ServerClient, entry: FieldLogEntry): Promise<InsertOutcome> {
  if (entry.bukti_path && !isSafeStoragePath(entry.bukti_path, entry.session_id)) {
    return { ok: false, error: "Alamat foto bukti tidak valid untuk sesi ini." };
  }

  const { error } = await supabase.from("field_logs").insert({
    client_id: entry.client_id,
    session_id: entry.session_id,
    waktu_kejadian: entry.waktu_kejadian,
    jenis_entri: entry.jenis_entri,
    payload: entry.payload as Json,
    bukti_url: entry.bukti_path ?? null,
    // pengawal_id sengaja tidak dikirim: database mengisinya dari akun yang sedang masuk.
  });

  if (!error) return { ok: true, duplikat: false };

  if (isUniqueViolation(error, "field_logs_client_id_key")) {
    // Pastikan entri yang bentrok memang milik sesi ini dan terlihat oleh pengawal ini.
    const { data } = await supabase
      .from("field_logs")
      .select("id")
      .eq("client_id", entry.client_id)
      .eq("session_id", entry.session_id)
      .maybeSingle();
    if (data) return { ok: true, duplikat: true };
    return { ok: false, error: "Pengenal entri bentrok dengan entri lain. Buat entri baru." };
  }
  return { ok: false, error: mapDbError(error, DITOLAK) };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/lapangan");
}

/**
 * Kirim satu entri lapangan (serah terima, pemeriksaan berkala, gangguan, naikkan status, dan seterusnya).
 * Kenaikan status keamanan dan pencatatan gangguan terjadi otomatis di database.
 * Pengawal tidak bisa menurunkan status lewat jalur mana pun.
 */
export async function submitFieldLog(input: unknown): Promise<ActionResult<{ duplikat: boolean }>> {
  const auth = await authorize(["pengawal"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = fieldLogSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const hasil = await insertEntry(auth.supabase, parsed.data);
  if (!hasil.ok) return fail(hasil.error);
  refresh();
  return success({ duplikat: hasil.duplikat });
}

export type HasilBatch = {
  index: number;
  client_id: string | null;
  ok: boolean;
  duplikat?: boolean;
  error?: string;
};

/**
 * Kirim banyak entri sekaligus, misalnya catatan susulan yang ditulis saat tanpa sinyal.
 * Entri diproses berurutan menurut waktu kejadian (bukan urutan kirim), supaya kenaikan status
 * dan serah terima tercatat sesuai kejadian. Satu entri gagal tidak menghentikan yang lain.
 */
export async function submitFieldLogBatch(
  inputs: unknown
): Promise<ActionResult<{ hasil: HasilBatch[]; berhasil: number; gagal: number }>> {
  const auth = await authorize(["pengawal"]);
  if (!auth.ok) return fail(auth.error);
  const arr = fieldLogBatchSchema.safeParse(inputs);
  if (!arr.success) return zodFail(arr.error);

  const hasil: HasilBatch[] = arr.data.map((_, index) => ({ index, client_id: null, ok: false }));
  const valid: { index: number; entry: FieldLogEntry }[] = [];

  arr.data.forEach((raw, index) => {
    const p = fieldLogSchema.safeParse(raw);
    if (p.success) {
      hasil[index].client_id = p.data.client_id;
      valid.push({ index, entry: p.data });
    } else {
      const cid = (raw as { client_id?: unknown } | null)?.client_id;
      hasil[index] = {
        index,
        client_id: typeof cid === "string" ? cid : null,
        ok: false,
        error: p.error.issues[0]?.message ?? "Isian tidak valid.",
      };
    }
  });

  valid.sort((a, b) => Date.parse(a.entry.waktu_kejadian) - Date.parse(b.entry.waktu_kejadian) || a.index - b.index);

  for (const { index, entry } of valid) {
    const r = await insertEntry(auth.supabase, entry);
    hasil[index] = r.ok
      ? { index, client_id: entry.client_id, ok: true, duplikat: r.duplikat }
      : { index, client_id: entry.client_id, ok: false, error: r.error };
  }

  refresh();
  const berhasil = hasil.filter((h) => h.ok).length;
  return success({ hasil, berhasil, gagal: hasil.length - berhasil });
}
