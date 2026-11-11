import { Fish, Leaf, Ruler, Sprout, Wheat } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, PageHeader, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { catatHasil, hapusHasil } from "@/lib/actions/pangan";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { fmtTanggal, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { JENIS_KEGIATAN, SATUAN_PANGAN } from "@/lib/validations/induk";

export const metadata = { title: "Hasil ketahanan pangan" };
export const dynamic = "force-dynamic";

const TGL = /^\d{4}-\d{2}-\d{2}$/;
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const kapital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Agregat = { komoditas: string; jenis: string; satuan: string; volume: number; luas: number; jumlah: number; upt: Set<string> };

export default async function PanganPage({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string; kanwil?: string; upt?: string }> }) {
  const q = await searchParams;
  const hariIni = hariIniWib();
  const sampai = q.sampai && TGL.test(q.sampai) ? q.sampai : hariIni;
  const dari = q.dari && TGL.test(q.dari) ? q.dari : `${hariIni.slice(0, 4)}-01-01`;
  const supabase = await createClient();
  const user = await requireUser();
  const cak = await ambilCakupan(supabase, user, q);

  const [{ data: rekap }, { data: terbaru }] = await Promise.all([
    supabase.rpc("rekap_pangan", { p_dari: dari, p_sampai: sampai, p_kanwil: cak.kanwilDipilih || null, p_upt: cak.uptDipilih || null }),
    (() => {
      let k = supabase.from("v_hasil_pangan").select("*").gte("tanggal", dari).lte("tanggal", sampai).order("tanggal", { ascending: false }).order("created_at", { ascending: false }).limit(50);
      if (cak.uptDipilih) k = k.eq("kode_upt", cak.uptDipilih);
      else if (cak.kanwilDipilih) k = k.eq("kanwil_id", cak.kanwilDipilih);
      return k;
    })(),
  ]);

  const peta = new Map<string, Agregat>();
  const perUpt = new Map<string, { nama: string; kanwil: string; jumlah: number; luas: number; volume: Map<string, number> }>();
  for (const r of rekap ?? []) {
    const kunci = `${r.komoditas}|${r.satuan}|${r.jenis}`;
    const a = peta.get(kunci) ?? { komoditas: r.komoditas, jenis: r.jenis, satuan: r.satuan, volume: 0, luas: 0, jumlah: 0, upt: new Set<string>() };
    a.volume += Number(r.volume);
    a.luas += Number(r.luas_ha);
    a.jumlah += Number(r.jumlah);
    if (r.kode_upt) a.upt.add(r.kode_upt);
    peta.set(kunci, a);
    if (r.kode_upt) {
      const u = perUpt.get(r.kode_upt) ?? { nama: r.upt_nama ?? r.kode_upt, kanwil: r.kanwil_nama ?? "-", jumlah: 0, luas: 0, volume: new Map<string, number>() };
      u.jumlah += Number(r.jumlah);
      u.luas += Number(r.luas_ha);
      u.volume.set(r.satuan, (u.volume.get(r.satuan) ?? 0) + Number(r.volume));
      perUpt.set(r.kode_upt, u);
    }
  }
  const daftar = [...peta.values()].sort((a, b) => b.volume - a.volume);
  const luasTotal = daftar.reduce((a, b) => a + b.luas, 0);
  const jumlah = (j: string) => daftar.filter((x) => x.jenis === j).reduce((a, b) => a + b.jumlah, 0);
  const jenisKomoditas = new Set(daftar.map((d) => d.komoditas)).size;
  const daftarUpt = [...perUpt.entries()].sort((a, b) => b[1].jumlah - a[1].jumlah);
  const upt = cak.uptDipilih;
  const bisaCatat = cak.bisaKelola && Boolean(upt);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Hasil ketahanan pangan" description="Rekap komoditas, volume, dan luas lahan dari kegiatan pertanian, peternakan, dan perikanan di UPT." />

      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={upt} jaga={{ dari, sampai }} />}

      <form className="flex flex-wrap items-end gap-3" aria-label="Pilih periode">
        {cak.kanwilDipilih && !cak.terkunci && <input type="hidden" name="kanwil" value={cak.kanwilDipilih} />}
        {upt && !cak.terkunci && <input type="hidden" name="upt" value={upt} />}
        <Field label="Dari" htmlFor="dari"><Input id="dari" name="dari" type="date" defaultValue={dari} /></Field>
        <Field label="Sampai" htmlFor="sampai"><Input id="sampai" name="sampai" type="date" defaultValue={sampai} /></Field>
        <Button type="submit" variant="outline">Terapkan</Button>
      </form>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Ringkasan hasil pangan">
        <StatCard icon={Wheat} nada="teal" nilai={jenisKomoditas} label="jenis komoditas" />
        <StatCard icon={Ruler} nada="biru" nilai={nf.format(luasTotal)} label="hektare lahan" />
        <StatCard icon={Sprout} nada="hijau" nilai={jumlah("Pertanian")} label="catatan pertanian" />
        <StatCard icon={Leaf} nada="kuning" nilai={jumlah("Peternakan")} label="catatan peternakan" />
        <StatCard icon={Fish} nada="biru" nilai={jumlah("Perikanan")} label="catatan perikanan" />
      </section>

      {bisaCatat && (
        <Card>
          <CardHeader><CardTitle>Catat hasil</CardTitle><CardDescription>Panen, produksi ternak, atau tangkapan ikan. Satu baris per komoditas dan tanggal.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={catatHasil} submit="Simpan hasil" fields={{ kode_upt: { v: upt }, jenis: { s: "h-jenis" }, komoditas: { s: "h-kom" }, tanggal: { s: "h-tgl" }, volume: { n: "h-vol" }, satuan: { s: "h-sat" }, luas_ha: { n: "h-luas" }, catatan: { s: "h-cat" } }}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Jenis kegiatan" htmlFor="h-jenis"><Select id="h-jenis" name="h-jenis" defaultValue="Pertanian">{JENIS_KEGIATAN.map((j) => <option key={j}>{j}</option>)}</Select></Field>
                <Field label="Komoditas" htmlFor="h-kom"><Input id="h-kom" name="h-kom" required maxLength={100} placeholder="Mis. Padi, Lele, Ayam petelur" /></Field>
                <Field label="Tanggal" htmlFor="h-tgl"><Input id="h-tgl" name="h-tgl" type="date" required defaultValue={hariIni} /></Field>
                <Field label="Volume" htmlFor="h-vol"><Input id="h-vol" name="h-vol" type="number" step="any" min={0} required /></Field>
                <Field label="Satuan" htmlFor="h-sat"><Select id="h-sat" name="h-sat" defaultValue="kg">{SATUAN_PANGAN.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="Luas lahan (ha)" htmlFor="h-luas" hint="Kosongkan untuk peternakan atau perikanan tanpa lahan."><Input id="h-luas" name="h-luas" type="number" step="any" min={0} /></Field>
                <Field label="Catatan" htmlFor="h-cat" className="sm:col-span-3"><Textarea id="h-cat" name="h-cat" rows={2} maxLength={500} /></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Per komoditas</CardTitle><CardDescription>Periode {fmtTanggal(dari)} sampai {fmtTanggal(sampai)}. Satuan yang berbeda tidak dijumlahkan.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {daftar.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada hasil pangan pada periode ini.</p> : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">Komoditas</th><th className="py-2 pr-3">Jenis</th><th className="py-2 pr-3 text-right">Volume</th><th className="py-2 pr-3 text-right">Luas (ha)</th><th className="py-2 pr-3 text-right">Catatan</th><th className="py-2 text-right">UPT</th></tr></thead>
              <tbody className="divide-y">
                {daftar.map((d) => (
                  <tr key={`${d.komoditas}|${d.satuan}|${d.jenis}`}>
                    <td className="py-2.5 pr-3 font-medium">{kapital(d.komoditas)}</td>
                    <td className="py-2.5 pr-3"><Pill tone="biru">{d.jenis}</Pill></td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{nf.format(d.volume)} {d.satuan}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{d.luas ? nf.format(d.luas) : "-"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{d.jumlah}</td>
                    <td className="py-2.5 text-right tabular-nums">{d.upt.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {daftarUpt.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Per UPT</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">UPT</th><th className="py-2 pr-3">Kanwil</th><th className="py-2 pr-3 text-right">Catatan</th><th className="py-2 pr-3 text-right">Luas (ha)</th><th className="py-2">Volume</th></tr></thead>
              <tbody className="divide-y">
                {daftarUpt.slice(0, 100).map(([kode, u]) => (
                  <tr key={kode}>
                    <td className="py-2.5 pr-3 font-medium">{u.nama}</td>
                    <td className="py-2.5 pr-3">{u.kanwil}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.jumlah}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.luas ? nf.format(u.luas) : "-"}</td>
                    <td className="py-2.5 tabular-nums">{[...u.volume.entries()].map(([s, v]) => `${nf.format(v)} ${s}`).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Catatan terbaru</CardTitle><CardDescription>Maksimal 50 catatan terakhir pada periode ini.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {(terbaru ?? []).length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada catatan.</p> : (
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">UPT</th><th className="py-2 pr-3">Komoditas</th><th className="py-2 pr-3 text-right">Volume</th><th className="py-2 pr-3">Catatan</th><th className="py-2" /></tr></thead>
              <tbody className="divide-y">
                {(terbaru ?? []).map((h) => (
                  <tr key={h.id} className="align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{fmtTanggal(h.tanggal)}</td>
                    <td className="py-2.5 pr-3">{h.upt_nama ?? h.kode_upt}</td>
                    <td className="py-2.5 pr-3">{kapital(h.komoditas ?? "")} <span className="text-xs text-muted-foreground">({h.jenis})</span></td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{nf.format(Number(h.volume))} {h.satuan}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{h.catatan ?? "-"}</td>
                    <td className="py-2.5 text-right">{cak.bisaKelola && h.id ? <ActionButton action={hapusHasil} input={{ id: h.id }} label="Hapus" variant="outline" confirm="Hapus catatan ini? Tindakan ini tidak bisa dibatalkan." /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
