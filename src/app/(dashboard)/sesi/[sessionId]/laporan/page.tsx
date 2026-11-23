import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm } from "@/components/shared/action-form";
import { PrintButton } from "@/components/shared/print-button";
import { LaporanResmi } from "@/components/laporan/laporan-resmi";
import { TombolUnduhPdf } from "@/components/laporan/tombol-unduh";
import { Button } from "@/components/ui/button";
import { Alert, Field, Textarea } from "@/components/ui/form";
import { sahkanLaporan } from "@/lib/actions/tahap";
import { requireUser } from "@/lib/auth";
import { ambilDataLaporan } from "@/lib/data/laporan";
import { susunLaporan } from "@/lib/domain/laporan-format";

export const metadata = { title: "Laporan pelaksanaan kegiatan" };
export const dynamic = "force-dynamic";

export default async function LaporanPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  const d = await ambilDataLaporan(sessionId);
  if (!d) notFound();
  const isi = susunLaporan(d);
  const lengkap = d.tahap.length === 4;
  const bisaSahkan = (user.role === "kepala_pengamanan" || user.role === "ka_upt") && lengkap && !d.pengesahan;
  const namaBerkas = `Laporan-Ketahanan-Pangan-${d.kegiatan.kode}-${d.kegiatan.tanggalSesi}.pdf`;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/sesi/${sessionId}`}>Kembali ke sesi</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/sesi/${sessionId}/rinci`}>Laporan rinci (kronologi)</Link></Button>
          <PrintButton />
        </div>
        <TombolUnduhPdf isi={isi} namaBerkas={namaBerkas} />
      </div>

      <div className="no-print space-y-3">
        {!lengkap && <Alert tone="waspada">Pengawal baru menyelesaikan {d.tahap.length} dari 4 tahap. Laporan tetap bisa dilihat, tetapi pengesahan dibuka setelah keempat tahap selesai.</Alert>}
        {d.pengesahan && <Alert tone="sukses">Berkas sudah disahkan oleh {d.pengesahan.nama} ({d.pengesahan.jabatan}).</Alert>}
        {bisaSahkan && (
          <div className="kaca rounded-2xl p-4">
            <p className="mb-2 font-semibold">Sahkan berkas laporan</p>
            <p className="mb-3 text-sm text-muted-foreground">Periksa foto dan berkas pada lampiran di bawah. Setelah disahkan, nama Anda tercantum sebagai pengesah berkas dan notifikasi terkirim ke Telegram.</p>
            <ActionForm action={sahkanLaporan} submit="Sahkan berkas" success="Laporan disahkan." confirm="Sahkan berkas laporan ini? Tindakan ini tidak bisa dibatalkan." fields={{ session_id: { v: sessionId }, catatan: { s: "catatan" } }}>
              <Field label="Catatan pengesahan (opsional)" htmlFor="catatan"><Textarea id="catatan" name="catatan" rows={2} /></Field>
            </ActionForm>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Pejabat penandatangan sengaja dikosongkan untuk diisi manual sesuai ketentuan UPT. Kop surat diatur di menu Kop surat UPT.</p>
      </div>

      <LaporanResmi isi={isi} />
    </div>
  );
}
