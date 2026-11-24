import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { KopCetak } from "@/components/laporan/kop-cetak";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { ambilKopUpt } from "@/lib/data/kop-upt";
import { getSessionFull } from "@/lib/data/session-full";
import { DOKUMEN_WAJIB, type BarisDokumen } from "@/lib/domain/dokumen-wajib";
import { FORMULIR } from "@/lib/domain/formulir";
import { VARIABEL_STATUS } from "@/lib/domain/instrumen-status";
import { fmtTanggal, fmtWaktu } from "@/lib/format";
import { longgar } from "@/lib/supabase/longgar";
import { createClient } from "@/lib/supabase/server";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";

export const metadata = { title: "Formulir pelaksanaan" };
export const dynamic = "force-dynamic";

type Baris = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const T = "border border-black px-1.5 py-0.5 align-top";

function Tabel({ kolom, baris, kosong = "Tidak ada catatan." }: { kolom: string[]; baris: React.ReactNode[][]; kosong?: string }) {
  return (
    <table className="mb-3 w-full border-collapse text-[9.5pt]">
      <thead className="bg-[#eceff1]"><tr><th className={`${T} w-8`}>No</th>{kolom.map((k) => <th key={k} className={`${T} text-left`}>{k}</th>)}</tr></thead>
      <tbody>
        {baris.map((b, i) => <tr key={i}><td className={`${T} text-center`}>{i + 1}</td>{b.map((c, j) => <td key={j} className={T}>{c}</td>)}</tr>)}
        {baris.length === 0 && <tr><td colSpan={kolom.length + 1} className={T}>{kosong}</td></tr>}
      </tbody>
    </table>
  );
}
const Judul = ({ children }: { children: React.ReactNode }) => <p className="mb-1 mt-3 font-bold">{children}</p>;
function Pasangan({ item }: { item: [string, React.ReactNode][] }) {
  return (
    <table className="mb-2 w-full"><tbody>
      {item.map(([k, v]) => <tr key={k} className="align-top"><td className="w-52 py-0.5">{k}</td><td className="w-4">:</td><td>{v || "-"}</td></tr>)}
    </tbody></table>
  );
}

