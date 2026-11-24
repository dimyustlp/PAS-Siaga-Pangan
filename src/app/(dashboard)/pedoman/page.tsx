import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { CATATAN_STATUS, PANDUAN_STATUS, POKOK_SOP, type StatusKey } from "@/lib/domain/pedoman";
import { BLOK_DASBOR, DOKUMEN_WAJIB } from "@/lib/domain/dokumen-wajib";
import { VARIABEL_STATUS } from "@/lib/domain/instrumen-status";
import { CATATAN_KATEGORI, INDIKATOR_PENILAIAN, PETUNJUK_PENILAIAN } from "@/lib/domain/penilaian";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";

export const metadata = { title: "Pedoman & SOP" };

function Lipat({ judul, children }: { judul: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-border/70 p-3 text-sm">
      <summary className="cursor-pointer font-medium">{judul}</summary>
      <div className="mt-2 space-y-1 text-muted-foreground">{children}</div>
    </details>
  );
}

export default function PedomanPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Pedoman & SOP" description="Rujukan ringkas dari Pedoman Penyelenggaraan Pengamanan Kegiatan Ketahanan Pangan Pemasyarakatan. Isi di halaman ini mengikuti pedoman; bila ada perbedaan, naskah resmi yang berlaku. Klik judul untuk melihat rinciannya." />
      <Alert>Status adalah acuan bersama untuk mengendalikan kegiatan, bukan penilaian risiko pribadi WB.</Alert>

      <Card>
        <CardHeader><CardTitle>Status operasional selama kegiatan</CardTitle><CardDescription>Kondisi dan keputusan minimum untuk tiap status.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          {(Object.keys(PANDUAN_STATUS) as StatusKey[]).map((k) => (
            <div key={k} className="grid gap-2 border-b pb-5 last:border-0 last:pb-0 sm:grid-cols-[6rem_1fr]">
              <div><StatusBadge status={k} /></div>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Kondisi: </span>{PANDUAN_STATUS[k].kondisi}</p>
                <p><span className="font-medium">Keputusan minimum: </span>{PANDUAN_STATUS[k].minimum}</p>
              </div>
            </div>
          ))}
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{CATATAN_STATUS.map((c) => <li key={c}>{c}</li>)}</ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aspek kesiapan pengamanan (A sampai F)</CardTitle><CardDescription>Diperiksa sebelum kegiatan dimulai. Tanpa skor risiko pribadi WB.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {INDIKATOR_KESIAPAN.map((i) => <Lipat key={i.kode} judul={<>{i.kode.toUpperCase()}. {i.judul}</>}><p>{i.uraian}</p></Lipat>)}
          <p className="pt-1 text-sm text-muted-foreground">Pejabat berwenang memutuskan: dapat dimulai, perlu diperbaiki persiapannya, atau harus ditunda. Alasan, perbaikan yang diminta, penanggung jawab, dan waktu pemeriksaan ulang dicatat.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dokumen yang harus tersedia (a sampai m)</CardTitle><CardDescription>Dicek pada halaman Kendali sesi. Dokumen f dan g hanya untuk kegiatan di luar perimeter pengamanan utama.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {DOKUMEN_WAJIB.map((d) => <Lipat key={d.kode} judul={<>{d.kode}. {d.judul}{d.hanyaLuar ? " (khusus di luar perimeter)" : ""}</>}><p>{d.uraian}</p></Lipat>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Instrumen status per variabel</CardTitle><CardDescription>Delapan variabel dinilai dengan tanda yang diamati dan tindakan minimum untuk setiap status.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {VARIABEL_STATUS.map((v) => (
            <details key={v.no} className="rounded-lg border border-border/70 p-3 text-sm">
              <summary className="cursor-pointer font-medium">{v.no}. {v.judul}{v.bolehTB ? " (dapat tidak berlaku)" : ""}</summary>
              <table className="mt-2 w-full border-collapse text-left text-xs">
                <tbody>
                  {(["HIJAU", "KUNING", "MERAH", "KRITIS"] as const).map((k) => (
                    <tr key={k} className="border-t border-border/60 align-top"><td className="w-16 py-1.5 pr-2 font-semibold">{k}</td><td className="py-1.5 pr-2">{v.rubrik[k].tanda}</td><td className="py-1.5 text-muted-foreground">{v.rubrik[k].tindakan}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Isi dasbor</CardTitle><CardDescription>Delapan blok data minimum menurut pedoman.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{BLOK_DASBOR.map((b, i) => <Lipat key={b.judul} judul={<>{i + 1}. {b.judul}</>}><p>{b.isi}</p></Lipat>)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Penilaian pelaksanaan (19 indikator)</CardTitle><CardDescription>Diisi pada menu Penilaian pelaksanaan. {CATATAN_KATEGORI}</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Lipat judul="Petunjuk pengisian dan rumus skor"><ul className="list-disc space-y-1 pl-5">{PETUNJUK_PENILAIAN.map((x) => <li key={x}>{x}</li>)}</ul></Lipat>
          {INDIKATOR_PENILAIAN.map((i) => <Lipat key={i.no} judul={<>{i.no}. {i.judul}</>}><p>{i.uraian}{i.tb && <> ({i.tb})</>}</p></Lipat>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pokok isi pedoman dan SOP</CardTitle><CardDescription>Klik judul untuk membaca isinya.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {POKOK_SOP.map((x) => <Lipat key={x.bagian} judul={x.bagian}><p>{x.isi}</p></Lipat>)}
        </CardContent>
      </Card>
    </div>
  );
}
