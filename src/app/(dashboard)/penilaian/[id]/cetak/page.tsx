import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { KopCetak } from "@/components/laporan/kop-cetak";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { ambilKopUpt } from "@/lib/data/kop-upt";
import { CATATAN_KATEGORI, hitungPenilaian, INDIKATOR_PENILAIAN, type BarisSkor } from "@/lib/domain/penilaian";
import { fmtTanggal } from "@/lib/format";
import { longgar } from "@/lib/supabase/longgar";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lembar penilaian" };
export const dynamic = "force-dynamic";

type Baris = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default async function CetakPenilaianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireUser();
  const supabase = await createClient();
  const db = longgar(supabase);
  const [p, sk, tl] = await Promise.all([
    db.from("penilaian_evaluasi").select("*").eq("id", id).maybeSingle(),
    db.from("penilaian_skor").select("*").eq("penilaian_id", id).order("no"),
    db.from("penilaian_tindak_lanjut").select("*").eq("penilaian_id", id).order("created_at"),
  ]);
  const pen = p.data as Baris | null;
  if (!pen) notFound();
  const skor = (sk.data ?? []) as Baris[];
  const tindak = (tl.data ?? []) as Baris[];
  const kop = await ambilKopUpt(s(pen.kode_upt));
  const peta = new Map(skor.map((x) => [Number(x.no), x]));
  const h = hitungPenilaian(skor.map((x) => ({ no: Number(x.no), skor: x.skor as BarisSkor["skor"], tb: !!x.tb })));
  let pengesah: string | null = null;
  if (pen.disahkan_oleh) {
    const { data } = await supabase.from("profiles").select("full_name,nip").eq("id", s(pen.disahkan_oleh)).maybeSingle();
    pengesah = data ? `${data.full_name}${data.nip ? ` (NIP ${data.nip})` : ""}` : null;
  }
  const tabel = "border border-black px-1.5 py-0.5 align-top";

  return (
    <div className="space-y-4">
      <div className="no-print mx-auto flex max-w-[21cm] flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link href={`/penilaian/${id}`}>Kembali</Link></Button>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[21cm] bg-white px-[1.4cm] py-[1.2cm] font-serif text-[10.5pt] leading-snug text-black shadow-soft print:max-w-none print:p-0 print:shadow-none">
        <KopCetak kop={kop} />
        <p className="text-center font-bold">REKAP EVALUASI DAN PERBAIKAN PELAKSANAAN PENGAMANAN KEGIATAN KETAHANAN PANGAN</p>
        <p className="mb-3 text-center">Nomor: ......................................</p>

        <table className="mb-3 w-full"><tbody>
          {([["UPT", kop.upt], ["Kegiatan dan lokasi", s(pen.kegiatan_lokasi)], ["Periode yang dinilai", `${fmtTanggal(s(pen.periode_dari))} s.d. ${fmtTanggal(s(pen.periode_sampai))}`], ["Jumlah pelaksanaan harian diperiksa", s(pen.jumlah_sesi_diperiksa)], ["Tanggal penilaian", fmtTanggal(s(pen.tanggal_penilaian))], ["Penilai", `${s(pen.penilai_nama)}, ${s(pen.penilai_jabatan)}`], ["Penanggung jawab kegiatan", s(pen.penanggung_jawab) || "-"]] as const).map(([k, v]) => (
            <tr key={k} className="align-top"><td className="w-56 py-0.5">{k}</td><td className="w-4">:</td><td>{v}</td></tr>
          ))}
        </tbody></table>

        <table className="w-full border-collapse text-[9.5pt]">
          <thead className="bg-[#eceff1]"><tr><th className={`${tabel} w-8`}>No</th><th className={`${tabel} text-left`}>Indikator</th><th className={`${tabel} w-10`}>2</th><th className={`${tabel} w-10`}>1</th><th className={`${tabel} w-10`}>0</th><th className={`${tabel} w-10`}>TB</th><th className={`${tabel} text-left`}>Bukti, kekurangan, atau alasan TB</th></tr></thead>
          <tbody>
            {INDIKATOR_PENILAIAN.map((i) => {
              const r = peta.get(i.no);
              const tb = !!r?.tb;
              const v = r?.skor;
              const tanda = (x: boolean) => (x ? "✓" : "");
              return (
                <tr key={i.no}>
                  <td className={`${tabel} text-center`}>{i.no}</td><td className={tabel}><b>{i.judul}</b></td>
                  <td className={`${tabel} text-center`}>{tanda(!tb && v === 2)}</td><td className={`${tabel} text-center`}>{tanda(!tb && v === 1)}</td><td className={`${tabel} text-center`}>{tanda(!tb && v === 0)}</td><td className={`${tabel} text-center`}>{tanda(tb)}</td>
                  <td className={tabel}>{tb ? s(r?.alasan_tb) : s(r?.bukti)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse text-[10pt]"><tbody>
          <tr><td className={`${tabel} w-64`}>Jumlah indikator berlaku (19 − TB)</td><td className={tabel}>{h.berlaku}</td></tr>
          <tr><td className={tabel}>Total skor ((skor 2 × 2) + skor 1)</td><td className={tabel}>{h.totalSkor}</td></tr>
          <tr><td className={tabel}>Skor maksimal (berlaku × 2)</td><td className={tabel}>{h.skorMaksimal}</td></tr>
          <tr><td className={tabel}>Persentase (total ÷ maksimal × 100)</td><td className={tabel}>{h.persentase === null ? "-" : `${h.persentase.toFixed(1)}%`}</td></tr>
          <tr><td className={tabel}>Kategori</td><td className={tabel}><b>{h.kategori ?? "-"}</b></td></tr>
        </tbody></table>
        <p className="mt-1 text-[9pt]">Kurang 0–50%; Cukup di atas 50–70%; Baik di atas 70–90%; Sangat Baik di atas 90–100%. {CATATAN_KATEGORI}</p>

        <p className="mb-1 mt-4 font-bold">Tindakan segera</p>
        <p>Temuan: {s(pen.tindakan_segera) || "-"}</p>
        <p>Tindakan yang dilaksanakan: {s(pen.tindakan_dilaksanakan) || "-"}</p>

        <p className="mb-1 mt-4 font-bold">Tindak lanjut</p>
        <table className="w-full border-collapse text-[9.5pt]">
          <thead className="bg-[#eceff1]">
            <tr><th className={tabel}>Temuan</th><th className={tabel}>Bukti atau Indikator</th><th className={tabel}>Perbaikan</th><th className={tabel}>Penanggung jawab dan tenggat</th><th className={tabel}>Hasil verifikasi</th></tr>
            <tr>{[1, 2, 3, 4, 5].map((n) => <th key={n} className={`${tabel} font-normal`}>({n})</th>)}</tr>
          </thead>
          <tbody>
            {tindak.map((t) => (
              <tr key={s(t.id)}>
                <td className={tabel}>{s(t.temuan)}</td>
                <td className={tabel}>{[t.no_indikator ? `Indikator ${s(t.no_indikator)}` : "", s(t.bukti_penyelesaian)].filter(Boolean).join("; ")}</td>
                <td className={tabel}>{s(t.tindakan)}</td>
                <td className={tabel}>{[s(t.penanggung_jawab), t.batas_waktu ? fmtTanggal(s(t.batas_waktu)) : ""].filter(Boolean).join("; ")}</td>
                <td className={tabel}>{[s(t.hasil_verifikasi), t.selesai ? "Selesai" : ""].filter(Boolean).join("; ")}</td>
              </tr>
            ))}
            {tindak.length === 0 && <tr><td colSpan={5} className={tabel}>Tidak ada tindak lanjut.</td></tr>}
          </tbody>
        </table>
        <p className="mt-2 text-[9pt]">Dokumen elektronik dapat menggantikan formulir apabila unsur data, persetujuan, jejak perubahan, tanda pengesahan, dan akses sesuai kewenangan tetap terpenuhi. Lampiran ini tidak membuat instrumen penilaian risiko individual WB.</p>
        <div className="mt-2 text-[9pt] leading-tight">
          <p className="font-bold">Keterangan Pengisian:</p>
          <ol className="ml-4 list-decimal">
            <li>Tambahkan baris pada matriks untuk menyesuaikan dengan kondisi masing-masing satker atau wilayah.</li>
            <li>Keterangan kolom: kolom (1) diisi dengan temuan; kolom (2) bukti atau indikator temuan; kolom (3) perbaikan; kolom (4) penanggung jawab dan tenggat waktu; kolom (5) hasil verifikasi.</li>
          </ol>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-center">
          <div><p>Menyetujui,<br />Pejabat Berwenang</p><div className="h-16" />{pengesah ? <p className="font-bold underline">{pengesah}</p> : <><p>(Nama)</p><p>(NIP)</p></>}</div>
          <div><p>{kop.kota ? `${kop.kota}` : "(Nama kota)"}, {fmtTanggal(s(pen.tanggal_penilaian))}<br />Petugas Pelaksana</p><div className="h-16" /><p className="font-bold underline">{s(pen.penilai_nama)}</p><p>{s(pen.penilai_jabatan)}</p></div>
        </div>
      </article>
    </div>
  );
}
