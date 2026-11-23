import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KOLOM = { surat_perintah: "dokumen_surat_perintah", rencana_pengamanan: "dokumen_rencana_pengamanan" } as const;

/** Membuka dokumen sesi (surat perintah atau rencana pengamanan) lewat tautan bertanda waktu. Hak lihat dicek oleh RLS. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string; jenis: string }> }) {
  const { sessionId, jenis } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !(jenis in KOLOM)) return new NextResponse("Dokumen tidak valid.", { status: 400 });
  const kolom = KOLOM[jenis as keyof typeof KOLOM];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: s } = await supabase.from("daily_sessions").select("dokumen_surat_perintah,dokumen_rencana_pengamanan").eq("id", sessionId).maybeSingle();
  const path = s ? s[kolom] : null;
  if (!path) return new NextResponse("Dokumen belum diunggah atau di luar cakupan Anda.", { status: 404 });

  const { data, error } = await supabase.storage.from("pas-siaga-documents").createSignedUrl(path, 120);
  if (error || !data) return new NextResponse("Dokumen belum bisa dibuka. Coba lagi.", { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}
