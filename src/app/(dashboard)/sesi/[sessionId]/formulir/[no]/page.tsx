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

function Tabel({ kolom, baris, kosong = "Tidak ada catatan.", nomor = true, noUrut = false, minBaris = 0 }: { kolom: string[]; baris: React.ReactNode[][]; kosong?: string; nomor?: boolean; noUrut?: boolean; minBaris?: number }) {
  const lebar = kolom.length + (noUrut ? 1 : 0);
  const pad = Math.max(0, minBaris - baris.length);
  return (
    <table className="mb-3 w-full border-collapse text-[9.5pt]">
      <thead className="bg-[#eceff1]">
        <tr>{noUrut && <th className={`${T} w-8`}>No</th>}{kolom.map((k) => <th key={k} className={`${T} text-center`}>{k}</th>)}</tr>
        {nomor && <tr>{noUrut && <th className={`${T} font-normal`}>(1)</th>}{kolom.map((k, i) => <th key={k} className={`${T} font-normal`}>({i + 1 + (noUrut ? 1 : 0)})</th>)}</tr>}
      </thead>
      <tbody>
        {baris.map((b, i) => <tr key={i}>{noUrut && <td className={`${T} text-center`}>{i + 1}</td>}{b.map((c, j) => <td key={j} className={T}>{c}</td>)}</tr>)}
        {Array.from({ length: baris.length === 0 ? 0 : pad }).map((_, i) => <tr key={`p${i}`}>{noUrut && <td className={`${T} h-6 text-center`}>{baris.length + i + 1}</td>}{kolom.map((k) => <td key={k} className={`${T} h-6`} />)}</tr>)}
        {baris.length === 0 && <tr><td colSpan={lebar} className={T}>{kosong}</td></tr>}
      </tbody>
    </table>
  );
}
const Judul = ({ children }: { children: React.ReactNode }) => <p className="mb-1 mt-3 font-bold">{children}</p>;
function Pasangan({ item }: { item: [string, React.ReactNode][] }) {
  return (
    <table className="mb-2 w-full"><tbody>
      {item.map(([k, v]) => <tr key={k} className="align-top"><td className="w-[38%] py-0.5 pr-2">{k}</td><td className="w-4">:</td><td className="whitespace-pre-line">{v || "…"}</td></tr>)}
    </tbody></table>
  );
}
function Keterangan({ kolom }: { kolom: string[] }) {
  return (
    <div className="mt-2 text-[9pt] leading-tight">
      <p className="font-bold">Keterangan Pengisian:</p>
      <ol className="ml-4 list-decimal">
        <li>Tambahkan baris pada matriks untuk menyesuaikan dengan kondisi masing-masing satker atau wilayah.</li>
        <li>Keterangan kolom: {kolom.map((k, i) => <span key={i}>{i > 0 ? "; " : ""}kolom ({i + 1}) diisi dengan {k}</span>)}.</li>
      </ol>
    </div>
  );
}
const KET_NOMINATIF = ["nomor urut", "nama warga binaan", "kelompok", "waktu keluar", "waktu kembali", "catatan"];

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
  const tgl = fmtTanggal(sesi.tanggal_sesi);
  const kode = kegiatan.kode_kegiatan;
  const lokNama = lokasi?.nama ?? "";
  const gabung = (...x: unknown[]) => x.map((v) => s(v).trim()).filter(Boolean).join("; ");
  const petugasSesi = (sesi.petugas_ids ?? []).map((id: string) => nama(id)).filter((n: string) => n !== "-");
  const payloadTeks = (v: unknown) => {
    const o = (v ?? {}) as Record<string, unknown>;
    return Object.entries(o).map(([k, x]) => `${k.replace(/_/g, " ")}: ${typeof x === "boolean" ? (x ? "ya" : "tidak") : s(x)}`).join(", ");
  };
  const pl = (l: { payload: unknown }) => (l.payload ?? {}) as Record<string, unknown>;
  const urut = [...data.logs].sort((a, b) => a.waktu_kejadian.localeCompare(b.waktu_kejadian));
  const logJenis = (jenis: string, saring?: (p: Record<string, unknown>) => boolean) => urut.filter((l) => l.jenis_entri === jenis && (!saring || saring(pl(l))));

  let isi: React.ReactNode = null;
  let kolomKet: string[] | null = null;

  if (nomor === 1) {
    const [dok, kel] = await Promise.all([
      db.from("sesi_dokumen").select("*").eq("session_id", sessionId).order("kode"),
      db.from("sesi_kelompok").select("*").eq("session_id", sessionId).order("created_at"),
    ]);
    const bd = (dok.data ?? []) as BarisDokumen[];
    const kelompok = (kel.data ?? []) as Baris[];
    const peta = new Map(data.kesiapan.map((k) => [k.kode, k]));
    const keputusan = data.keputusan.filter((k) => ["Dapat Dimulai", "Perbaiki Dulu", "Ditunda"].includes(k.jenis_keputusan)).at(-1);
    const hasilAspek = (kd: string) => { const k = peta.get(kd); return kd === "f" && !sesi.pakai_gelang_monitor ? "Tidak Berlaku" : k?.terpenuhi ? "Terpenuhi" : "Belum Terpenuhi"; };
    const cat = (...kds: string[]) => kds.map((kd) => { const t = s(peta.get(kd)?.catatan); return t ? `${kd.toUpperCase()}: ${t}` : ""; }).filter(Boolean).join("\n");
    kolomKet = ["kelompok", "jumlah warga binaan", "area aktif", "pengawas", "pengganti atau jalur serah terima"];
    isi = (
      <>
        <Pasangan item={[
          ["UPT (Lapas/Rutan) dan nomor kegiatan", `${kop.upt} / ${kode} (${kegiatan.jenis_kegiatan})`],
          ["Tanggal dan jam kegiatan serta jam kembali", `${tgl}, ${s(kegiatan.jam_kegiatan) || "…"} s.d. ${s(kegiatan.jam_kembali) || "…"}`],
          ["Lokasi dan kedudukan terhadap perimeter utama", `${lokNama} (${lokasi?.posisi ?? ""})`],
          ["Komoditas, tahap pekerjaan, mitra dan pendamping teknis", gabung(kegiatan.komoditas, kegiatan.tahap_pekerjaan, kegiatan.mitra, kegiatan.pendamping_teknis)],
          ["Luas lahan tersedia dan luas area aktif", `${s(kegiatan.luas_lahan_ha) || "…"} ha / ${s(sesi.lahan_aktif_ha) || "…"} ha`],
          ["Batas area serta akses", gabung(kegiatan.batas_area, kegiatan.rute, kegiatan.titik_komunikasi, kegiatan.akses_warga)],
          ["Jumlah WB dan jumlah kelompok", `${s(sesi.jumlah_narapidana)} WB; ${kelompok.length} kelompok`],
          ["Pengawal serta pengawas yang ditugaskan", gabung(petugasSesi.join(", "), kelompok.map((k) => s(k.pengawas)).filter(Boolean).join(", "))],
          ["Interval pemeriksaan dan batas pembaruan data", `${sesi.interval_pemeriksaan} menit; batas keterlambatan ${sesi.batas_keterlambatan_menit} menit`],
          ["Alat, mesin, bahan yang dikendalikan, APD dan perangkat", gabung(`${s(sesi.jumlah_alat_kerja)} alat kerja`, sesi.rincian_alat, sesi.pakai_gelang_monitor ? "gelang monitor ditetapkan" : "gelang monitor tidak ditetapkan")],
        ]} />
        <Tabel kolom={["Kelompok", "Jumlah WB", "Area aktif", "Pengawas", "Pengganti atau jalur serah terima"]} minBaris={3} baris={kelompok.map((k) => [s(k.nama), s(k.jumlah_wb), s(k.area_aktif), s(k.pengawas), gabung(k.pengganti, k.jalur_serah_terima)])} />
        <Judul>Daftar periksa kesiapan A–F (Terpenuhi/Belum Terpenuhi; F dapat Tidak Berlaku)</Judul>
        <Tabel nomor={false} kolom={["Kode", "Aspek", "Hasil", "Kekurangan, perbaikan, dan pemeriksa"]} baris={INDIKATOR_KESIAPAN.map((i) => {
          const k = peta.get(i.kode);
          return [i.kode.toUpperCase(), i.judul, hasilAspek(i.kode), gabung(k?.catatan, k?.diperiksa_oleh ? `diperiksa ${nama(k.diperiksa_oleh)}${k.diperiksa_at ? ` ${fmtWaktu(k.diperiksa_at)}` : ""}` : "")];
        })} />
        <Judul>Hasil pemeriksaan dokumen wajib</Judul>
        <Tabel nomor={false} kolom={["Dokumen", "Tersedia", "Nomor atau keterangan"]} baris={DOKUMEN_WAJIB.map((d) => {
          const b = bd.find((x) => x.kode === d.kode);
          const otomatis = d.otomatis === "nominatif" ? (data.nominatif?.length ?? 0) > 0 : d.otomatis === "rencana_pengamanan" ? !!sesi.dokumen_rencana_pengamanan : d.otomatis === "surat_perintah" ? !!sesi.dokumen_surat_perintah : null;
          const ada = otomatis !== null ? otomatis : !!b?.tersedia;
          return [`${d.kode}. ${d.judul}`, !b?.berlaku ? "Tidak berlaku" : ada ? "Ya" : "Belum", b?.berlaku ? s(b?.nomor) : s(b?.alasan_tb)];
        })} />
        <Pasangan item={[
          ["Hasil pemeriksaan lokasi dan komunikasi", cat("c", "e")],
          ["Hasil pemeriksaan teknis/APD, pertolongan pertama dan jalur bantuan kesehatan", cat("d")],
          ["Keputusan mulai, perlu perbaikan, atau tunda", keputusan?.jenis_keputusan ?? s(sesi.status_kesiapan)],
          ["Perbaikan dan penanggung jawab", gabung(keputusan?.catatan_keputusan, keputusan?.syarat_pengajuan_ulang, sesi.bimker_penanggung_jawab)],
          ["Pemeriksa dan pemberi persetujuan beserta waktu", gabung(keputusan ? `${nama(keputusan.pejabat_id)}, ${fmtWaktu(keputusan.created_at)}` : "", sesi.disahkan_oleh ? `disahkan ${nama(sesi.disahkan_oleh)}${sesi.disahkan_at ? `, ${fmtWaktu(sesi.disahkan_at)}` : ""}` : "")],
        ]} />
      </>
    );
  } else if (nomor === 2) {
    const kel = await db.from("sesi_kelompok").select("*").eq("session_id", sessionId).order("created_at");
    const kelompok = (kel.data ?? []) as Baris[];
    const keluar = logJenis("Serah terima di blok", (p) => p.tahap === "keluar").at(-1);
    const kembali = logJenis("Serah terima di blok", (p) => p.tahap === "kembali").at(-1);
    const penyerahPenerima = gabung(sesi.petugas_blok ? `petugas blok: ${sesi.petugas_blok}` : "", sesi.petugas_p2u ? `petugas P2U: ${sesi.petugas_p2u}` : "", kembali ? s(pl(kembali).penerima) && `penerima: ${s(pl(kembali).penerima)}` : "");
    kolomKet = KET_NOMINATIF;
    isi = (
      <>
        <Pasangan item={[["Nomor kegiatan dan tanggal", `${kode}; ${tgl}`], ["Lokasi serta dasar pergerakan atau pengeluaran", gabung(lokNama, kegiatan.nomor_surat_perintah && `surat perintah ${kegiatan.nomor_surat_perintah}`, kegiatan.nomor_persetujuan && `persetujuan ${kegiatan.nomor_persetujuan}`)]]} />
        <Tabel noUrut kolom={["Identitas WB", "Kelompok", "Waktu keluar", "Waktu kembali", "Catatan"]} baris={(data.nominatif ?? []).map((n) => [`${n.nama} (${n.nomor_registrasi})`, kelompok.length === 1 ? s(kelompok[0].nama) : "", keluar ? fmtWaktu(keluar.waktu_kejadian) : "", kembali ? fmtWaktu(kembali.waktu_kejadian) : "", ""])} kosong="Daftar nominatif belum diisi." />
        <Pasangan item={[
          ["Petugas penyerah dan petugas penerima", penyerahPenerima],
          ["Jumlah menurut dokumen dan hasil hitung langsung", `${data.nominatif?.length ?? 0} WB menurut dokumen; keluar ${keluar ? s(pl(keluar).jumlah_wbp) : "…"}, kembali ${kembali ? s(pl(kembali).jumlah_wbp) : "…"} hasil hitung`],
          ["Waktu dan tanda tangan serah terima", gabung(keluar ? `keluar ${fmtWaktu(keluar.waktu_kejadian)}` : "", kembali ? `kembali ${fmtWaktu(kembali.waktu_kejadian)}` : "")],
        ]} />
      </>
    );
  } else if (nomor === 3) {
    const [tahap, sb, alat] = await Promise.all([
      supabase.from("tahap_pengawalan").select("tahap,jumlah_wb,jumlah_alat,waktu_sistem").eq("session_id", sessionId).order("tahap"),
      db.from("pengembalian_sebagian").select("*").eq("session_id", sessionId).order("waktu_serah"),
      db.from("kontrol_alat").select("*").eq("session_id", sessionId).order("created_at"),
    ]);
    const th = (n: number) => (tahap.data ?? []).find((t) => t.tahap === n);
    const jw = (j?: { jumlah_wb: number | null; waktu_sistem: string | null } | null) => (j ? `${s(j.jumlah_wb)} WB, ${j.waktu_sistem ? fmtWaktu(j.waktu_sistem) : "…"}` : "");
    const tiba = logJenis("Tiba di lokasi").at(0);
    const p2uMasuk = logJenis("P2U keluar atau masuk", (p) => p.arah === "masuk").at(-1);
    const blok = logJenis("Serah terima di blok", (p) => p.tahap === "kembali").at(-1);
    const r = data.rekonsiliasi;
    const sbList = (sb.data ?? []) as Baris[];
    const bahan = ((alat.data ?? []) as Baris[]).filter((a) => s(a.jenis) === "Bahan" && Number(a.kembali) > 0).map((a) => `${s(a.nama)} ${s(a.kembali)} ${s(a.satuan)}`);
    isi = (
      <>
        <Pasangan item={[
          ["Nomor kegiatan dan tanggal", `${kode}; ${tgl}`],
          ["Persetujuan serta surat perintah", gabung(kegiatan.nomor_persetujuan, kegiatan.nomor_surat_perintah)],
          ["Jumlah WB keluar P2U dan waktu", jw(th(1))],
          ["Jumlah tiba di lokasi dan waktu", tiba ? `${s(pl(tiba).jumlah_wbp)} WB, ${fmtWaktu(tiba.waktu_kejadian)}` : jw(th(2))],
          ["Jumlah meninggalkan lokasi dan waktu", jw(th(3))],
          ["Jumlah masuk P2U dan waktu", p2uMasuk ? `${s(pl(p2uMasuk).jumlah)} orang, ${fmtWaktu(p2uMasuk.waktu_kejadian)}` : jw(th(4))],
          ["Jumlah diterima blok dan waktu", blok ? `${s(pl(blok).jumlah_wbp)} WB, ${fmtWaktu(blok.waktu_kejadian)}` : ""],
          ["Alat, sisa bahan, dan dokumen muatan hasil keluar/kembali", gabung(r ? `alat keluar ${s(r.alatKeluar)}, kembali ${s(r.alatKembali)}` : "", bahan.length ? `sisa bahan: ${bahan.join(", ")}` : "")],
          ["Temuan selisih serta tindak lanjut", r ? (r.siapTutup ? "Tidak ada selisih" : r.alasan.join("; ")) : ""],
          ["Penyerah, penerima, dan verifikator", sbList.length ? sbList.map((x) => `${s(x.penyerah)} → ${s(x.penerima)}`).join("; ") : gabung(sesi.petugas_p2u, sesi.petugas_blok)],
          ["Status penutupan kegiatan beserta waktu", sesi.ditutup_at ? `Ditutup ${fmtWaktu(sesi.ditutup_at)}` : "Belum ditutup"],
        ]} />
        {sbList.length > 0 && (<>
          <Judul>Pengembalian sebagian</Judul>
          <Tabel nomor={false} kolom={["Waktu", "WB", "Alat", "Penyerah", "Penerima", "Catatan"]} baris={sbList.map((x) => [fmtWaktu(s(x.waktu_serah)), s(x.jumlah_wb), s(x.jumlah_alat), s(x.penyerah), s(x.penerima), s(x.catatan)])} />
        </>)}
      </>
    );
  } else if (nomor === 4) {
    const kel = await db.from("sesi_kelompok").select("nama").eq("session_id", sessionId);
    const kelompok = ((kel.data ?? []) as Baris[]).map((k) => s(k.nama)).filter(Boolean).join(", ");
    type R = { t: string; baris: React.ReactNode[] };
    const baris: R[] = [
      ...data.logs.map((l): R => ({ t: l.waktu_kejadian, baris: [fmtWaktu(l.waktu_kejadian), `${l.jenis_entri}: ${payloadTeks(l.payload)} (sumber: ${nama(l.pengawal_id)})`, s(pl(l).status_baru), "", gabung(nama(l.pengawal_id), l.susulan ? "susulan" : "", l.diverifikasi_at ? `diverifikasi ${fmtWaktu(l.diverifikasi_at)}` : "belum diverifikasi")] })),
      ...data.keputusan.map((k): R => ({ t: k.created_at, baris: [fmtWaktu(k.created_at), "Keputusan Kepala Pengamanan", s(k.status_baru), gabung(k.jenis_keputusan, k.catatan_keputusan, k.syarat_pengajuan_ulang), nama(k.pejabat_id)] })),
    ].sort((a, b) => a.t.localeCompare(b.t));
    const kepAkhir = [...data.keputusan].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
    const pulih = [...data.tindakLanjut.filter((t) => t.diverifikasi_at).map((t) => `${t.uraian}: terverifikasi ${fmtWaktu(t.diverifikasi_at!)}`), ...data.gangguan.filter((g) => g.diverifikasi_at).map((g) => `${g.kategori_gangguan}: terverifikasi ${fmtWaktu(g.diverifikasi_at!)}`)];
    kolomKet = ["waktu kegiatan", "temuan dan sumber", "status", "keputusan yang diambil", "petugas dan pemeriksaan ulang"];
    isi = (
      <>
        <Pasangan item={[["Nomor kegiatan, tanggal, lokasi, dan kelompok", gabung(kode, tgl, lokNama, kelompok)], ["Luas area aktif, jumlah WB, dan petugas", gabung(sesi.lahan_aktif_ha ? `${sesi.lahan_aktif_ha} ha` : "", `${sesi.jumlah_narapidana} WB`, petugasSesi.join(", "))]]} />
        <Tabel kolom={["Waktu", "Temuan dan sumber", "Status", "Keputusan dan tindakan", "Petugas dan pemeriksaan ulang"]} baris={baris.map((b) => b.baris)} minBaris={4} />
        <Pasangan item={[
          ["Pejabat pengambil keputusan dan waktu", kepAkhir ? `${nama(kepAkhir.pejabat_id)}, ${fmtWaktu(kepAkhir.created_at)}` : ""],
          ["Bukti pemulihan serta hasil verifikasi", pulih.join("\n")],
          ["Status sesudah verifikasi dan persetujuan", gabung(sesi.status_keamanan, sesi.disahkan_at ? `disahkan ${fmtWaktu(sesi.disahkan_at)}` : "")],
        ]} />
      </>
    );
  } else if (nomor === 5) {
    const gelang = urut.filter((l) => l.jenis_entri === "Alarm gelang" || l.jenis_entri === "Pemeriksaan gelang");
    const alarm = gelang.filter((l) => l.jenis_entri === "Alarm gelang");
    const periksa = gelang.filter((l) => l.jenis_entri === "Pemeriksaan gelang");
    const lepas = alarm.filter((l) => s(pl(l).jenis_alarm).startsWith("Perangkat dilepas"));
    isi = (
      <Pasangan item={[
        ["Nomor kegiatan, identitas WB serta perangkat", gabung(kode, [...new Set(alarm.map((l) => s(pl(l).nomor_registrasi)).filter(Boolean))].join(", "))],
        ["Penetapan penggunaan", sesi.pakai_gelang_monitor ? "Ditetapkan untuk kegiatan ini" : "Tidak ditetapkan (variabel gelang tidak berlaku)"],
        ["Waktu pasang dan lepas", lepas.map((l) => `lepas/rusak ${fmtWaktu(l.waktu_kejadian)}`).join("\n")],
        ["Pemeriksaan daya, sinyal, pemasangan serta fungsi", periksa.map((l) => `${fmtWaktu(l.waktu_kejadian)}: ${s(pl(l).jumlah_berfungsi)} dari ${s(pl(l).jumlah_diperiksa)} berfungsi${s(pl(l).catatan) ? ` (${s(pl(l).catatan)})` : ""}`).join("\n")],
        ["Waktu alarm dan waktu konfirmasi", alarm.map((l) => `${s(pl(l).jenis_alarm)} ${fmtWaktu(l.waktu_kejadian)}; konfirmasi ${l.diverifikasi_at ? fmtWaktu(l.diverifikasi_at) : "…"}`).join("\n")],
        ["Hasil pemeriksaan langsung WB", alarm.map((l) => `${fmtWaktu(l.waktu_kejadian)}: ${pl(l).dikonfirmasi_langsung === true ? "dikonfirmasi langsung" : pl(l).dikonfirmasi_langsung === false ? "belum dikonfirmasi langsung" : ""}`).join("\n")],
        ["Gangguan serta tindakan", alarm.map((l) => s(pl(l).tindakan)).filter(Boolean).join("\n")],
        ["Petugas pemeriksa dan hasil akhir", [...new Set(gelang.map((l) => nama(l.pengawal_id)))].join(", ")],
      ]} />
    );
  } else if (nomor === 6) {
    const blok = data.gangguan.map((g) => {
      const lg = data.logs.find((l) => l.id === g.log_id);
      const tl = data.tindakLanjut.filter((t) => t.incident_id === g.id);
      const kp = data.keputusan.filter((k) => k.incident_id === g.id);
      const cedera = /kecelakaan|cedera/i.test(g.kategori_gangguan);
      return (
        <div key={g.id} className="mb-3 break-inside-avoid border-t border-black pt-1">
          <Pasangan item={[
            ["Nomor kegiatan, waktu, lokasi", gabung(kode, lg ? fmtWaktu(lg.waktu_kejadian) : "", lokNama)],
            ["Jenis gangguan dan jumlah WB", gabung(g.kategori_gangguan, lg && pl(lg).jumlah !== undefined ? `${s(pl(lg).jumlah)} WB` : "")],
            ["Kronologi serta sumber temuan", lg ? gabung(s(pl(lg).keterangan) || s(pl(lg).catatan), `sumber: ${nama(lg.pengawal_id)}`) : ""],
            ["Kecelakaan/paparan/gangguan mesin; pertolongan dan bantuan kesehatan", cedera ? s(g.tindakan_awal) : ""],
            ["Status dan tindakan awal", gabung(lg ? s(pl(lg).status_baru) || "KUNING" : "", g.tindakan_awal)],
            ["Penerima laporan serta waktu laporan", lg ? gabung(nama(lg.pengawal_id), `dikirim ${fmtWaktu(lg.dikirim_at)}`) : ""],
            ["Perintah serta pejabat yang memutuskan", kp.map((k) => `${k.jenis_keputusan}${k.catatan_keputusan ? ` (${k.catatan_keputusan})` : ""}, ${nama(k.pejabat_id)}`).join("\n")],
            ["Penanggung jawab dan tenggat", tl.length ? tl.map((t) => `${t.penanggung_jawab_nama}, tenggat ${fmtTanggal(t.tenggat)}`).join("\n") : s(g.penanggung_jawab_tindak_lanjut)],
            ["Perkembangan serta bukti tindakan", tl.map((t) => `${t.uraian}: ${t.status}${t.catatan_selesai ? `; ${t.catatan_selesai}` : ""}`).join("\n")],
            ["Hasil verifikasi dan rekonsiliasi", g.diverifikasi_at ? `Terverifikasi ${fmtWaktu(g.diverifikasi_at)} oleh ${nama(g.diverifikasi_oleh)}` : ""],
            ["Usulan perbaikan serta penutupan", g.status_penyelesaian ? "Selesai" : ""],
          ]} />
        </div>
      );
    });
    isi = (
      <>
        {blok.length > 0 ? blok : <Pasangan item={["Nomor kegiatan, waktu, lokasi", "Jenis gangguan dan jumlah WB", "Kronologi serta sumber temuan", "Kecelakaan/paparan/gangguan mesin; pertolongan dan bantuan kesehatan", "Status dan tindakan awal", "Penerima laporan serta waktu laporan", "Perintah serta pejabat yang memutuskan", "Penanggung jawab dan tenggat", "Perkembangan serta bukti tindakan", "Hasil verifikasi dan rekonsiliasi", "Usulan perbaikan serta penutupan"].map((k) => [k, ""] as [string, string])} />}
        {data.riwayatStatus.length > 0 && (<>
          <Judul>Riwayat status keamanan</Judul>
          <Tabel nomor={false} kolom={["Waktu", "Dari", "Ke", "Sumber", "Alasan"]} baris={data.riwayatStatus.map((r) => [fmtWaktu(r.waktu), s(r.dari), s(r.ke), s(r.sumber), s(r.alasan)])} />
        </>)}
      </>
    );
  } else if (nomor === 7) {
    const [vars, riw] = await Promise.all([
      db.from("status_variabel").select("*").eq("session_id", sessionId),
      db.from("status_variabel_riwayat").select("*").eq("session_id", sessionId).order("waktu"),
    ]);
    const peta = new Map(((vars.data ?? []) as Baris[]).map((v) => [Number(v.no), v]));
    kolomKet = ["nama variabel", "status variabel", "bukti sumber dan waktu", "tindak lanjut"];
    const terakhirRiw = ((riw.data ?? []) as Baris[]).at(-1);
    isi = (
      <>
        <Pasangan item={[["Nomor kegiatan, tanggal dan waktu pemeriksaan", gabung(kode, tgl, ringkas.diperbarui_at ? fmtWaktu(ringkas.diperbarui_at) : "")]]} />
        <Tabel kolom={["Variabel", "Status atau tidak berlaku", "Bukti sumber dan waktu", "Tindak lanjut"]} baris={VARIABEL_STATUS.map((v) => {
          const b = peta.get(v.no);
          const tbGelang = v.no === 7 && !sesi.pakai_gelang_monitor;
          const bukti = b?.status === null ? s(b?.alasan_tb) : gabung(b?.bukti, b ? fmtWaktu(s(b.diperbarui_at)) : "");
          return [`${v.no}. ${v.judul}`, b ? (b.status === null ? "Tidak berlaku" : s(b.status)) : tbGelang ? "Tidak berlaku" : "Belum diperiksa", bukti, s(b?.tindak_lanjut)];
        })} />
        <Pasangan item={[
          ["Status keseluruhan dan alasan", gabung(sesi.status_keamanan, terakhirRiw ? s(terakhirRiw.alasan) : "", "mengikuti temuan terberat yang masih berlangsung")],
          ["Tindakan penanggung jawab dan pemeriksaan ulang", data.tindakLanjut.map((t) => `${t.uraian}: ${t.penanggung_jawab_nama}${t.pemeriksaan_ulang_at ? `, periksa ulang ${fmtWaktu(t.pemeriksaan_ulang_at)}` : ""}`).join("\n")],
          ["Verifikator waktu dan hasil pemulihan", data.tindakLanjut.filter((t) => t.diverifikasi_at).map((t) => `${nama(t.diverifikasi_oleh)}, ${fmtWaktu(t.diverifikasi_at!)}`).join("\n")],
        ]} />
        {((riw.data ?? []) as Baris[]).length > 0 && (<>
          <Judul>Riwayat perubahan</Judul>
          <Tabel nomor={false} kolom={["Waktu", "Variabel", "Dari", "Ke", "Alasan"]} baris={((riw.data ?? []) as Baris[]).map((r) => [fmtWaktu(s(r.waktu)), s(r.no), s(r.dari), r.tb ? "Tidak berlaku" : s(r.ke), s(r.alasan)])} />
        </>)}
      </>
    );
  } else if (nomor === 9) {
    const alat = ((await db.from("kontrol_alat").select("*").eq("session_id", sessionId).order("created_at")).data ?? []) as Baris[];
    kolomKet = ["nama alat, mesin, atau bahan beserta satuan", "jumlah diserahkan", "jumlah digunakan", "jumlah kembali atau sisa", "selisih, tindakan, dan petugas"];
    isi = (
      <>
        <Pasangan item={[
          ["UPT, nomor pelaksanaan harian, tanggal dan lokasi", `${kop.upt}; ${kode}; ${tgl}; ${lokNama}`],
          ["Tahap pekerjaan, pendamping teknis, pemeriksaan mesin dan APD", gabung(kegiatan.tahap_pekerjaan, kegiatan.pendamping_teknis, alat.filter((a) => ["Mesin", "APD"].includes(s(a.jenis)) && s(a.tindakan)).map((a) => `${s(a.nama)}: ${s(a.tindakan)}`).join(", "))],
        ]} />
        <Tabel kolom={["Alat/mesin/bahan dan satuan", "Diserahkan", "Digunakan", "Kembali/sisa", "Selisih, tindakan dan petugas"]} minBaris={4} baris={alat.map((a) => [`${s(a.nama)} (${s(a.jenis)}${a.satuan ? `, ${s(a.satuan)}` : ""})`, s(a.diserahkan), s(a.digunakan), s(a.kembali), gabung(a.selisih !== null && a.selisih !== undefined && Number(a.selisih) !== 0 ? `selisih ${s(a.selisih)}` : "", a.tindakan, a.petugas)])} />
        <Pasangan item={[["Petugas penyerah/penerima, pemeriksa dan waktu", [...new Set(alat.map((a) => s(a.petugas)).filter(Boolean))].join(", ")]]} />
      </>
    );
  } else {
    const akses = ((await db.from("akses_pihak_luar").select("*").eq("session_id", sessionId).order("created_at")).data ?? []) as Baris[];
    kolomKet = ["identitas atau jenis kendaraan", "tujuan dan waktu akses", "jenis dan satuan barang", "jumlah dan asal atau tujuan barang", "hasil pemeriksaan dan serah terima"];
    const wkt = (a: Baris) => gabung(a.waktu_masuk ? `masuk ${fmtWaktu(s(a.waktu_masuk))}` : "", a.waktu_keluar ? `keluar ${fmtWaktu(s(a.waktu_keluar))}` : "");
    isi = (
      <>
        <Pasangan item={[
          ["UPT, nomor pelaksanaan harian, tanggal dan lokasi", `${kop.upt}; ${kode}; ${tgl}; ${lokNama}`],
          ["Dasar persetujuan, petugas penerima dan pendamping", gabung(kegiatan.nomor_persetujuan, sesi.petugas_blok, kegiatan.pendamping_teknis)],
        ]} />
        <Tabel kolom={["Identitas/kendaraan", "Tujuan; waktu akses", "Barang/hasil dan satuan", "Jumlah; asal/tujuan", "Pemeriksaan; serah terima"]} minBaris={4} baris={akses.map((a) => [gabung(a.identitas, a.kendaraan), gabung(a.tujuan, wkt(a)), gabung(a.barang_hasil, a.satuan), gabung(a.jumlah !== null && a.jumlah !== undefined ? s(a.jumlah) : "", a.asal_tujuan), gabung(a.pemeriksaan, a.serah_terima)])} />
        <Pasangan item={[["Petugas penyerah/penerima, pemeriksa dan waktu", [...new Set(akses.map((a) => nama(s(a.dicatat_oleh))).filter((n) => n !== "-"))].join(", ")]]} />
      </>
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
        <p className="mb-2 text-center font-bold uppercase">{meta.judul}</p>
        {isi}
        {kolomKet && <Keterangan kolom={kolomKet} />}
        <div className="mt-8 grid grid-cols-2 gap-8 text-center">
          <div><p>Menyetujui,<br />Pejabat Berwenang</p><div className="h-16" /><p>(Nama)</p><p>(NIP)</p></div>
          <div><p>{kop.kota ? `${kop.kota}` : "(Nama kota)"}, {tgl}<br />Petugas Pelaksana</p><div className="h-16" /><p>(Nama)</p><p>(NIP)</p></div>
        </div>
      </article>
    </div>
  );
}
