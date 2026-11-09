import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Mengunduh berkas lewat tautan bertanda waktu (60 detik). Hak akses dicek lewat RLS pada tabel berkas dan Storage. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Berkas tidak valid.", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: b } = await supabase.from("berkas").select("sumber,storage_path,tautan,nama_berkas").eq("id", id).maybeSingle();
  if (!b) return new NextResponse("Berkas tidak ditemukan atau di luar cakupan Anda.", { status: 404 });

  if (b.sumber === "tautan" && b.tautan) return NextResponse.redirect(b.tautan);
  if (!b.storage_path) return new NextResponse("Berkas tidak tersedia.", { status: 404 });

  const { data, error } = await supabase.storage.from("pas-siaga-berkas").createSignedUrl(b.storage_path, 60, { download: b.nama_berkas ?? true });
  if (error || !data) return new NextResponse("Berkas belum bisa dibuka. Coba lagi.", { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}
