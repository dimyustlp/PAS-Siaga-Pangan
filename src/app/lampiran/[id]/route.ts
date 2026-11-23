import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { alirkanDrive, infoLampiran } from "@/lib/data/lampiran";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Menampilkan lampiran tahap pengawalan kepada yang berhak (cek di database), dari Drive atau Supabase. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse("Tidak ditemukan", { status: 404 });
  const supabase = await createClient();
  const t = await infoLampiran(supabase, id);
  if (!t) return new NextResponse("Tidak ditemukan", { status: 404 });

  const kepala = {
    "Content-Type": t.mime,
    "Content-Disposition": `inline; filename="${t.nama.replace(/"/g, "")}"`,
    "Cache-Control": "private, max-age=600",
    "X-Content-Type-Options": "nosniff",
  };
  if (t.sumber === "supabase") {
    const { data } = await supabase.storage.from("pas-siaga-evidence").download(t.path);
    if (!data) return new NextResponse("Berkas tidak tersedia", { status: 404 });
    return new NextResponse(data, { headers: kepala });
  }
  return new NextResponse(alirkanDrive(t), { headers: { ...kepala, "Content-Length": String(t.ukuran) } });
}
