/* eslint-disable @next/next/no-img-element */
import type { IsiLaporan } from "@/lib/domain/laporan-format";
import { fmtUkuran } from "@/lib/domain/tahap";

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII"];
const Bab = ({ no, children }: { no: number; children: React.ReactNode }) => (
  <h2 className="mb-1.5 mt-5 font-bold">{ROMAWI[no]}. {children}</h2>
);

/** Pratinjau laporan resmi di layar dan untuk dicetak. Isinya sama dengan berkas PDF. */
export function LaporanResmi({ isi }: { isi: IsiLaporan }) {
  return (
    <article className="mx-auto max-w-[21cm] bg-white px-[1.6cm] py-[1.4cm] font-serif text-[11.5pt] leading-relaxed text-black shadow-soft print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-center gap-4">
        <img src="/logo-kemenimipas.png" alt="" className="h-[74px] w-[74px] shrink-0 object-contain" />
        <div className="flex-1 text-center leading-tight">
          {isi.kopBaris.map((b, i) => (
            <p key={b} className={i === isi.kopBaris.length - 1 ? "text-[14pt] font-bold" : "text-[12pt] font-bold"}>{b}</p>
          ))}
          {isi.kopAlamat && <p className="mt-1 text-[9pt]">{isi.kopAlamat}</p>}
        </div>
        <img src="/logo-pemasyarakatan.png" alt="" className="h-[74px] w-auto shrink-0 object-contain" />
      </header>
      <div className="mt-2 border-b-[3px] border-black" />
      <div className="mb-5 mt-[2px] border-b border-black" />

      <div className="text-center">
        <p className="font-bold">{isi.judul}</p>
        <p className="font-bold">{isi.subjudul}</p>
        <p className="mt-1">Nomor: ....................................................</p>
      </div>

      <Bab no={0}>DASAR</Bab>
      <ol className="list-decimal space-y-1 pl-6 text-justify">{isi.dasar.map((d) => <li key={d}>{d}</li>)}</ol>

      <Bab no={1}>WAKTU DAN TEMPAT PELAKSANAAN</Bab>
      <table className="w-full"><tbody>
        {isi.waktuTempat.map(([k, v]) => (
          <tr key={k} className="align-top"><td className="w-40 py-0.5">{k}</td><td className="w-4">:</td><td>{v}</td></tr>
        ))}
      </tbody></table>

      <Bab no={2}>NAMA DAN JUMLAH WARGA BINAAN</Bab>
      <p className="text-justify">{isi.ringkasWb}</p>
      {isi.wb.length > 0 && (
        <table className="mt-2 w-full border-collapse border border-black text-[10pt]">
          <thead className="bg-[#eceff1]"><tr><th className="w-10 border border-black px-1">No</th><th className="border border-black px-2 text-left">Nama</th><th className="w-44 border border-black px-2 text-left">Nomor registrasi</th></tr></thead>
          <tbody>{isi.wb.map((w) => <tr key={w.no}><td className="border border-black px-1 text-center">{w.no}</td><td className="border border-black px-2">{w.nama}</td><td className="border border-black px-2">{w.reg}</td></tr>)}</tbody>
        </table>
      )}

      <Bab no={3}>PETUGAS PENGAWAL</Bab>
      <table className="w-full border-collapse border border-black text-[10pt]">
        <thead className="bg-[#eceff1]"><tr><th className="w-10 border border-black px-1">No</th><th className="border border-black px-2 text-left">Nama</th><th className="w-48 border border-black px-2 text-left">NIP</th></tr></thead>
        <tbody>{isi.pengawal.map((p) => <tr key={p.no}><td className="border border-black px-1 text-center">{p.no}</td><td className="border border-black px-2">{p.nama}</td><td className="border border-black px-2">{p.nip}</td></tr>)}</tbody>
      </table>

      <Bab no={4}>RINCIAN PELAKSANAAN</Bab>
      {isi.rincian.length === 0 ? <p>Belum ada tahap yang tercatat.</p> : (
        <table className="w-full border-collapse border border-black text-[10pt]">
          <thead className="bg-[#eceff1]"><tr><th className="w-44 border border-black px-2 text-left">Tahap</th><th className="w-40 border border-black px-2 text-left">Waktu (sistem)</th><th className="w-16 border border-black px-2">WB</th><th className="border border-black px-2 text-left">Keterangan</th></tr></thead>
          <tbody>{isi.rincian.map((r) => <tr key={r.tahap} className="align-top"><td className="border border-black px-2">{r.tahap}</td><td className="border border-black px-2">{r.waktu}</td><td className="border border-black px-2 text-center">{r.wb}</td><td className="border border-black px-2">{r.ket}</td></tr>)}</tbody>
        </table>
      )}

      <Bab no={5}>PENGESAHAN BERKAS</Bab>
      <p className="text-justify">{isi.pengesahan}</p>

      <Bab no={6}>PENUTUP</Bab>
      <p className="text-justify">{isi.penutup}</p>

      <div className="ml-auto mt-8 w-72 text-center">
        <p>{isi.kotaTanggal}</p>
        <p>..................................................</p>
        <div className="h-20" />
        <p>(..................................................)</p>
        <p>NIP. ..........................................</p>
      </div>

      {isi.lampiranPerTahap.some((t) => t.foto.length + t.berkas.length > 0) && (
        <section className="mt-10 break-before-page">
          <h2 className="text-center font-bold">LAMPIRAN DOKUMENTASI</h2>
          {isi.lampiranPerTahap.map((t) => t.foto.length + t.berkas.length === 0 ? null : (
            <div key={t.judul} className="mt-4 break-inside-avoid-page">
              <h3 className="bg-[#eef3ea] px-2 py-1 text-[10.5pt] font-bold">{t.judul}</h3>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {t.foto.map((f) => (
                  <figure key={f.id} className="break-inside-avoid border border-[#bbb] p-1.5">
                    <img src={`/lampiran/${f.id}`} alt={f.judul} loading="lazy" className="h-52 w-full bg-[#f4f4f4] object-contain" />
                    <figcaption className="mt-1 text-[8.5pt] leading-snug">{f.judul}<br />Diunggah sistem: {f.waktu}</figcaption>
                  </figure>
                ))}
              </div>
              {t.berkas.length > 0 && (
                <ul className="mt-2 list-disc pl-6 text-[9.5pt]">
                  {t.berkas.map((b) => (
                    <li key={b.id}>
                      {b.judul}: <a href={`/lampiran/${b.id}`} target="_blank" rel="noreferrer" className="text-blue-800 underline print:no-underline">{b.nama}</a> ({fmtUkuran(b.ukuran)}, diunggah sistem {b.waktu})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
