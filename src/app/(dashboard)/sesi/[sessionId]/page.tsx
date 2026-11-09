import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import {
  DaftarGangguan,
  DaftarKeputusan,
  DaftarTindakLanjut,
  KepalaSesi,
  LiniMasa,
  PanelKesiapan,
  PanelRekonsiliasi,
  RiwayatStatusPanel,
} from "@/components/shared/session-panels";
import { requireUser } from "@/lib/auth";
import { perhatianSesi } from "@/lib/domain/attention";
import { getSessionFull } from "@/lib/data/session-full";
import { fmtJam, sisaWaktu } from "@/lib/format";
import { z } from "zod";

export const metadata = { title: "Detail sesi" };
export const dynamic = "force-dynamic";

export default async function DetailSesiPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  const pemantau = user.role === "pemantau_kanwil" || user.role === "pemantau_pusat";
  const data = await getSessionFull(sessionId, { dengan_nominatif: !pemantau });
  if (!data) notFound();

  const now = new Date();
  const peringatan = perhatianSesi(data.ringkas, now);
  const berjalan = !data.sesi.ditutup_at && (data.ringkas.fase === "Di lokasi" || data.ringkas.fase === "Dalam perjalanan");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Detail sesi"
        description="Kondisi terkini, lini masa, dan catatan keputusan untuk satu sesi kegiatan."
        actions={
          <>
            <RealtimeRefresh />
            {user.role === "kepala_pengamanan" && <Button asChild size="sm"><Link href={`/keputusan/${sessionId}`}>Buka keputusan</Link></Button>}
            {user.role === "operator" && <Button asChild size="sm"><Link href={`/kegiatan/${sessionId}`}>Buka persiapan</Link></Button>}
            <Button asChild size="sm" variant="outline"><Link href={`/sesi/${sessionId}/laporan`}><Printer className="h-4 w-4" aria-hidden />Laporan cetak</Link></Button>
          </>
        }
      />

      {peringatan.map((p) => <Alert key={p.teks} tone={p.tingkat === "kritis" ? "bahaya" : "waspada"}>{p.teks}</Alert>)}

      <KepalaSesi data={data} />

      {berjalan && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 p-5 text-sm">
            <p>Pemeriksaan berkala berikut: <strong>{data.pemeriksaan.dueAt ? fmtJam(data.pemeriksaan.dueAt) : "-"}</strong> ({sisaWaktu(data.pemeriksaan.minutesLeft)})</p>
            <p>WB keluar / dihitung terakhir / kembali: <strong className="tabular-nums">{data.ringkas.wbp_keluar ?? "-"} / {data.ringkas.wbp_terakhir_dihitung ?? "-"} / {data.ringkas.wbp_kembali ?? "-"}</strong></p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <LiniMasa data={data} />
        </div>
        <div className="space-y-6">
          <RiwayatStatusPanel data={data} />
          <DaftarGangguan data={data} />
          <DaftarTindakLanjut data={data} now={now} />
          <DaftarKeputusan data={data} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelKesiapan data={data} />
        <PanelRekonsiliasi rek={data.rekonsiliasi} />
      </div>

      {!pemantau && data.nominatif && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar nominatif ({data.nominatif.length} WB)</CardTitle>
            <CardDescription>Data pribadi WB hanya dibuka bagi peran yang menanganinya dan dibaca dari data induk tanpa disalin.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="columns-1 gap-8 text-sm sm:columns-2 lg:columns-3">
              {data.nominatif.map((n) => <li key={n.inmate_id} className="break-inside-avoid py-0.5">{n.nama} <span className="text-xs text-muted-foreground">{n.nomor_registrasi}</span></li>)}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
