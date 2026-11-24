import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { PanelKendali } from "@/components/kendali/panel-kendali";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Kendali sesi" };
export const dynamic = "force-dynamic";

export default async function KendaliLapanganPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/lapangan/${sessionId}/entri`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke entri</Link>
      <h1 className="text-lg font-semibold">Kendali sesi</h1>
      <PanelKendali sessionId={sessionId} peran={user.role} />
    </div>
  );
}
