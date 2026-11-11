import Link from "next/link";
import { TautanGelang } from "@/components/shared/tautan-gelang";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { EntriLapangan } from "@/components/lapangan/entri-lapangan";
import { Alert } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Entri lapangan" };
export const dynamic = "force-dynamic";

export default async function EntriPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: o } = await supabase.from("v_session_overview").select("*").eq("session_id", sessionId).maybeSingle();
  if (!o) notFound();

  const [logs, nom] = await Promise.all([
    supabase.from("field_logs").select("id,jenis_entri,payload,waktu_kejadian,susulan").eq("session_id", sessionId).order("waktu_kejadian", { ascending: false }).limit(200),
    supabase.rpc("daftar_nominatif", { p_session: sessionId }),
  ]);

  const siap = o.status_kesiapan === "Dapat Dimulai";
  return (
    <div className="space-y-4">
      <Link href="/lapangan" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali</Link>
      <div>
        <h1 className="text-lg font-semibold">{o.jenis_kegiatan} · {o.lokasi_nama}</h1>
        <p className="text-xs text-muted-foreground">{o.kode_kegiatan}{o.latihan ? " · LATIHAN" : ""} · {o.upt_nama ?? o.kode_upt}</p>
      </div>
      {o.pakai_gelang_monitor && siap && <TautanGelang kecil={false} className="w-full" />}
      {!siap ? (
        <Alert tone="waspada">Sesi ini belum mendapat izin mulai dari Kepala Pengamanan ({o.status_kesiapan}). Pencatatan dibuka setelah disetujui.</Alert>
      ) : (
        <EntriLapangan
          userId={user.id}
          sessionId={sessionId}
          status={o.status_keamanan ?? "HIJAU"}
          rencanaWb={o.jumlah_narapidana ?? 0}
          pakaiGelang={!!o.pakai_gelang_monitor}
          intervalMenit={o.interval_pemeriksaan ?? 60}
          batasPeriksaBerikut={o.batas_periksa_berikut}
          nominatif={Array.isArray(nom.data) ? nom.data : []}
          logs={logs.data ?? []}
          tutup={!!o.ditutup_at}
        />
      )}
    </div>
  );
}
