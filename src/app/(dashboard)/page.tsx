import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, ChevronRight, Clock, ClipboardCheck, FileCheck2, OctagonAlert, ShieldAlert, Siren, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Alert, Select } from "@/components/ui/form";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { TabelCari } from "@/components/ui/tabel-cari";
import { AlurKerja } from "@/components/shared/alur-kerja";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { SesiTabel } from "@/components/shared/session-panels";
import { BeritaBerjalan } from "@/components/shared/berita-berjalan";
import { DeretSektor, MotifPangan } from "@/components/layout/motif-pangan";
import { perhatianSesi, skorUrgensi, type Overview } from "@/lib/domain/attention";
import { listKanwil, listOverview, listUpt } from "@/lib/data/overview";
import { namaUnit } from "@/lib/data/unit";
import { ambilBeritaBerjalan } from "@/lib/data/berita-berjalan";
import { KPI_SDP, bacaDataSdp } from "@/lib/domain/sdp";
import { requireUser } from "@/lib/auth";
import { LABEL_TINGKAT, ROLE_LABEL, tingkatPeran } from "@/lib/rbac";
import { fmtTanggal, fmtTanggalPendek } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

type Rekap = { kunci: string; nama: string; href: string; aktif: number; hijau: number; kuning: number; merah: number; kritis: number; menunggu: number; perhatian: number };

function rekapKosong(kunci: string, nama: string, href: string): Rekap {
  return { kunci, nama, href, aktif: 0, hijau: 0, kuning: 0, merah: 0, kritis: 0, menunggu: 0, perhatian: 0 };
}

function TabelRekap({ judul, kolom, data }: { judul: string; kolom: string; data: Rekap[] }) {
  const sel = (n: number, warna: string) => <td className={cn("px-3 py-2 text-center font-mono tabular-nums", n > 0 ? warna : "text-muted-foreground/60")}>{n}</td>;
  return (
    <section className="space-y-3" aria-label={judul}>
      <h2 className="text-lg font-semibold tracking-tight">{judul}</h2>
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
        <TabelCari className="w-full min-w-[48rem] text-sm">
          <thead className="bg-secondary/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{kolom}</th>
              <th className="px-3 py-2">Sesi aktif</th>
              <th className="px-3 py-2 text-status-hijau">Hijau</th>
              <th className="px-3 py-2 text-[hsl(34_92%_30%)]">Kuning</th>
              <th className="px-3 py-2 text-status-merah">Merah</th>
              <th className="px-3 py-2 text-status-kritis">Kritis</th>
              <th className="px-3 py-2">Menunggu izin</th>
              <th className="px-3 py-2">Perlu perhatian</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((r) => (
              <tr key={r.kunci} className={cn("hover:bg-brand-soft/40", r.kritis + r.merah > 0 && "bg-status-merah/[0.04]")}>
                <td className="px-3 py-2 font-medium">{r.nama}</td>
                {sel(r.aktif, "font-semibold")}
                {sel(r.hijau, "text-status-hijau")}
                {sel(r.kuning, "text-[hsl(34_92%_30%)]")}
                {sel(r.merah, "font-bold text-status-merah")}
                {sel(r.kritis, "font-bold text-status-kritis")}
                {sel(r.menunggu, "")}
                {sel(r.perhatian, "text-[hsl(34_92%_30%)]")}
                <td className="px-3 py-2 text-right"><Link href={r.href} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">Lihat<ChevronRight className="h-3.5 w-3.5" aria-hidden /></Link></td>
              </tr>
            ))}
          </tbody>
        </TabelCari>
        {data.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Belum ada kegiatan aktif.</p>}
      </div>
    </section>
  );
}

