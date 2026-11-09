import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { formatTanggal } from "@/lib/utils";

export const metadata = { title: "Tugas lapangan" };
export const dynamic = "force-dynamic";

type SesiLapangan = {
  id: string;
  tanggal_sesi: string;
  status_kesiapan: string;
  status_keamanan: SecurityStatus;
  ditutup_at: string | null;
  activities: {
    kode_kegiatan: string;
    jenis_kegiatan: string;
    master_locations: { nama: string } | null;
  } | null;
};

export default async function LapanganPage() {
  const supabase = await createClient();
  // RLS memastikan pengawal hanya melihat sesi tempat ia ditugaskan.
  const { data, error } = await supabase
    .from("daily_sessions")
    .select(
      "id,tanggal_sesi,status_kesiapan,status_keamanan,ditutup_at,activities(kode_kegiatan,jenis_kegiatan,master_locations(nama))"
    )
    .is("ditutup_at", null)
    .order("tanggal_sesi", { ascending: false });

  const sesi = (data ?? []) as unknown as SesiLapangan[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tugas hari ini</h1>
        <p className="text-sm text-muted-foreground">Sesi yang ditugaskan kepada Anda.</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Data belum bisa dibaca. Coba muat ulang halaman.
        </p>
      )}

      {sesi.length === 0 && !error && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada sesi yang ditugaskan kepada Anda.
        </p>
      )}

      <ul className="space-y-3">
        {sesi.map((s) => {
          const siap = s.status_kesiapan === "Dapat Dimulai";
          const isi = (
            <Card className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">
                  {s.activities?.jenis_kegiatan} · {s.activities?.master_locations?.nama}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.activities?.kode_kegiatan} · {formatTanggal(s.tanggal_sesi)}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <StatusBadge status={s.status_keamanan} />
                  {!siap && <span className="text-xs text-muted-foreground">{s.status_kesiapan}</span>}
                </div>
              </div>
              {siap && <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />}
            </Card>
          );
          return (
            <li key={s.id}>
              {siap ? (
                <Link href={`/lapangan/${s.id}/entri`} className="block">
                  {isi}
                </Link>
              ) : (
                isi
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
