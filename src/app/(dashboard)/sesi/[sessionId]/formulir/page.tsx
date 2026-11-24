import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { FORMULIR } from "@/lib/domain/formulir";

export const metadata = { title: "Formulir pelaksanaan" };
export const dynamic = "force-dynamic";

export default async function DaftarFormulirPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  await requireUser();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/sesi/${sessionId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke detail sesi</Link>
      <PageHeader title="Formulir pelaksanaan dan pelaporan" description="Sepuluh formulir menurut pedoman, terisi dari data aplikasi dan siap dicetak atau disimpan sebagai PDF." />
      <Alert>Dokumen elektronik dapat menggantikan formulir kertas apabila memuat unsur yang sama dan dapat dicetak. Nomor dokumen dan tanda tangan diisi setelah dicetak.</Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        {FORMULIR.map((f) => (
          <Card key={f.no}>
            <CardContent className="space-y-1 p-5">
              <p className="font-medium">Formulir {f.no}. {f.judul}</p>
              <p className="text-sm text-muted-foreground">{f.ringkas}</p>
              <Link className="inline-block pt-1 text-sm text-primary underline-offset-2 hover:underline" href={f.no === 8 ? "/penilaian" : `/sesi/${sessionId}/formulir/${f.no}`}>{f.no === 8 ? "Buka penilaian" : "Buka dan cetak"}</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
