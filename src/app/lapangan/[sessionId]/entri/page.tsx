import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Entri lapangan" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EntriPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!UUID.test(sessionId)) notFound();

  const supabase = await createClient();
  const { data: sesi } = await supabase
    .from("daily_sessions")
    .select("id,tanggal_sesi,status_kesiapan,interval_pemeriksaan")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sesi) notFound();

  return (
    <div className="space-y-4">
      <Link href="/lapangan" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Entri lapangan</CardTitle>
          <CardDescription>
            Formulir entri (serah terima, pemeriksaan berkala, gangguan, naikkan status) dan mode tanpa sinyal dibangun pada
            Fase 4. Interval pemeriksaan sesi ini: {sesi.interval_pemeriksaan} menit.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
