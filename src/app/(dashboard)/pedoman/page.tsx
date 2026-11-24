import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { CATATAN_STATUS, PANDUAN_STATUS, POKOK_SOP, type StatusKey } from "@/lib/domain/pedoman";
import { BLOK_DASBOR, DOKUMEN_WAJIB } from "@/lib/domain/dokumen-wajib";
import { VARIABEL_STATUS } from "@/lib/domain/instrumen-status";
import { CATATAN_KATEGORI, INDIKATOR_PENILAIAN, PETUNJUK_PENILAIAN } from "@/lib/domain/penilaian";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";

export const metadata = { title: "Pedoman & SOP" };

export default function PedomanPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Pedoman & SOP" description="Rujukan cepat dari Pedoman Penyelenggaraan Pengamanan Kegiatan Ketahanan Pangan Pemasyarakatan. Isi di halaman ini mengikuti pedoman; bila ada perbedaan, naskah resmi yang berlaku." />
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
        <CardContent>
          <ol className="space-y-2 text-sm">{INDIKATOR_KESIAPAN.map((i) => <li key={i.kode}><span className="font-medium">{i.kode.toUpperCase()}.</span> {i.uraian}</li>)}</ol>
          <p className="mt-3 text-sm text-muted-foreground">Pejabat berwenang memutuskan: dapat dimulai, perlu diperbaiki persiapannya, atau harus ditunda. Alasan, perbaikan yang diminta, penanggung jawab, dan waktu pemeriksaan ulang dicatat.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dokumen yang harus tersedia (a sampai m)</CardTitle><CardDescription>Dicek pada halaman Kendali sesi. Dokumen f dan g hanya untuk kegiatan di luar perimeter pengamanan utama.</CardDescription></CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">{DOKUMEN_WAJIB.map((d) => <li key={d.kode}><span className="font-medium">{d.kode}. {d.judul}.</span> <span className="text-muted-foreground">{d.uraian}</span></li>)}</ol>
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
        <CardContent><ol className="space-y-2 text-sm">{BLOK_DASBOR.map((b, i) => <li key={b.judul}><span className="font-medium">{i + 1}. {b.judul}.</span> <span className="text-muted-foreground">{b.isi}</span></li>)}</ol></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Penilaian pelaksanaan (19 indikator)</CardTitle><CardDescription>Diisi pada menu Penilaian pelaksanaan. {CATATAN_KATEGORI}</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{PETUNJUK_PENILAIAN.map((x) => <li key={x}>{x}</li>)}</ul>
          <ol className="space-y-2 text-sm">{INDIKATOR_PENILAIAN.map((i) => <li key={i.no}><span className="font-medium">{i.no}. {i.judul}.</span> <span className="text-muted-foreground">{i.uraian}{i.tb && <> ({i.tb})</>}</span></li>)}</ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pokok isi pedoman dan SOP</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {POKOK_SOP.map((s) => (
            <div key={s.bagian} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr]">
              <h3 className="text-sm font-semibold">{s.bagian}</h3>
              <p className="text-sm text-muted-foreground">{s.isi}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
