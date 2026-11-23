import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { NAMA_TAHAP, judulButir } from "@/lib/domain/tahap";
import { waktuLengkap } from "@/lib/domain/laporan-format";
import { hariIniWib, tambahHari } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const sel = (v: unknown) => {
  const t = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Rekap tahap dan lampiran dalam format CSV (titik koma) yang langsung terbuka rapi di Excel. */
export async function GET(req: Request) {
  const user = await requireUser();
  const supabase = await createClient();
  const u = new URL(req.url);
  const cak = await ambilCakupan(supabase, user, { kanwil: u.searchParams.get("kanwil") ?? undefined, upt: u.searchParams.get("upt") ?? undefined });

  let kueri = supabase
    .from("v_session_overview")
    .select("session_id,kode_kegiatan,jenis_kegiatan,lokasi_nama,tanggal_sesi,kode_upt,upt_nama,status_keamanan,jumlah_narapidana")
    .gte("tanggal_sesi", tambahHari(hariIniWib(), -120))
    .order("tanggal_sesi", { ascending: false })
    .limit(500);
  if (cak.uptDipilih) kueri = kueri.eq("kode_upt", cak.uptDipilih);
  else if (cak.kanwilDipilih) kueri = kueri.in("kode_upt", cak.upt.filter((x) => x.kanwil_id === cak.kanwilDipilih).map((x) => x.kode));
  const { data: sesi } = await kueri;
  const ids = (sesi ?? []).map((s) => s.session_id!).filter(Boolean);
  const peta = new Map((sesi ?? []).map((s) => [s.session_id, s]));
  const [tahap, lamp] = ids.length
    ? await Promise.all([
        supabase.from("tahap_pengawalan").select("session_id,tahap,jumlah_wb,jumlah_alat,waktu_sistem").in("session_id", ids),
        supabase.from("lampiran_tahap").select("session_id,tahap,butir,jenis,nama_berkas,ukuran_byte,waktu_sistem,sumber").in("session_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const kepala = ["Tanggal sesi", "UPT", "Kode kegiatan", "Jenis", "Lokasi", "Rencana WB", "Status", "Tahap", "Catatan", "Jumlah WB", "Jumlah alat", "Jenis lampiran", "Nama berkas", "Ukuran (KB)", "Penyimpanan", "Waktu sistem"];
  const baris: unknown[][] = [];
  for (const t of tahap.data ?? []) {
    const s = peta.get(t.session_id);
    baris.push([s?.tanggal_sesi, s?.upt_nama, s?.kode_kegiatan, s?.jenis_kegiatan, s?.lokasi_nama, s?.jumlah_narapidana, s?.status_keamanan, `${t.tahap}. ${NAMA_TAHAP[t.tahap]}`, "Tahap selesai", t.jumlah_wb, t.jumlah_alat, "", "", "", "", waktuLengkap(t.waktu_sistem)]);
  }
  for (const l of lamp.data ?? []) {
    const s = peta.get(l.session_id);
    baris.push([s?.tanggal_sesi, s?.upt_nama, s?.kode_kegiatan, s?.jenis_kegiatan, s?.lokasi_nama, s?.jumlah_narapidana, s?.status_keamanan, `${l.tahap}. ${NAMA_TAHAP[l.tahap]}`, "Lampiran", "", "", judulButir(l.butir), l.nama_berkas, Math.round(l.ukuran_byte / 1024), l.sumber === "drive" ? "Google Drive" : "Server aplikasi", waktuLengkap(l.waktu_sistem)]);
  }
  baris.sort((a, b) => String(b[0]).localeCompare(String(a[0])) || String(a[2]).localeCompare(String(b[2])) || String(a[7]).localeCompare(String(b[7])));
  const csv = "\uFEFF" + [kepala, ...baris].map((r) => r.map(sel).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekap-tahap-lampiran-${hariIniWib()}.csv"`,
    },
  });
}
