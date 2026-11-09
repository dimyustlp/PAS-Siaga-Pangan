import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Clock, ClipboardCheck, OctagonAlert, ShieldAlert, Siren } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Alert, Select } from "@/components/ui/form";
import type { SecurityStatus } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { AlurKerja } from "@/components/shared/alur-kerja";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { SesiTabel } from "@/components/shared/session-panels";
import { perhatianSesi, skorUrgensi } from "@/lib/domain/attention";
import { listOverview, listUpt } from "@/lib/data/overview";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rbac";
import { fmtTanggal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dasbor" };
export const dynamic = "force-dynamic";

const URUTAN: { st: SecurityStatus; label: string; ikon: typeof CheckCircle2; nada: "hijau" | "kuning" | "merah" | "kritis" }[] = [
  { st: "HIJAU", label: "Hijau · aman", ikon: CheckCircle2, nada: "hijau" },
  { st: "KUNING", label: "Kuning · waspada", ikon: AlertTriangle, nada: "kuning" },
  { st: "MERAH", label: "Merah · gangguan", ikon: ShieldAlert, nada: "merah" },
  { st: "KRITIS", label: "Kritis · darurat", ikon: Siren, nada: "kritis" },
];

function sapaan(jam: number) {
  return jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
}

export default async function DasborPage({ searchParams }: { searchParams: Promise<{ upt?: string }> }) {
  const { upt } = await searchParams;
  // Semua dibaca bersamaan; cakupan data tetap ditentukan RLS di database.
  const supabase = await createClient();
  const [user, semuaUpt, { rows, error }, alarm] = await Promise.all([
    requireUser(),
    listUpt(),
    listOverview({ upt: upt || undefined }),
    supabase.from("gelang_alarm").select("id", { count: "exact", head: true }).eq("status", "Menunggu"),
  ]);
  const alarmMenunggu = alarm.count ?? 0;
  const luas = user.role === "administrator" || user.role === "pemantau_pusat" || user.role === "pemantau_kanwil";
  // Pemantau Kanwil hanya perlu melihat UPT pada Kanwilnya.
  const daftarUpt = !luas ? [] : user.role === "pemantau_kanwil" ? semuaUpt.filter((u) => u.kanwil_id === user.kanwilId) : semuaUpt;

  const now = new Date();
  const aktif = rows.filter((r) => !r.ditutup_at);
  const berjalan = aktif.filter((r) => r.status_kesiapan === "Dapat Dimulai");
  const menunggu = aktif.filter((r) => r.status_kesiapan === "Menunggu").length;
  const hitung = (st: SecurityStatus) => berjalan.filter((r) => r.status_keamanan === st).length;
  const perlu = aktif.filter((r) => perhatianSesi(r, now).length > 0);
  const tlTerlambat = aktif.reduce((a, r) => a + (r.tindak_lanjut_terlambat ?? 0), 0);
  const urut = [...rows].sort((a, b) => skorUrgensi(b, now) - skorUrgensi(a, now) || (b.tanggal_sesi ?? "").localeCompare(a.tanggal_sesi ?? ""));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="bg-brand-gradient relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-white/[0.06]" aria-hidden />
        <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full border border-primary/20" aria-hidden />
        <div className="relative grid gap-6 md:grid-cols-[1.6fr_1fr] md:items-end">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {fmtTanggal(now)} · {ROLE_LABEL[user.role]}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tighter md:text-[2.5rem] md:leading-[1.05]">
              {sapaan(Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(now)))}, {user.fullName.split(" ")[0]}
            </h1>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              {perlu.length > 0 ? `${perlu.length} kegiatan perlu perhatian sekarang.` : "Tidak ada kegiatan yang perlu perhatian khusus saat ini."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"><RealtimeRefresh /></span>
            <Button asChild size="sm" variant="outline"><Link href="/peta">Buka peta</Link></Button>
            {user.role === "operator" && (
              <Button asChild size="sm"><Link href="/kegiatan">Siapkan kegiatan</Link></Button>
            )}
            {user.role === "kepala_pengamanan" && (
              <Button asChild size="sm"><Link href="/keputusan">Antrean keputusan</Link></Button>
            )}
          </div>
        </div>
      </section>

      <AlurKerja role={user.role} />

      {error && <Alert tone="bahaya">Data belum bisa dibaca dari database. Muat ulang halaman, atau hubungi Administrator bila berulang.</Alert>}

      {luas && daftarUpt.length > 1 && (
        <form className="flex items-center gap-2" aria-label="Pilih UPT">
          <label htmlFor="upt" className="text-sm font-medium">UPT</label>
          <Select id="upt" name="upt" defaultValue={upt ?? ""} className="w-72">
            <option value="">Semua UPT pada cakupan</option>
            {daftarUpt.map((u) => <option key={u.id} value={u.kode}>{u.nama}</option>)}
          </Select>
          <Button type="submit" variant="outline" size="sm">Terapkan</Button>
        </form>
      )}

      <section aria-label="Status keamanan kegiatan berjalan" className="muncul grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {URUTAN.map(({ st, label, ikon, nada }) => (
          <StatCard key={st} icon={ikon} nada={nada} nilai={hitung(st)} label={`${label} · kegiatan berjalan`} />
        ))}
      </section>

      <section aria-label="Ringkasan perhatian" className="muncul grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <StatCard icon={ClipboardCheck} nada="biru" nilai={menunggu} label="menunggu keputusan kesiapan" />
        <StatCard icon={OctagonAlert} nada="kuning" nilai={perlu.length} label="kegiatan perlu perhatian" />
        <StatCard icon={Clock} nada="merah" nilai={tlTerlambat} label="tindak lanjut lewat tenggat" />
        <Link href="/gelang" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StatCard icon={BellRing} nada={alarmMenunggu > 0 ? "kritis" : "hijau"} nilai={alarmMenunggu} label="alarm gelang menunggu konfirmasi" /></Link>
      </section>

      <section aria-label="Daftar sesi" className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Sesi kegiatan</h2>
        <SesiTabel rows={urut} now={now} tampilkanUpt={luas} />
      </section>
    </div>
  );
}
