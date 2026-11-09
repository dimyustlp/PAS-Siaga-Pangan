import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { FasePill } from "@/components/shared/session-panels";
import { PageHeader } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { perhatianSesi, skorUrgensi, type Overview } from "@/lib/domain/attention";
import { listOverview } from "@/lib/data/overview";
import { createClient } from "@/lib/supabase/server";
import { fmtTanggalPendek, fmtWaktu, sejak } from "@/lib/format";

export const metadata = { title: "Keputusan" };
export const dynamic = "force-dynamic";

function Baris({ o, now }: { o: Overview; now: Date }) {
  const p = perhatianSesi(o, now);
  return (
    <li>
      <Link href={`/keputusan/${o.session_id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-secondary/60">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{o.jenis_kegiatan} · {o.lokasi_nama}</span>
          <span className="block text-xs text-muted-foreground">{o.kode_kegiatan} · {fmtTanggalPendek(o.tanggal_sesi)} · diperbarui {sejak(o.diperbarui_at, now)}</span>
          {p.map((x) => (
            <span key={x.teks} className="mt-0.5 flex items-start gap-1 text-xs text-status-merah"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />{x.teks}</span>
          ))}
        </span>
        <FasePill fase={o.fase} />
        {o.status_keamanan && <StatusBadge status={o.status_keamanan} />}
      </Link>
    </li>
  );
}

function Bagian({ judul, kosong, children, jumlah }: { judul: string; kosong: string; jumlah: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{judul} <span className="text-sm font-normal text-muted-foreground">({jumlah})</span></h2>
      {jumlah === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{kosong}</p> : <ul className="divide-y rounded-lg border bg-card">{children}</ul>}
    </section>
  );
}

export default async function KeputusanPage() {
  const { rows } = await listOverview({ hariKebelakang: 7 });
  const now = new Date();
  const aktif = rows.filter((r) => !r.ditutup_at);
  const menunggu = aktif.filter((r) => r.status_kesiapan === "Menunggu");
  const berjalan = aktif
    .filter((r) => r.status_kesiapan === "Dapat Dimulai" && r.fase !== "Sudah kembali ke blok")
    .sort((a, b) => skorUrgensi(b, now) - skorUrgensi(a, now));
  const siapTutup = aktif.filter((r) => r.status_kesiapan === "Dapat Dimulai" && r.fase === "Sudah kembali ke blok");

  const supabase = await createClient();
  const { data: verif } = await supabase.from("follow_ups").select("id,session_id,uraian,penanggung_jawab_nama,selesai_at").eq("status", "Selesai").order("selesai_at");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Keputusan" description="Antrean yang menunggu keputusan Anda: izin mulai, gangguan, penurunan status, tindak lanjut, dan penutupan." actions={<RealtimeRefresh />} />
      <Bagian judul="Menunggu keputusan kesiapan" jumlah={menunggu.length} kosong="Tidak ada sesi yang menunggu keputusan."> {menunggu.map((o) => <Baris key={o.session_id} o={o} now={now} />)}</Bagian>
      <Bagian judul="Sedang berjalan" jumlah={berjalan.length} kosong="Tidak ada kegiatan yang sedang berjalan.">{berjalan.map((o) => <Baris key={o.session_id} o={o} now={now} />)}</Bagian>
      <Bagian judul="Siap ditutup" jumlah={siapTutup.length} kosong="Belum ada kegiatan yang kembali ke blok.">{siapTutup.map((o) => <Baris key={o.session_id} o={o} now={now} />)}</Bagian>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tindak lanjut menunggu verifikasi <span className="text-sm font-normal text-muted-foreground">({verif?.length ?? 0})</span></h2>
        {(verif ?? []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Tidak ada.</p> : (
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {(verif ?? []).map((f) => (
              <li key={f.id}><Link href={`/keputusan/${f.session_id}`} className="block px-4 py-3 hover:bg-secondary/60"><span className="font-medium">{f.uraian}</span><span className="block text-xs text-muted-foreground">PJ {f.penanggung_jawab_nama} · selesai {fmtWaktu(f.selesai_at)}</span></Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
