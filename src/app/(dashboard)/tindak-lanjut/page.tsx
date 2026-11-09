import Link from "next/link";
import { AksiTindakLanjut } from "@/components/shared/followup-forms";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtWaktu } from "@/lib/format";

export const metadata = { title: "Tindak lanjut" };
export const dynamic = "force-dynamic";

export default async function TindakLanjutPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("follow_ups").select("*").neq("status", "Terverifikasi").order("tenggat").limit(200);
  const daftar = data ?? [];
  const now = Date.now();
  const peran = user.role === "kepala_pengamanan" ? "kepala" : "pelaksana";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Tindak lanjut" description="Semua tindak lanjut yang belum terverifikasi, diurutkan menurut tenggat." actions={<RealtimeRefresh tabel={["follow_ups"]} />} />
      {error && <Alert tone="bahaya">Data belum bisa dibaca. Muat ulang halaman.</Alert>}
      {daftar.length === 0 && !error && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Tidak ada tindak lanjut yang terbuka.</p>}
      <ul className="space-y-4">
        {daftar.map((f) => {
          const lewat = f.status !== "Selesai" && Date.parse(f.tenggat) < now;
          return (
            <li key={f.id} className="space-y-2 rounded-lg border bg-card p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={f.status === "Terbuka" ? "kuning" : f.status === "Dikerjakan" ? "biru" : "hijau"}>{f.status}</Pill>
                {lewat && <Pill tone="merah">Lewat tenggat</Pill>}
                <span className="font-medium">{f.uraian}</span>
              </p>
              <p className="text-xs text-muted-foreground">PJ {f.penanggung_jawab_nama} · tenggat {fmtWaktu(f.tenggat)} · {f.sumber} · <Link className="text-primary hover:underline" href={`/sesi/${f.session_id}`}>lihat sesi</Link></p>
              <AksiTindakLanjut f={f} peran={peran} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
