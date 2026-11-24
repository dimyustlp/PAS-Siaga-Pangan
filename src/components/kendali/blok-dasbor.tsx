import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/form";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import type { SesiLengkap } from "@/lib/data/session-full";
import { BLOK_DASBOR } from "@/lib/domain/dokumen-wajib";
import { VARIABEL_STATUS } from "@/lib/domain/instrumen-status";
import { fmtWaktu } from "@/lib/format";
import { longgar } from "@/lib/supabase/longgar";
import { createClient } from "@/lib/supabase/server";

type Baris = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined || v === "" ? "-" : String(v));
const n = (v: unknown) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(v ?? 0));

/** Delapan blok isi dasbor menurut pedoman, untuk satu pelaksanaan harian. */
export async function BlokDasborSesi({ data }: { data: SesiLengkap }) {
  const { sesi, kegiatan, lokasi, ringkas, rekonsiliasi } = data;
  const db = longgar(await createClient());
  const [kel, ptg, vars, alat, akses, kual, sebagian] = await Promise.all([
    db.from("sesi_kelompok").select("nama,jumlah_wb,area_aktif,pengawas").eq("session_id", sesi.id),
    db.from("petugas_sesi").select("nama").eq("session_id", sesi.id),
    db.from("status_variabel").select("no,status").eq("session_id", sesi.id),
    db.from("kontrol_alat").select("jenis,selisih,tindakan").eq("session_id", sesi.id),
    db.from("akses_pihak_luar").select("id,waktu_masuk,waktu_keluar,barang_hasil,jumlah,satuan,serah_terima").eq("session_id", sesi.id),
    db.from("v_kualitas_data").select("*").eq("session_id", sesi.id).maybeSingle(),
    db.from("pengembalian_sebagian").select("jumlah_wb").eq("session_id", sesi.id),
  ]);
  const kelompok = (kel.data ?? []) as Baris[];
  const petugas = (ptg.data ?? []) as Baris[];
  const peta = new Map(((vars.data ?? []) as Baris[]).map((v) => [Number(v.no), v.status as SecurityStatus | null]));
  const alatRows = (alat.data ?? []) as Baris[];
  const aksesRows = (akses.data ?? []) as Baris[];
  const kq = (kual.data ?? null) as Baris | null;
  const selisihAlat = alatRows.filter((a) => Number(a.selisih ?? 0) !== 0);
  const selisihBelumTindak = selisihAlat.filter((a) => !a.tindakan).length;
  const apdRows = alatRows.filter((a) => a.jenis === "APD");
  const bahanRows = alatRows.filter((a) => a.jenis === "Bahan");
  const tlTerbuka = data.tindakLanjut.filter((t) => !t.selesai_at).length;
  const sebagianTotal = ((sebagian.data ?? []) as Baris[]).reduce((a, b) => a + Number(b.jumlah_wb ?? 0), 0);
  const kejadian = data.gangguan.length;
  const kejadianTerbuka = data.gangguan.filter((g) => !g.status_penyelesaian).length;
  const belumDiperiksa = VARIABEL_STATUS.filter((v) => !peta.has(v.no) && !(v.no === 7 && !sesi.pakai_gelang_monitor)).length;

  const isi: React.ReactNode[] = [
    <p key="1">
      {ringkas.upt_nama ?? ringkas.kode_upt} · {kegiatan.kode_kegiatan} · <StatusBadge status={sesi.status_keamanan as SecurityStatus} />
      <br />WB keluar {s(ringkas.wbp_keluar)}, dihitung terakhir {s(ringkas.wbp_terakhir_dihitung)}, kembali {s(ringkas.wbp_kembali)}. Pengawal {sesi.petugas_ids.length} akun. Lahan aktif {sesi.lahan_aktif_ha === null ? "belum diisi" : `${n(sesi.lahan_aktif_ha)} ha`}.
      <br />Pembaruan terakhir {ringkas.diperbarui_at ? fmtWaktu(ringkas.diperbarui_at) : "-"}.
    </p>,
    <p key="2">
      {lokasi?.nama ?? "-"} ({lokasi?.posisi ?? "-"}) · Lahan tersedia {kegiatan.luas_lahan_ha === null ? "-" : `${n(kegiatan.luas_lahan_ha)} ha`}, aktif {sesi.lahan_aktif_ha === null ? "-" : `${n(sesi.lahan_aktif_ha)} ha`}.
      <br />Komoditas {s(kegiatan.komoditas)} · Tahap {s(kegiatan.tahap_pekerjaan)} · Mitra {s(kegiatan.mitra)}.
      <br />Batas area: {s(kegiatan.batas_area)}. Kelompok kerja: {kelompok.length === 0 ? "belum diisi" : kelompok.map((k) => `${k.nama} (${k.jumlah_wb} WB)`).join(", ")}.
    </p>,
    <p key="3">
      Nominatif {data.nominatif ? data.nominatif.length : "-"} dari {sesi.jumlah_narapidana} WB. Petugas tercatat: {petugas.length === 0 ? "belum ada" : petugas.map((p) => p.nama).join(", ")}.
      <br />Pengawas kelompok: {kelompok.map((k) => s(k.pengawas)).filter((x) => x !== "-").join(", ") || "belum diisi"}. Hitungan terakhir {s(ringkas.wbp_terakhir_dihitung)} WB.
    </p>,
    <p key="4" className="space-y-1">
      <span className="flex flex-wrap items-center gap-1.5">
        {VARIABEL_STATUS.map((v) => {
          const st = peta.get(v.no);
          return <Pill key={v.no} tone={st === "HIJAU" ? "hijau" : st === "KUNING" ? "kuning" : st ? "merah" : "netral"}>{v.no}: {peta.has(v.no) ? (st ?? "TB") : "belum diperiksa"}</Pill>;
        })}
      </span>
      <span className="block">{belumDiperiksa} variabel belum diperiksa. Tindak lanjut terbuka: {tlTerbuka} dari {data.tindakLanjut.length}.</span>
    </p>,
    <p key="5">
      Gelang monitor: {sesi.pakai_gelang_monitor ? "ditetapkan" : "tidak ditetapkan"}. Gangguan atau kejadian tercatat {kejadian}, belum diverifikasi {kejadianTerbuka}.
    </p>,
    <p key="6">
      Rekonsiliasi: WB keluar {s(rekonsiliasi?.wbpKeluar)}, kembali {s(rekonsiliasi?.wbpKembali)} (pengembalian sebagian {sebagianTotal}); alat keluar {s(rekonsiliasi?.alatKeluar)}, kembali {s(rekonsiliasi?.alatKembali)}. {rekonsiliasi?.siapTutup ? "Siap ditutup." : `Belum siap ditutup${rekonsiliasi?.alasan.length ? `: ${rekonsiliasi.alasan.join("; ")}` : ""}.`}
      <br />Pemeriksaan lapangan terakhir {kq?.cek_terakhir_at ? fmtWaktu(String(kq.cek_terakhir_at)) : "-"}; data diterima terakhir {kq?.diterima_terakhir_at ? fmtWaktu(String(kq.diterima_terakhir_at)) : "-"}. Entri susulan {n(kq?.entri_susulan)}, terlambat {n(kq?.entri_terlambat)}, belum diverifikasi {n(kq?.entri_belum_verifikasi)}.
    </p>,
    <p key="7">
      APD tercatat {apdRows.length} baris, bahan terkendali {bahanRows.length} baris. Selisih alat atau bahan {selisihAlat.length}, belum ada tindakan {selisihBelumTindak}. Kecelakaan atau kejadian keselamatan dicatat melalui gangguan.
    </p>,
    <p key="8">
      Pihak luar atau kendaraan tercatat {aksesRows.length}. Serah terima muatan atau hasil tercatat {aksesRows.filter((a) => a.serah_terima).length} dari {aksesRows.filter((a) => a.barang_hasil).length} yang membawa barang atau hasil.
    </p>,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Isi dasbor menurut pedoman</CardTitle>
        <CardDescription>Delapan blok data minimum. Waktu pemeriksaan lapangan dan waktu data diterima ditampilkan terpisah; entri terlambat atau belum diverifikasi tidak dianggap mutakhir.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {BLOK_DASBOR.map((b, i) => (
          <div key={b.judul} className="rounded-xl border border-border/70 bg-white/70 p-4 text-sm">
            <p className="mb-1.5 font-semibold">{i + 1}. {b.judul}</p>
            <div className="text-muted-foreground [&_b]:text-foreground">{isi[i]}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