export default async function DasborPage({ searchParams }: { searchParams: Promise<{ upt?: string; kanwil?: string }> }) {
  const { upt, kanwil: kanwilQ } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser();
  const tingkat = tingkatPeran(user.role);
  const [semuaUpt, semuaKanwil, { rows: semuaRows, error }, alarm, unit, berita, sdpQ] = await Promise.all([
    listUpt(),
    tingkat === "pusat" ? listKanwil() : Promise.resolve([]),
    listOverview({ upt: upt || undefined }),
    supabase.from("gelang_alarm").select("id", { count: "exact", head: true }).eq("status", "Menunggu"),
    namaUnit(user),
    ambilBeritaBerjalan(supabase),
    supabase.from("sdp_ringkasan").select("tahun,data,tanggal_data").order("tahun", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const sdp = sdpQ.data ? bacaDataSdp(sdpQ.data.data) : null;
  const alarmMenunggu = alarm.count ?? 0;
  const kanwilUpt = new Map(semuaUpt.map((u) => [u.kode, u.kanwil_id]));
  const rows = kanwilQ && !upt ? semuaRows.filter((r) => kanwilUpt.get(r.kode_upt ?? "") === kanwilQ) : semuaRows;
  const luas = tingkat === "pusat" || tingkat === "kanwil";
  const daftarUpt = !luas ? [] : tingkat === "kanwil" ? semuaUpt.filter((u) => u.kanwil_id === user.kanwilId) : kanwilQ ? semuaUpt.filter((u) => u.kanwil_id === kanwilQ) : semuaUpt;

  const now = new Date();
  const aktif = rows.filter((r) => !r.ditutup_at);
  const berjalan = aktif.filter((r) => r.status_kesiapan === "Dapat Dimulai");
  const menunggu = aktif.filter((r) => r.status_kesiapan === "Menunggu").length;
  const hitung = (st: SecurityStatus) => berjalan.filter((r) => r.status_keamanan === st).length;
  const perlu = aktif.filter((r) => perhatianSesi(r, now).length > 0);
  const tlTerlambat = aktif.reduce((a, r) => a + (r.tindak_lanjut_terlambat ?? 0), 0);
  const urut = [...rows].sort((a, b) => skorUrgensi(b, now) - skorUrgensi(a, now) || (b.tanggal_sesi ?? "").localeCompare(a.tanggal_sesi ?? ""));
  const perJenis = aktif.reduce<Record<string, number>>((a, r) => ({ ...a, [r.jenis_kegiatan ?? "-"]: (a[r.jenis_kegiatan ?? "-"] ?? 0) + 1 }), {});

  // Tahap pengawalan dan pengesahan untuk sesi pada cakupan ini.
  const ids = rows.map((r) => r.session_id!).filter(Boolean).slice(0, 300);
  const [tahap, sah] = ids.length
    ? await Promise.all([
        supabase.from("tahap_pengawalan").select("session_id").in("session_id", ids),
        supabase.from("daily_sessions").select("id,disahkan_at").in("id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const nTahap = new Map<string, number>();
  (tahap.data ?? []).forEach((t) => nTahap.set(t.session_id, (nTahap.get(t.session_id) ?? 0) + 1));
  const disahkan = new Set((sah.data ?? []).filter((s) => s.disahkan_at).map((s) => s.id));
  const menungguSah = rows.filter((r) => nTahap.get(r.session_id!) === 4 && !disahkan.has(r.session_id!));

  function tambah(map: Map<string, Rekap>, r: Overview, kunci: string, nama: string, href: string) {
    const x = map.get(kunci) ?? rekapKosong(kunci, nama, href);
    if (!r.ditutup_at) {
      x.aktif++;
      if (r.status_kesiapan === "Menunggu") x.menunggu++;
      if (r.status_kesiapan === "Dapat Dimulai") {
        if (r.status_keamanan === "HIJAU") x.hijau++;
        if (r.status_keamanan === "KUNING") x.kuning++;
        if (r.status_keamanan === "MERAH") x.merah++;
        if (r.status_keamanan === "KRITIS") x.kritis++;
      }
      if (perhatianSesi(r, now).length > 0) x.perhatian++;
    }
    map.set(kunci, x);
  }

  let rekap: Rekap[] = [];
  if (tingkat === "pusat" && !upt && !kanwilQ) {
    const m = new Map<string, Rekap>();
    for (const k of semuaKanwil) m.set(k.id, rekapKosong(k.id, k.nama, `/?kanwil=${k.id}`));
    for (const r of semuaRows) {
      const kw = kanwilUpt.get(r.kode_upt ?? "");
      if (kw && m.has(kw)) tambah(m, r, kw, m.get(kw)!.nama, `/?kanwil=${kw}`);
    }
    rekap = [...m.values()].sort((a, b) => b.kritis - a.kritis || b.merah - a.merah || b.aktif - a.aktif || a.nama.localeCompare(b.nama));
  } else if (luas && !upt) {
    const m = new Map<string, Rekap>();
    for (const r of rows) tambah(m, r, r.kode_upt ?? "-", r.upt_nama ?? r.kode_upt ?? "-", `/?upt=${r.kode_upt}`);
    rekap = [...m.values()].sort((a, b) => b.kritis - a.kritis || b.merah - a.merah || b.aktif - a.aktif);
  }

  const latar = tingkat === "pusat" ? "bg-brand-gradient" : tingkat === "kanwil" ? "bg-kanwil-gradient" : "bg-upt-gradient";
  const judul =
    tingkat === "pusat"
      ? kanwilQ
        ? semuaKanwil.find((k) => k.id === kanwilQ)?.nama ?? "Dasbor Nasional"
        : "Dasbor Nasional Pengamanan Ketahanan Pangan"
      : tingkat === "kanwil"
        ? `Dasbor ${unit ?? "Kantor Wilayah"}`
        : unit ?? "Dasbor UPT";
  const jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(now));
  const hariIni = aktif.filter((r) => r.status_kesiapan === "Dapat Dimulai" || r.status_kesiapan === "Menunggu");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className={`${latar} relative overflow-hidden rounded-[1.6rem] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_28px_50px_-30px_hsl(222_64%_14%/0.8)] sm:p-6 md:p-8 [&_.text-muted-foreground]:!text-white/80`}>
        <MotifPangan />
        <div className="relative grid gap-6 md:grid-cols-[1.6fr_1fr] md:items-end">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(44_90%_66%/0.5)] bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(44_90%_76%)]">
              {LABEL_TINGKAT[tingkat]} · {fmtTanggal(now)}
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-[2.2rem] md:leading-[1.1]">{judul}</h1>
            <p className="mt-2 text-sm text-white/85">
              {sapaan(jam)}, {user.fullName.split(" ")[0]} ({ROLE_LABEL[user.role]}).{" "}
              {perlu.length > 0 ? `${perlu.length} kegiatan perlu perhatian sekarang.` : "Tidak ada kegiatan yang perlu perhatian khusus saat ini."}
            </p>
            <div className="mt-4 hidden sm:block"><DeretSektor hitung={tingkat === "upt" ? undefined : perJenis} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="hidden rounded-full border border-white/30 bg-white/15 px-3 py-1.5 sm:inline-flex"><RealtimeRefresh /></span>
            {tingkat !== "upt" && <Button asChild size="sm" variant="outline"><Link href="/peta">Buka peta</Link></Button>}
            {tingkat !== "upt" && <Button asChild size="sm" variant="outline"><Link href="/akun"><Users className="h-4 w-4" aria-hidden />{tingkat === "kanwil" ? "Akun UPT" : "Kelola akun"}</Link></Button>}
            {user.role === "operator" && <Button asChild size="sm" variant="outline"><Link href="/kegiatan">Siapkan kegiatan</Link></Button>}
            {user.role === "kepala_pengamanan" && <Button asChild size="sm" variant="outline"><Link href="/keputusan">Antrean keputusan</Link></Button>}
            <Button asChild size="sm" variant="outline"><Link href="/laporan"><FileCheck2 className="h-4 w-4" aria-hidden />Laporan</Link></Button>
          </div>
        </div>
      </section>

      <BeritaBerjalan butir={berita} />

      {error && <Alert tone="bahaya">Data belum bisa dibaca dari database. Muat ulang halaman, atau hubungi Administrator bila berulang.</Alert>}

      {luas && daftarUpt.length > 1 && (
        <form className="flex flex-wrap items-center gap-2" aria-label="Pilih UPT">
          {kanwilQ && <input type="hidden" name="kanwil" value={kanwilQ} />}
          <label htmlFor="upt" className="text-sm font-medium">UPT</label>
          <Select id="upt" name="upt" defaultValue={upt ?? ""} className="w-full sm:w-80">
            <option value="">Semua UPT pada cakupan</option>
            {daftarUpt.map((u) => <option key={u.id} value={u.kode}>{u.nama}</option>)}
          </Select>
          <Button type="submit" variant="outline" size="sm">Terapkan</Button>
          {(upt || kanwilQ) && <Button asChild variant="ghost" size="sm"><Link href="/">Kembali ke {tingkat === "pusat" ? "nasional" : "wilayah"}</Link></Button>}
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
        <Link href="/laporan?status=menunggu" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StatCard icon={FileCheck2} nada="teal" nilai={menungguSah.length} label="laporan menunggu pengesahan" /></Link>
        <Link href="/gelang" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StatCard icon={tlTerlambat > 0 ? Clock : BellRing} nada={alarmMenunggu > 0 ? "kritis" : "hijau"} nilai={alarmMenunggu} label={`alarm gelang menunggu konfirmasi${tlTerlambat ? ` · ${tlTerlambat} tindak lanjut lewat tenggat` : ""}`} /></Link>
      </section>

      {tingkat === "upt" && (
        <section className="space-y-3" aria-label="Kegiatan hari ini">
          <h2 className="text-lg font-semibold tracking-tight">Kegiatan berjalan dan tahap pengawalan</h2>
          {hariIni.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada kegiatan aktif di UPT ini.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {hariIni.map((r) => {
                const n = nTahap.get(r.session_id!) ?? 0;
                return (
                  <li key={r.session_id} className="min-w-0">
                    <Link href={`/sesi/${r.session_id}`} className="kaca lift block rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{r.jenis_kegiatan} · {r.lokasi_nama}</p>
                          <p className="text-xs text-muted-foreground">{r.kode_kegiatan} · {fmtTanggalPendek(r.tanggal_sesi)} · {r.jumlah_narapidana} WB · {r.status_kesiapan}</p>
                        </div>
                        {r.status_keamanan && <StatusBadge status={r.status_keamanan} />}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`${n} dari 4 tahap`}>
                        {["P2U", "Perjalanan", "Pelaksanaan", "Kembali"].map((t, i) => (
                          <div key={t} className="text-center">
                            <div className={cn("h-1.5 rounded-full", i < n ? "bg-status-hijau" : "bg-ink/10")} />
                            <p className={cn("mt-1 text-[10px]", i < n ? "font-semibold text-[hsl(152_70%_24%)]" : "text-muted-foreground")}>{t}</p>
                          </div>
                        ))}
                      </div>
                      {n === 4 && !disahkan.has(r.session_id!) && <p className="mt-2 text-xs font-semibold text-[hsl(34_92%_30%)]">Laporan siap disahkan</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {rekap.length > 0 && (
        <TabelRekap judul={tingkat === "pusat" ? "Rekap per Kantor Wilayah" : "Rekap per UPT"} kolom={tingkat === "pusat" ? "Kanwil" : "UPT"} data={rekap} />
      )}

      <AlurKerja role={user.role} />

      {sdp && (
        <section aria-label="Ringkasan data SDP ketahanan pangan" className="kaca rounded-2xl p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">Ketahanan pangan nasional · SDP {sdpQ.data!.tahun}</h2>
            <Link href="/sdp" className="inline-flex items-center text-xs font-semibold text-primary hover:underline">Lihat rincian per Kanwil<ChevronRight className="h-3.5 w-3.5" aria-hidden /></Link>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
            {KPI_SDP.map((k) => (
              <div key={k.kunci} className="min-w-0 rounded-xl border border-border/60 bg-white/60 px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</dt>
                <dd className="mt-0.5 break-words font-mono text-base font-medium tabular-nums">{sdp.kpi[k.kunci] || "-"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-label="Daftar sesi" className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Sesi kegiatan</h2>
        <SesiTabel rows={urut} now={now} tampilkanUpt={luas} />
      </section>
    </div>
  );
}
