import { NextResponse, type NextRequest } from "next/server";
import { hitungEvaluasi, keCsv, parseIndikator } from "@/lib/domain/evaluasi";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const TGL = /^\d{4}-\d{2}-\d{2}$/;

/** Unduh CSV: indikator evaluasi dan rincian sesi pada periode. Cakupan data mengikuti hak akses (RLS). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Belum masuk.", { status: 401 });

  const dari = req.nextUrl.searchParams.get("dari") ?? "";
  const sampai = req.nextUrl.searchParams.get("sampai") ?? "";
  if (!TGL.test(dari) || !TGL.test(sampai)) return new NextResponse("Periode tidak valid.", { status: 400 });

  const [ind, sesi] = await Promise.all([
    supabase.rpc("indikator_evaluasi", { p_dari: dari, p_sampai: sampai }),
    supabase.from("v_session_overview").select("*").gte("tanggal_sesi", dari).lte("tanggal_sesi", sampai).order("tanggal_sesi"),
  ]);
  const indikator = parseIndikator(ind.data);
  if (!indikator || sesi.error) return new NextResponse("Data belum bisa dibaca.", { status: 500 });

  const baris: (string | number | null)[][] = [
    ["Periode", `${dari} s.d. ${sampai}`],
    [],
    ["Kode", "Indikator", "Capaian", "Target", "Hasil"],
    ...hitungEvaluasi(indikator).map((b) => [b.kode, b.nama, b.tampil, b.target, b.tercapai === null ? "Belum dinilai" : b.tercapai ? "Tercapai" : "Belum tercapai"]),
    [],
    ["Tanggal", "Kode kegiatan", "UPT", "Jenis", "Lokasi", "Kesiapan", "Status keamanan", "Tahap", "WB rencana", "WB keluar", "WB kembali", "Gangguan terbuka", "Tindak lanjut terlambat", "Ditutup"],
    ...(sesi.data ?? []).map((s) => [s.tanggal_sesi, s.kode_kegiatan, s.upt_nama ?? s.kode_upt, s.jenis_kegiatan, s.lokasi_nama, s.status_kesiapan, s.status_keamanan, s.fase, s.jumlah_narapidana, s.wbp_keluar, s.wbp_kembali, s.gangguan_terbuka, s.tindak_lanjut_terlambat, s.ditutup_at ? "Ya" : "Tidak"]),
  ];
  return new NextResponse(keCsv(baris), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="evaluasi-pas-siaga-${dari}_${sampai}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
