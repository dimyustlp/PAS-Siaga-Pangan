import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { AksiTindakLanjut } from "@/components/shared/followup-forms";
import { Card } from "@/components/ui/card";
import { Alert, Pill } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { FasePill } from "@/components/shared/session-panels";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtTanggalPendek, fmtWaktu } from "@/lib/format";

export const metadata = { title: "Tugas lapangan" };
export const dynamic = "force-dynamic";

export default async function LapanganPage() {
  const user = await requireUser();
  const supabase = await createClient();
  // RLS memastikan pengawal hanya melihat sesi tempat ia ditugaskan.
  const [sesi, tl] = await Promise.all([
    supabase.from("v_session_overview").select("*").is("ditutup_at", null).order("tanggal_sesi", { ascending: false }),
    supabase.from("follow_ups").select("*").eq("penanggung_jawab_id", user.id).in("status", ["Terbuka", "Dikerjakan", "Selesai"]).order("tenggat"),
  ]);
  const daftar = sesi.data ?? [];
  const tugas = tl.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tugas hari ini</h1>
        <p className="text-sm text-muted-foreground">Sesi yang ditugaskan kepada Anda.</p>
      </div>
      {sesi.error && <Alert tone="bahaya">Data belum bisa dibaca. Coba muat ulang halaman.</Alert>}
      {daftar.length === 0 && !sesi.error && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada sesi yang ditugaskan kepada Anda.</p>}

      <ul className="space-y-3">
        {daftar.map((s) => {
          const siap = s.status_kesiapan === "Dapat Dimulai";
          const isi = (
            <Card className={`lift flex items-center gap-3 p-4 ${siap ? "border-l-4 border-l-brand" : "border-l-4 border-l-border opacity-90"}`}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">{s.jenis_kegiatan} · {s.lokasi_nama}</p>
                <p className="text-xs text-muted-foreground">{s.kode_kegiatan} · {fmtTanggalPendek(s.tanggal_sesi)} · {s.jumlah_narapidana} WB</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {s.status_keamanan && <StatusBadge status={s.status_keamanan} />}
                  <FasePill fase={s.fase} />
                </div>
                {!siap && <p className="text-xs text-muted-foreground">Menunggu izin mulai dari Kepala Pengamanan.</p>}
              </div>
              {siap && <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />}
            </Card>
          );
          return <li key={s.session_id}>{siap ? <Link href={`/lapangan/${s.session_id}/entri`} className="block">{isi}</Link> : isi}</li>;
        })}
      </ul>

      {tugas.length > 0 && (
        <section className="space-y-3" aria-label="Tindak lanjut untuk Anda">
          <h2 className="font-semibold">Tindak lanjut untuk Anda</h2>
          {tugas.map((f) => (
            <div key={f.id} className="space-y-2 rounded-lg border bg-card p-3">
              <p className="text-sm"><Pill tone={f.status === "Terbuka" ? "kuning" : f.status === "Dikerjakan" ? "biru" : "hijau"}>{f.status}</Pill> <span className="font-medium">{f.uraian}</span></p>
              <p className="text-xs text-muted-foreground">Tenggat {fmtWaktu(f.tenggat)}</p>
              <AksiTindakLanjut f={f} peran="pelaksana" />
            </div>
          ))}
        </section>
      )}

      <Link href="/pedoman" className="flex items-center gap-2 text-sm text-primary hover:underline"><BookOpen className="h-4 w-4" aria-hidden />Pedoman status dan SOP</Link>
    </div>
  );
}
