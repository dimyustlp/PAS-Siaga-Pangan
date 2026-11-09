import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { bacaWaktuAlarm } from "@/lib/validations/gelang";
import type { Database, Json } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

/**
 * Penerima alarm dari sistem pemantauan gelang (notifikasi "kirim permintaan ke URL").
 * Tanpa login pengguna: keamanannya ada pada kunci rahasia yang dicocokkan di database (hanya sidik jarinya yang disimpan).
 * Parameter: kunci, unit, jenis, waktu (opsional), lokasi, baterai. Boleh lewat query (GET) maupun badan permintaan (POST).
 */
async function tangani(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  let badan: Record<string, unknown> = {};
  if (req.method === "POST") {
    const mentah = (await req.text()).slice(0, 8000);
    try {
      const j = JSON.parse(mentah);
      if (j && typeof j === "object") badan = j as Record<string, unknown>;
    } catch {
      badan = Object.fromEntries(new URLSearchParams(mentah));
    }
  }
  const ambil = (k: string): string => {
    const v = q.get(k) ?? badan[k];
    return typeof v === "string" || typeof v === "number" ? String(v) : "";
  };

  const kunci = req.headers.get("x-kunci") || ambil("kunci");
  const unit = ambil("unit");
  if (!kunci || !unit) return NextResponse.json({ ok: false, pesan: "Parameter kunci dan unit wajib." }, { status: 400 });

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("terima_alarm_gelang", {
    p_kunci: kunci,
    p_unit: unit,
    p_jenis: ambil("jenis") || "Lainnya",
    p_waktu: bacaWaktuAlarm(ambil("waktu")),
    p_lokasi: ambil("lokasi") || null,
    p_baterai: ambil("baterai") || null,
    p_payload: { sumber: req.method, jenis_asli: ambil("jenis").slice(0, 200) } as Json,
  });
  if (error) {
    if (error.code === "28000") return NextResponse.json({ ok: false, pesan: "Kunci tidak sah." }, { status: 401 });
    return NextResponse.json({ ok: false, pesan: "Alarm belum bisa dicatat." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, hasil: data });
}

export const GET = tangani;
export const POST = tangani;
