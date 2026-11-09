import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dasbor" };
export const dynamic = "force-dynamic";

type SesiRingkas = {
  status_kesiapan: "Menunggu" | "Dapat Dimulai" | "Perbaiki Dulu" | "Ditunda";
  status_keamanan: SecurityStatus;
  ditutup_at: string | null;
};

const URUTAN: SecurityStatus[] = ["HIJAU", "KUNING", "MERAH", "KRITIS"];

export default async function DasborPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_sessions")
    .select("status_kesiapan,status_keamanan,ditutup_at")
    .order("tanggal_sesi", { ascending: false })
    .limit(500);

  const sesi = (data ?? []) as SesiRingkas[];
  const berjalan = sesi.filter((s) => s.status_kesiapan === "Dapat Dimulai" && !s.ditutup_at);
  const menunggu = sesi.filter((s) => s.status_kesiapan === "Menunggu").length;
  const hitung = (st: SecurityStatus) => berjalan.filter((s) => s.status_keamanan === st).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Selamat datang, {user.fullName}</h1>
        <p className="text-sm text-muted-foreground">Ringkasan kegiatan pangan yang sedang berjalan.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Data belum bisa dibaca dari database. Pastikan skrip skema sudah dijalankan di Supabase.
        </p>
      )}

      <section aria-label="Status keamanan kegiatan berjalan" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {URUTAN.map((st) => (
          <Card key={st}>
            <CardHeader className="pb-2">
              <StatusBadge status={st} className="w-fit" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{hitung(st)}</p>
              <p className="text-xs text-muted-foreground">kegiatan berjalan</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Menunggu keputusan kesiapan</CardTitle>
          <CardDescription>Sesi yang sudah disiapkan Operator dan belum diputuskan Kepala Pengamanan.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">{menunggu}</p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Daftar sesi, pembaruan langsung (realtime), dan peringatan jadwal pemeriksaan menyusul di tahap berikutnya.
      </p>
    </div>
  );
}
