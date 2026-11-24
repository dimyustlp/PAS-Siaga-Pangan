import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { PanelKendali } from "@/components/kendali/panel-kendali";
import { PageHeader } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Kendali sesi" };
export const dynamic = "force-dynamic";

export default async function KendaliSesiPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Link href={`/sesi/${sessionId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke detail sesi</Link>
      <PageHeader title="Kendali sesi" description="Status per variabel, dokumen wajib, kelompok kerja, perubahan rencana, alat dan bahan, akses pihak luar, pengembalian sebagian, dan kualitas data, sesuai pedoman pengamanan kegiatan ketahanan pangan." />
      <PanelKendali sessionId={sessionId} peran={user.role} />
    </div>
  );
}
