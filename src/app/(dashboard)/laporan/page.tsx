import Link from "next/link";
import { Download, FileCheck2 } from "lucide-react";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { TabelCari } from "@/components/ui/tabel-cari";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { fmtTanggalPendek, hariIniWib, tambahHari } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Laporan kegiatan" };
export const dynamic = "force-dynamic";

type Q = { kanwil?: string; upt?: string; status?: string };

export default async function DaftarLaporanPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const cak = await ambilCakupan(supabase, user, q);

  let kueri = supabase
    .from("v_session_overview")
    .select("session_id,kode_kegiatan,jenis_kegiatan,lokasi_nama,tanggal_sesi,kode_upt,upt_nama,status_keamanan,status_kesiapan,jumlah_narapidana,latihan,ditutup_at")
    .gte("tanggal_sesi", tambahHari(hariIniWib(), -120))
    .order("tanggal_sesi", { ascending: false })
    .limit(500);
  if (cak.uptDipilih) kueri = kueri.eq("kode_upt", cak.uptDipilih);
  else if (cak.kanwilDipilih) kueri = kueri.in("kode_upt", cak.upt.filter((u) => u.kanwil_id === cak.kanwilDipilih).map((u) => u.kode));
  const { data: sesi, error } = await kueri;
  const ids = (sesi ?? []).map((s) => s.session_id!).filter(Boolean);

  const [tahap, sah, lamp] = ids.length
    ? await Promise.all([
        supabase.from("tahap_pengawalan").select("session_id,tahap").in("session_id", ids),
        supabase.from("daily_sessions").select("id,disahkan_at").in("id", ids),
        supabase.from("lampiran_tahap").select("session_id").in("session_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const nTahap = new Map<string, number>();
  (tahap.data ?? []).forEach((t) => nTahap.set(t.session_id, (nTahap.get(t.session_id) ?? 0) + 1));
  const nLamp = new Map<string, number>();
  (lamp.data ?? []).forEach((t) => nLamp.set(t.session_id, (nLamp.get(t.session_id) ?? 0) + 1));
  const disahkan = new Map((sah.data ?? []).map((s) => [s.id, s.disahkan_at]));

  const baris = (sesi ?? [])
    .map((s) => {
      const n = nTahap.get(s.session_id!) ?? 0;
      const st = disahkan.get(s.session_id!) ? "sah" : n === 4 ? "menunggu" : n > 0 ? "berjalan" : "belum";
      return { ...s, n, st, lamp: nLamp.get(s.session_id!) ?? 0 };
    })
    .filter((s) => !q.status || s.st === q.status);
  const hitung = (st: string) => (sesi ?? []).filter((s) => {
    const n = nTahap.get(s.session_id!) ?? 0;
    return (disahkan.get(s.session_id!) ? "sah" : n === 4 ? "menunggu" : n > 0 ? "berjalan" : "belum") === st;
  }).length;

  const LABEL: Record<string, { t: string; tone: "hijau" | "kuning" | "biru" | "netral" }> = {
    sah: { t: "Disahkan", tone: "hijau" },
    menunggu: { t: "Menunggu pengesahan", tone: "kuning" },
    berjalan: { t: "Tahap berjalan", tone: "biru" },
    belum: { t: "Belum mulai", tone: "netral" },
  };
  const sp = new URLSearchParams({ ...(cak.kanwilDipilih ? { kanwil: cak.kanwilDipilih } : {}), ...(cak.uptDipilih ? { upt: cak.uptDipilih } : {}) });

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      <PageHeader
        title="Laporan pelaksanaan kegiatan"
        description="Setiap sesi menghasilkan satu laporan resmi berkop UPT: dasar, waktu dan tempat, WB, pengawal, pengesah berkas, dan lampiran dokumentasi. Unduh sebagai PDF dari halaman laporan."
        actions={<Button asChild variant="outline" size="sm"><a href={`/laporan/ekspor?${sp.toString()}`}><Download className="h-4 w-4" aria-hidden />Unduh rekap (Excel)</a></Button>}
      />
      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={cak.uptDipilih} jaga={q.status ? { status: q.status } : {}} />}

      <div className="flex flex-wrap gap-2 text-sm">
        {[["", "Semua", (sesi ?? []).length], ["menunggu", "Menunggu pengesahan", hitung("menunggu")], ["sah", "Disahkan", hitung("sah")], ["berjalan", "Tahap berjalan", hitung("berjalan")], ["belum", "Belum mulai", hitung("belum")]].map(([k, l, n]) => {
          const p = new URLSearchParams(sp);
          if (k) p.set("status", String(k));
          const on = (q.status ?? "") === k;
          return <Link key={String(k)} href={`/laporan?${p.toString()}`} className={`rounded-full border px-3 py-1.5 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white hover:bg-secondary"}`}>{l} <span className="font-mono">{n}</span></Link>;
        })}
      </div>

      {error && <Alert tone="bahaya">Data belum bisa dibaca. Muat ulang halaman.</Alert>}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
        <TabelCari className="w-full min-w-[58rem] text-sm">
          <thead className="bg-secondary/80 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Kegiatan</th>{!cak.terkunci && <th className="px-3 py-2">UPT</th>}<th className="px-3 py-2">Tahap</th><th className="px-3 py-2">Lampiran</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Laporan</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody className="divide-y">
            {baris.map((s) => (
              <tr key={s.session_id} className="align-top hover:bg-brand-soft/40">
                <td className="px-3 py-2.5 tabular-nums">{fmtTanggalPendek(s.tanggal_sesi)}</td>
                <td className="px-3 py-2.5"><p className="font-medium">{s.jenis_kegiatan} · {s.lokasi_nama}</p><p className="text-xs text-muted-foreground">{s.kode_kegiatan}{s.latihan ? " · LATIHAN" : ""} · {s.jumlah_narapidana} WB</p></td>
                {!cak.terkunci && <td className="px-3 py-2.5 text-xs">{s.upt_nama ?? s.kode_upt}</td>}
                <td className="px-3 py-2.5">
                  <div className="flex gap-1" aria-label={`${s.n} dari 4 tahap`}>{[1, 2, 3, 4].map((i) => <span key={i} className={`h-2 w-6 rounded-full ${i <= s.n ? "bg-status-hijau" : "bg-ink/10"}`} />)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.n}/4 tahap</p>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{s.lamp}</td>
                <td className="px-3 py-2.5">{s.status_keamanan && <StatusBadge status={s.status_keamanan} />}</td>
                <td className="px-3 py-2.5"><Pill tone={LABEL[s.st].tone}>{LABEL[s.st].t}</Pill></td>
                <td className="px-3 py-2.5 text-right"><Link href={`/sesi/${s.session_id}/laporan`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><FileCheck2 className="h-4 w-4" aria-hidden />Buka</Link></td>
              </tr>
            ))}
          </tbody>
        </TabelCari>
        {baris.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada laporan pada cakupan ini.</p>}
      </div>
    </div>
  );
}
