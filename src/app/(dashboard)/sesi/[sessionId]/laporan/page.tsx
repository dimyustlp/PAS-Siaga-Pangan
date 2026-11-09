import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { describeLog } from "@/lib/domain/describe";
import { getSessionFull } from "@/lib/data/session-full";
import { fmtTanggal, fmtWaktu } from "@/lib/format";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";
import { z } from "zod";

export const metadata = { title: "Laporan sesi" };
export const dynamic = "force-dynamic";

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 mt-6 border-b pb-1 text-base font-semibold">{children}</h2>;

export default async function LaporanPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  const pemantau = user.role === "pemantau_kanwil" || user.role === "pemantau_pusat";
  const d = await getSessionFull(sessionId, { dengan_nominatif: !pemantau });
  if (!d) notFound();
  const { sesi, kegiatan, lokasi, ringkas: o, rekonsiliasi: r, nama } = d;
  const kronologis = [...d.logs].reverse();
  const peta = new Map(d.kesiapan.map((k) => [k.kode, k]));

  return (
    <div className="mx-auto max-w-4xl bg-card p-6 text-sm print:max-w-none print:p-0 print:text-[11pt]">
      <div className="mb-4 flex justify-between gap-2 print:hidden">
        <Button asChild variant="outline" size="sm"><Link href={`/sesi/${sessionId}`}>Kembali</Link></Button>
        <PrintButton />
      </div>

      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">PAS-SIAGA Pangan</p>
        <h1 className="text-xl font-bold">Laporan Pelaksanaan Kegiatan Pangan</h1>
        <p className="text-muted-foreground">{o.upt_nama ?? o.kode_upt}</p>
      </header>

      <H>A. Identitas kegiatan</H>
      <table className="w-full">
        <tbody>
          {[
            ["Kode kegiatan", kegiatan.kode_kegiatan],
            ["Jenis dan lokasi", `${kegiatan.jenis_kegiatan} · ${lokasi?.nama ?? "-"}${kegiatan.luas_lahan_ha ? ` · ${kegiatan.luas_lahan_ha} ha` : ""}`],
            ["Tanggal sesi", fmtTanggal(sesi.tanggal_sesi)],
            ["Nomor persetujuan / surat perintah", `${kegiatan.nomor_persetujuan ?? "-"} / ${kegiatan.nomor_surat_perintah ?? "-"}`],
            ["Batas area", kegiatan.batas_area ?? "-"],
            ["Rute dan titik komunikasi", `${kegiatan.rute ?? "-"} · ${kegiatan.titik_komunikasi ?? "-"}`],
            ["Pengawal", sesi.petugas_ids.map((i) => nama.get(i) ?? "Pengawal").join(", ")],
            ["Bimker / petugas blok / petugas P2U", `${sesi.bimker_penanggung_jawab ?? "-"} / ${sesi.petugas_blok ?? "-"} / ${sesi.petugas_p2u ?? "-"}`],
            ["Rencana", `${sesi.jumlah_narapidana} WB, ${sesi.jumlah_alat_kerja} alat${sesi.rincian_alat ? ` (${sesi.rincian_alat})` : ""}; pemeriksaan tiap ${sesi.interval_pemeriksaan} menit; gelang monitor: ${sesi.pakai_gelang_monitor ? "dipakai" : "tidak"}`],
            ["Status akhir", `Kesiapan ${sesi.status_kesiapan}; keamanan ${sesi.status_keamanan}; ${sesi.ditutup_at ? `ditutup ${fmtWaktu(sesi.ditutup_at)}` : "belum ditutup"}`],
          ].map(([k, v]) => (
            <tr key={k} className="align-top border-b"><td className="w-56 py-1 pr-3 text-muted-foreground">{k}</td><td className="py-1">{v}</td></tr>
          ))}
        </tbody>
      </table>

      <H>B. Kesiapan sebelum berangkat</H>
      <ul className="space-y-0.5">
        {INDIKATOR_KESIAPAN.filter((i) => i.kode !== "f" || sesi.pakai_gelang_monitor).map((i) => (
          <li key={i.kode}>[{peta.get(i.kode)?.terpenuhi ? "✓" : " "}] {i.kode.toUpperCase()}. {i.judul}{peta.get(i.kode)?.catatan ? ` — ${peta.get(i.kode)?.catatan}` : ""}</li>
        ))}
        <li>[{sesi.dokumen_surat_perintah ? "✓" : " "}] Surat perintah terunggah · [{sesi.dokumen_rencana_pengamanan ? "✓" : " "}] Rencana pengamanan terunggah</li>
      </ul>

      {d.nominatif && (
        <>
          <H>C. Daftar nominatif ({d.nominatif.length} WB)</H>
          <ol className="columns-2 gap-8">{d.nominatif.map((n) => <li key={n.inmate_id} className="break-inside-avoid">{n.nama} ({n.nomor_registrasi})</li>)}</ol>
        </>
      )}

      <H>D. Rekonsiliasi</H>
      {r ? (
        <p>
          WB keluar {r.wbpKeluar ?? "-"}, kembali {r.wbpKembali ?? "-"}; alat keluar {r.alatKeluar ?? "-"}, kembali {r.alatKembali ?? "-"}; penggeledahan{" "}
          {r.penggeledahan === null ? "belum dicatat" : r.penggeledahan ? "dilakukan" : "belum dilakukan"}; gangguan belum terverifikasi {r.gangguanBelumDiverifikasi}.{" "}
          {r.siapTutup ? "Semua syarat penutupan terpenuhi." : `Catatan: ${r.alasan.join("; ")}.`}
        </p>
      ) : <p>-</p>}

      <H>E. Kronologi lapangan</H>
      {kronologis.length === 0 ? <p>Tidak ada entri.</p> : (
        <table className="w-full">
          <tbody>
            {kronologis.map((l) => (
              <tr key={l.id} className="align-top border-b">
                <td className="w-32 py-1 pr-2 text-xs tabular-nums">{fmtWaktu(l.waktu_kejadian)}</td>
                <td className="py-1">{describeLog(l.jenis_entri, l.payload)}{l.susulan ? " [susulan]" : ""}<span className="block text-xs text-muted-foreground">{nama.get(l.pengawal_id) ?? "Pengawal"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <H>F. Perubahan status keamanan</H>
      {d.riwayatStatus.length === 0 ? <p>Status HIJAU sepanjang kegiatan.</p> : (
        <ul className="space-y-0.5">{[...d.riwayatStatus].reverse().map((s) => <li key={s.id}>{fmtWaktu(s.waktu)}: {s.dari} → {s.ke} ({s.sumber}) — {s.alasan}</li>)}</ul>
      )}

      <H>G. Gangguan dan tindak lanjut</H>
      {d.gangguan.length === 0 && d.tindakLanjut.length === 0 ? <p>Tidak ada.</p> : (
        <>
          <ul className="space-y-0.5">{d.gangguan.map((g) => <li key={g.id}>Gangguan: {g.kategori_gangguan} — {g.status_penyelesaian ? "terverifikasi" : "belum terverifikasi"}{g.tindakan_awal ? `; ${g.tindakan_awal}` : ""}</li>)}</ul>
          <ul className="mt-2 space-y-0.5">{d.tindakLanjut.map((f) => <li key={f.id}>Tindak lanjut ({f.status}): {f.uraian} — PJ {f.penanggung_jawab_nama}, tenggat {fmtWaktu(f.tenggat)}{f.catatan_selesai ? `; ${f.catatan_selesai}` : ""}</li>)}</ul>
        </>
      )}

      <H>H. Keputusan Kepala Pengamanan</H>
      {d.keputusan.length === 0 ? <p>Belum ada.</p> : (
        <ul className="space-y-0.5">{[...d.keputusan].reverse().map((k) => <li key={k.id}>{fmtWaktu(k.created_at)}: {k.jenis_keputusan}{k.status_baru ? ` → ${k.status_baru}` : ""}{k.catatan_keputusan ? ` — ${k.catatan_keputusan}` : ""} ({nama.get(k.pejabat_id) ?? "Kepala Pengamanan"})</li>)}</ul>
      )}

      <div className="mt-12 grid grid-cols-2 gap-8 text-center">
        <div><p>Pengawal</p><div className="h-20" /><p className="border-t pt-1">(………………………)</p></div>
        <div><p>Kepala Pengamanan</p><div className="h-20" /><p className="border-t pt-1">(………………………)</p></div>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Dicetak dari PAS-SIAGA Pangan pada {fmtWaktu(new Date())}.</p>
    </div>
  );
}
