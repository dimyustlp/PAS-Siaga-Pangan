import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { longgar } from "@/lib/supabase/longgar";

export const dynamic = "force-dynamic";

/** Membuka berkas dokumen wajib (a sampai m) lewat tautan bertanda waktu. Hak lihat dicek oleh RLS. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string; kode: string }> }) {
  const { sessionId, kode } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[a-m]$/.test(kode)) return new NextResponse("Dokumen tidak valid.", { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data } = await longgar(supabase).from("sesi_dokumen").select("storage_path").eq("session_id", sessionId).eq("kode", kode).maybeSingle();
  const path = (data as { storage_path?: string | null } | null)?.storage_path;
  if (!path) return new NextResponse("Berkas belum diunggah atau di luar cakupan Anda.", { status: 404 });
  const { data: url, error } = await supabase.storage.from("pas-siaga-documents").createSignedUrl(path, 120);
  if (error || !url) return new NextResponse("Berkas belum bisa dibuka. Coba lagi.", { status: 502 });
  return NextResponse.redirect(url.signedUrl);
}