export default async function FormulirPage({ params }: { params: Promise<{ sessionId: string; no: string }> }) {
  const { sessionId, no } = await params;
  const nomor = Number(no);
  if (!z.string().uuid().safeParse(sessionId).success || !Number.isInteger(nomor) || nomor < 1 || nomor > 10) notFound();
  if (nomor === 8) redirect("/penilaian");
  await requireUser();
  const data = await getSessionFull(sessionId, { dengan_nominatif: true });
  if (!data) notFound();
  const { sesi, kegiatan, lokasi, ringkas } = data;
  const supabase = await createClient();
  const db = longgar(supabase);
  const kop = await ambilKopUpt(kegiatan.kode_upt ?? "");
  const meta = FORMULIR.find((f) => f.no === nomor)!;
  const nama = (id: string | null | undefined) => (id ? data.nama.get(id) ?? "-" : "-");

  let isi: React.ReactNode = null;

  if (nomor === 1) {
    const [dok, kel] = await Promise.all([
      db.from("sesi_dokumen").select("*").eq("session_id", sessionId).order("kode"),
      db.from("sesi_kelompok").select("*").eq("session_id", sessionId).order("created_at"),
    ]);
    const bd = (dok.data ?? []) as BarisDokumen[];
    const peta = new Map(data.kesiapan.map((k) => [k.kode, k]));
    const keputusan = data.keputusan.filter((k) => ["Dapat Dimulai", "Perbaiki Dulu", "Ditunda"].includes(k.jenis_keputusan)).at(-1);
    isi = (
      <>
        <Judul>A. Rencana kegiatan</Judul>
        <Pasangan item={[
          ["Kegiatan", `${kegiatan.jenis_kegiatan} (${kegiatan.kode_kegiatan})`], ["Lokasi", `${lokasi?.nama ?? ""} (${lokasi?.posisi ?? ""})`],
          ["Komoditas", s(kegiatan.komoditas)], ["Tahap pekerjaan", s(kegiatan.tahap_pekerjaan)], ["Mitra", s(kegiatan.mitra)], ["Pendamping teknis", s(kegiatan.pendamping_teknis)],
          ["Tanggal pelaksanaan", fmtTanggal(sesi.tanggal_sesi)], ["Jam kegiatan dan kembali", `${s(kegiatan.jam_kegiatan) || "-"} s.d. ${s(kegiatan.jam_kembali) || "-"}`],
          ["Lahan tersedia / aktif (ha)", `${s(kegiatan.luas_lahan_ha) || "-"} / ${s(sesi.lahan_aktif_ha) || "-"}`], ["Batas area", s(kegiatan.batas_area)],
          ["Rute", s(kegiatan.rute)], ["Titik komunikasi", s(kegiatan.titik_komunikasi)], ["Jumlah WB peserta", s(sesi.jumlah_narapidana)], ["Jumlah alat kerja", s(sesi.jumlah_alat_kerja)], ["Rincian alat", s(sesi.rincian_alat)],
          ["Nomor persetujuan", s(kegiatan.nomor_persetujuan)], ["Nomor surat perintah", s(kegiatan.nomor_surat_perintah)], ["Gelang monitor", sesi.pakai_gelang_monitor ? "Ditetapkan" : "Tidak ditetapkan"],
        ]} />
        <Judul>B. Kelompok kerja</Judul>
        <Tabel kolom={["Kelompok", "Jumlah WB", "Area aktif", "Pengawas", "Pengganti", "Jalur serah terima"]} baris={((kel.data ?? []) as Baris[]).map((k) => [s(k.nama), s(k.jumlah_wb), s(k.area_aktif), s(k.pengawas), s(k.pengganti), s(k.jalur_serah_terima)])} />
        <Judul>C. Pemeriksaan kesiapan pengamanan (aspek A sampai F)</Judul>
        <Tabel kolom={["Aspek", "Hasil", "Catatan"]} baris={INDIKATOR_KESIAPAN.map((i) => {
          const k = peta.get(i.kode);
          const hasil = i.kode === "f" && !sesi.pakai_gelang_monitor ? "Tidak Berlaku" : k?.terpenuhi ? "Terpenuhi" : "Belum Terpenuhi";
          return [`${i.kode.toUpperCase()}. ${i.judul}`, hasil, s(k?.catatan)];
        })} />
        <Judul>D. Dokumen yang harus tersedia</Judul>
        <Tabel kolom={["Dokumen", "Tersedia", "Nomor atau keterangan"]} baris={DOKUMEN_WAJIB.map((d) => {
          const b = bd.find((x) => x.kode === d.kode);
          const otomatis = d.otomatis === "nominatif" ? (data.nominatif?.length ?? 0) > 0 : d.otomatis === "rencana_pengamanan" ? !!sesi.dokumen_rencana_pengamanan : d.otomatis === "surat_perintah" ? !!sesi.dokumen_surat_perintah : null;
          const ada = otomatis !== null ? otomatis : !!b?.tersedia;
          return [`${d.kode}. ${d.judul}`, !b?.berlaku ? "Tidak berlaku" : ada ? "Ya" : "Belum", b?.berlaku ? s(b?.nomor) : s(b?.alasan_tb)];
        })} />
        <Judul>E. Keputusan kesiapan</Judul>
        <Pasangan item={[["Keputusan", keputusan?.jenis_keputusan ?? s(sesi.status_kesiapan)], ["Alasan atau catatan", s(keputusan?.catatan_keputusan)], ["Syarat pengajuan ulang", s(keputusan?.syarat_pengajuan_ulang)], ["Waktu keputusan", keputusan ? fmtWaktu(keputusan.created_at) : ""]]} />
      </>
    );
  } else if (nomor === 2) {
    const tahap = await supabase.from("tahap_pengawalan").select("tahap,jumlah_wb,jumlah_alat,waktu_sistem,pengawal_id").eq("session_id", sessionId).order("tahap");
    const kel = await db.from("sesi_kelompok").select("*").eq("session_id", sessionId).order("created_at");
    const logs = data.logs.filter((l) => l.jenis_entri === "Serah terima di blok" || l.jenis_entri === "Pindah area atau ganti pengawal");
    isi = (
      <>
        <Judul>A. Daftar nominatif ({data.nominatif?.length ?? 0} WB)</Judul>
        <Tabel kolom={["Nama", "Nomor registrasi", "Kelompok", "Paraf"]} baris={(data.nominatif ?? []).map((n) => [n.nama, n.nomor_registrasi, "", ""])} />
        <Judul>B. Kelompok kerja</Judul>
        <Tabel kolom={["Kelompok", "Jumlah WB", "Pengawas", "Jalur serah terima"]} baris={((kel.data ?? []) as Baris[]).map((k) => [s(k.nama), s(k.jumlah_wb), s(k.pengawas), s(k.jalur_serah_terima)])} />
        <Judul>C. Serah terima</Judul>
        <Tabel kolom={["Waktu", "Jenis", "Isi catatan", "Petugas"]} baris={logs.map((l) => [fmtWaktu(l.waktu_kejadian), l.jenis_entri, JSON.stringify(l.payload).replace(/[{}"]/g, "").replace(/,/g, ", "), nama(l.pengawal_id)])} />
        <Judul>D. Jumlah per tahap</Judul>
        <Tabel kolom={["Tahap", "WB", "Alat", "Waktu"]} baris={(tahap.data ?? []).map((t) => [`Tahap ${t.tahap}`, s(t.jumlah_wb), s(t.jumlah_alat), fmtWaktu(t.waktu_sistem)])} />
      </>
    );
  } else if (nomor === 3) {
    const [tahap, sb] = await Promise.all([
      supabase.from("tahap_pengawalan").select("tahap,jumlah_wb,jumlah_alat,waktu_sistem").eq("session_id", sessionId).order("tahap"),
      db.from("pengembalian_sebagian").select("*").eq("session_id", sessionId).order("waktu_serah"),
    ]);
    const r = data.rekonsiliasi;
    isi = (
      <>
        <Judul>A. Ekspedisi per tahap</Judul>
        <Tabel kolom={["Tahap", "Jumlah WB", "Jumlah alat", "Waktu dicatat"]} baris={(tahap.data ?? []).map((t) => [`Tahap ${t.tahap}`, s(t.jumlah_wb), s(t.jumlah_alat), fmtWaktu(t.waktu_sistem)])} />
        <Judul>B. Pengembalian sebagian</Judul>
        <Tabel kolom={["Waktu", "WB", "Alat", "Penyerah", "Penerima", "Catatan"]} baris={((sb.data ?? []) as Baris[]).map((x) => [fmtWaktu(s(x.waktu_serah)), s(x.jumlah_wb), s(x.jumlah_alat), s(x.penyerah), s(x.penerima), s(x.catatan)])} kosong="Tidak ada pengembalian sebagian." />
        <Judul>C. Pencocokan akhir</Judul>
        <Pasangan item={[["WB keluar", s(r?.wbpKeluar)], ["WB kembali (akhir + sebagian, tanpa hitung ganda)", s(r?.wbpKembali)], ["Alat keluar", s(r?.alatKeluar)], ["Alat kembali", s(r?.alatKembali)], ["Penggeledahan saat masuk blok", r?.penggeledahan === null || r?.penggeledahan === undefined ? "" : r.penggeledahan ? "Ya" : "Tidak"], ["Gangguan belum diverifikasi", s(r?.gangguanBelumDiverifikasi)], ["Hasil", r?.siapTutup ? "Cocok dan siap ditutup" : `Belum siap ditutup${r?.alasan.length ? `: ${r.alasan.join("; ")}` : ""}`], ["Ditutup", sesi.ditutup_at ? fmtWaktu(sesi.ditutup_at) : "Belum"]]} />
      </>
    );
  } else if (nomor === 4) {
    isi = (
      <>
        <Judul>A. Catatan lapangan</Judul>
        <Tabel kolom={["Waktu kejadian", "Diterima", "Jenis", "Isi", "Petugas", "Keterangan"]} baris={[...data.logs].sort((a, b) => a.waktu_kejadian.localeCompare(b.waktu_kejadian)).map((l) => [fmtWaktu(l.waktu_kejadian), fmtWaktu(l.dikirim_at), l.jenis_entri, JSON.stringify(l.payload).replace(/[{}"]/g, "").replace(/,/g, ", "), nama(l.pengawal_id), `${l.susulan ? "Susulan. " : ""}${l.diverifikasi_at ? `Diverifikasi ${fmtWaktu(l.diverifikasi_at)}` : "Belum diverifikasi"}`])} />
        <Judul>B. Keputusan Kepala Pengamanan</Judul>
        <Tabel kolom={["Waktu", "Keputusan", "Catatan", "Pejabat"]} baris={data.keputusan.map((k) => [fmtWaktu(k.created_at), k.jenis_keputusan, s(k.catatan_keputusan), nama(k.pejabat_id)])} />
      </>
    );
  } else if (nomor === 5) {
    const gelang = data.logs.filter((l) => l.jenis_entri === "Alarm gelang" || l.jenis_entri === "Pemeriksaan gelang");
    isi = (
      <>
        <Pasangan item={[["Gelang monitor", sesi.pakai_gelang_monitor ? "Ditetapkan untuk kegiatan ini" : "Tidak ditetapkan (variabel gelang tidak berlaku)"]]} />
        <Tabel kolom={["Waktu kejadian", "Jenis", "Isi, konfirmasi fisik WB, dan tindakan", "Petugas"]} baris={gelang.map((l) => [fmtWaktu(l.waktu_kejadian), l.jenis_entri, JSON.stringify(l.payload).replace(/[{}"]/g, "").replace(/,/g, ", "), nama(l.pengawal_id)])} kosong="Tidak ada catatan gelang." />
        <p className="text-[9pt]">Gelang tidak menggantikan pengawasan langsung dan tidak digunakan sebagai hukuman disiplin.</p>
      </>
    );
  } else if (nomor === 6) {
    isi = (
      <>
        <Judul>A. Gangguan</Judul>
        <Tabel kolom={["Kategori", "Tindakan awal", "Penanggung jawab", "Verifikasi pemulihan"]} baris={data.gangguan.map((g) => [g.kategori_gangguan, s(g.tindakan_awal), s(g.penanggung_jawab_tindak_lanjut), g.status_penyelesaian ? `Terverifikasi ${g.diverifikasi_at ? fmtWaktu(g.diverifikasi_at) : ""}` : "Belum"])} />
        <Judul>B. Tindak lanjut</Judul>
        <Tabel kolom={["Uraian", "Penanggung jawab", "Tenggat", "Status", "Bukti dan penyelesaian"]} baris={data.tindakLanjut.map((t) => [t.uraian, t.penanggung_jawab_nama, fmtTanggal(t.tenggat), t.status, `${s(t.catatan_selesai)} ${t.diverifikasi_at ? `Diverifikasi ${fmtWaktu(t.diverifikasi_at)}` : ""}`])} />
        <Judul>C. Riwayat status keamanan</Judul>
        <Tabel kolom={["Waktu", "Dari", "Ke", "Sumber", "Alasan"]} baris={data.riwayatStatus.map((r) => [fmtWaktu(r.waktu), s(r.dari), s(r.ke), s(r.sumber), s(r.alasan)])} />
      </>
    );
  } else if (nomor === 7) {
    const [vars, riw] = await Promise.all([
      db.from("status_variabel").select("*").eq("session_id", sessionId),
      db.from("status_variabel_riwayat").select("*").eq("session_id", sessionId).order("waktu"),
    ]);
    const peta = new Map(((vars.data ?? []) as Baris[]).map((v) => [Number(v.no), v]));
    isi = (
      <>
        <Pasangan item={[["Status keseluruhan", s(sesi.status_keamanan)], ["Aturan", "Mengikuti temuan terberat yang masih berlangsung, tidak dirata-ratakan."]]} />
        <Tabel kolom={["Variabel", "Status", "Temuan dan tindakan", "Bukti", "Dicatat"]} baris={VARIABEL_STATUS.map((v) => {
          const b = peta.get(v.no);
          const tbGelang = v.no === 7 && !sesi.pakai_gelang_monitor;
          return [`${v.no}. ${v.judul}`, b ? (b.status === null ? "Tidak berlaku" : s(b.status)) : tbGelang ? "Tidak berlaku" : "Belum diperiksa", s(b?.tindak_lanjut), s(b?.bukti) || (b?.status === null ? s(b?.alasan_tb) : ""), b ? fmtWaktu(s(b.diperbarui_at)) : ""];
        })} />
        <Judul>Riwayat perubahan</Judul>
        <Tabel kolom={["Waktu", "Variabel", "Dari", "Ke", "Alasan"]} baris={((riw.data ?? []) as Baris[]).map((r) => [fmtWaktu(s(r.waktu)), s(r.no), s(r.dari), r.tb ? "Tidak berlaku" : s(r.ke), s(r.alasan)])} />
      </>
    );
  } else if (nomor === 9) {
    const alat = await db.from("kontrol_alat").select("*").eq("session_id", sessionId).order("created_at");
    isi = (
      <Tabel kolom={["Jenis", "Nama", "Diserahkan", "Digunakan", "Kembali atau sisa", "Selisih", "Tindakan atas selisih", "Petugas"]} baris={((alat.data ?? []) as Baris[]).map((a) => [s(a.jenis), s(a.nama), `${s(a.diserahkan)} ${s(a.satuan)}`, s(a.digunakan), s(a.kembali), s(a.selisih), s(a.tindakan), s(a.petugas)])} />
    );
  } else {
    const akses = await db.from("akses_pihak_luar").select("*").eq("session_id", sessionId).order("created_at");
    isi = (
      <Tabel kolom={["Identitas dan kendaraan", "Tujuan", "Masuk", "Keluar", "Barang atau hasil", "Asal dan tujuan", "Pemeriksaan dan serah terima"]} baris={((akses.data ?? []) as Baris[]).map((a) => [`${s(a.identitas)} ${s(a.kendaraan)}`, s(a.tujuan), a.waktu_masuk ? fmtWaktu(s(a.waktu_masuk)) : "", a.waktu_keluar ? fmtWaktu(s(a.waktu_keluar)) : "", `${s(a.barang_hasil)} ${a.jumlah !== null && a.jumlah !== undefined ? `${s(a.jumlah)} ${s(a.satuan)}` : ""}`, s(a.asal_tujuan), `${s(a.pemeriksaan)} ${s(a.serah_terima)}`])} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print mx-auto flex max-w-[21cm] flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link href={`/sesi/${sessionId}/formulir`}>Daftar formulir</Link></Button>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[21cm] bg-white px-[1.4cm] py-[1.2cm] font-serif text-[10.5pt] leading-snug text-black shadow-soft print:max-w-none print:p-0 print:shadow-none">
        <KopCetak kop={kop} />
        <p className="text-center font-bold">FORMULIR {nomor}</p>
        <p className="text-center font-bold uppercase">{meta.judul}</p>
        <p className="mb-3 text-center">Nomor: ......................................</p>
        <Pasangan item={[["UPT", kop.upt], ["Kegiatan", `${kegiatan.kode_kegiatan} · ${kegiatan.jenis_kegiatan}`], ["Tanggal pelaksanaan", fmtTanggal(sesi.tanggal_sesi)], ["Lokasi", lokasi?.nama ?? ""], ["Status pengamanan saat dicetak", `${s(sesi.status_keamanan)} (pembaruan terakhir ${ringkas.diperbarui_at ? fmtWaktu(ringkas.diperbarui_at) : "-"})`]]} />
        {isi}
        <div className="mt-8 grid grid-cols-2 gap-8 text-center">
          <div><p>Dibuat oleh,</p><div className="h-16" /><p>(.......................................)</p></div>
          <div><p>{kop.kota ? `${kop.kota}, ` : ""}........................<br />Diverifikasi oleh Kepala Pengamanan,</p><div className="h-16" /><p>(.......................................)</p></div>
        </div>
      </article>
    </div>
  );
}
