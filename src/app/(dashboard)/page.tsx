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
      <section className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-white shadow-soft md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-56 w-56 rounded-full bg-[hsl(173_70%_50%)]/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-white/75">{fmtTanggal(now)} · {ROLE_LABEL[user.role]}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">{sapaan(Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(now)))}, {user.fullName.split(" ")[0]}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {perlu.length > 0 ? `${perlu.length} kegiatan perlu perhatian sekarang.` : "Tidak ada kegiatan yang perlu perhatian khusus saat ini."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/12 px-3 py-1.5 text-white ring-1 ring-white/20 [&_*]:!text-white"><RealtimeRefresh /></span>
            {user.role === "operator" && (
              <Button asChild size="sm" variant="outline" className="border-white/30 bg-white text-primary hover:bg-white/90"><Link href="/kegiatan">Siapkan kegiatan</Link></Button>
            )}
            {user.role === "kepala_pengamanan" && (
              <Button asChild size="sm" variant="outline" className="border-white/30 bg-white text-primary hover:bg-white/90"><Link href="/keputusan">Antrean keputusan</Link></Button>
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

      <section aria-label="Status keamanan kegiatan berjalan" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {URUTAN.map(({ st, label, ikon, nada }) => (
          <StatCard key={st} icon={ikon} nada={nada} nilai={hitung(st)} label={`${label} · kegiatan berjalan`} />
        ))}
      </section>

      <section aria-label="Ringkasan perhatian" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardCheck} nada="biru" nilai={menunggu} label="menunggu keputusan kesiapan" />
        <StatCard icon={OctagonAlert} nada="kuning" nilai={perlu.length} label="kegiatan perlu perhatian" />
        <StatCard icon={Clock} nada="merah" nilai={tlTerlambat} label="tindak lanjut lewat tenggat" />
        <Link href="/gelang" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StatCard icon={BellRing} nada={alarmMenunggu > 0 ? "kritis" : "hijau"} nilai={alarmMenunggu} label="alarm gelang menunggu konfirmasi" /></Link>
      </section>

      <section aria-label="Daftar sesi" className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Sesi kegiatan</h2>
        <SesiTabel rows={urut} now={now} tampilkanUpt={luas} />
      </section>
    </div>
  );
}
