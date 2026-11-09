import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { CATATAN_STATUS, PANDUAN_STATUS, POKOK_SOP, type StatusKey } from "@/lib/domain/pedoman";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";

export const metadata = { title: "Pedoman & SOP" };

export default function PedomanPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Pedoman & SOP" description="Rujukan cepat dari rancangan Keputusan Direktur Jenderal Pemasyarakatan tentang pengamanan kegiatan ketahanan pangan." />
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
        <CardHeader><CardTitle>Indikator kesiapan pengamanan</CardTitle><CardDescription>Diperiksa sebelum kegiatan dimulai. Tanpa skor risiko pribadi WB.</CardDescription></CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">{INDIKATOR_KESIAPAN.map((i) => <li key={i.kode}><span className="font-medium">{i.kode.toUpperCase()}.</span> {i.uraian}</li>)}</ol>
          <p className="mt-3 text-sm text-muted-foreground">Pejabat berwenang memutuskan: dapat dimulai, perlu diperbaiki persiapannya, atau harus ditunda. Alasan, perbaikan yang diminta, penanggung jawab, dan waktu pemeriksaan ulang dicatat.</p>
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
