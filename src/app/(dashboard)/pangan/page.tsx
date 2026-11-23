import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Building2, Coins, ExternalLink, Leaf, Minus, Ruler, Users } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { GrafikOmset, GrafikWbp } from "@/components/pangan/grafik-pangan";
import { PetaKomoditas } from "@/components/pangan/peta-komoditas";
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
import { angka, angkaBulat, bacaRekap, kapital as kapitalKom, namaPendek, peringkat, rupiahBagian, tren, type KunciUrut, type RekapPeringkat } from "@/lib/domain/pangan-sdp";
import { SDP_URL, bacaDataSdp } from "@/lib/domain/sdp";
import { TabelCari } from "@/components/ui/tabel-cari";

export const metadata = { title: "Hasil ketahanan pangan" };
export const dynamic = "force-dynamic";

const TGL = /^\d{4}-\d{2}-\d{2}$/;
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const kapital = kapitalKom;

type Agregat = { komoditas: string; jenis: string; satuan: string; volume: number; luas: number; jumlah: number; upt: Set<string> };

export default async function PanganPage({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string; kanwil?: string; upt?: string }> }) {
  const q = await searchParams;
  const hariIni = hariIniWib();
  const sampai = q.sampai && TGL.test(q.sampai) ? q.sampai : hariIni;
  const dari = q.dari && TGL.test(q.dari) ? q.dari : `${hariIni.slice(0, 4)}-01-01`;
  const supabase = await createClient();
  const user = await requireUser();
  const cak = await ambilCakupan(supabase, user, q);

  const [{ data: rekap }, { data: rekapSdp }, { data: sdpBaris }, { data: terbaru }] = await Promise.all([
    supabase.rpc("rekap_pangan", { p_dari: dari, p_sampai: sampai, p_kanwil: cak.kanwilDipilih || null, p_upt: cak.uptDipilih || null }),
    supabase.rpc("rekap_pangan_sdp", { p_dari: dari, p_sampai: sampai, p_kanwil: cak.kanwilDipilih || null, p_upt: cak.uptDipilih || null }),
    supabase.from("sdp_ringkasan").select("tahun,data,tanggal_data").order("tahun", { ascending: false }).limit(1).maybeSingle(),
    (() => {
      let k = supabase.from("v_hasil_pangan").select("*").gte("tanggal", dari).lte("tanggal", sampai).order("tanggal", { ascending: false }).order("created_at", { ascending: false }).limit(50);
      if (cak.uptDipilih) k = k.eq("kode_upt", cak.uptDipilih);
      else if (cak.kanwilDipilih) k = k.eq("kanwil_id", cak.kanwilDipilih);
      return k;
    })(),
  ]);

  const sdp = sdpBaris ? bacaDataSdp(sdpBaris.data) : null;
  const r = bacaRekap(rekapSdp);
  const teratas = r.komoditas.slice(0, 8).map((k) => k.kom);
  const peringkatKanwil = !cak.uptDipilih && r.peringkat.length > 1;
  const golongan = cak.kanwilDipilih ? "UPT" : "Kanwil";
  const trenTon = tren(r.kpi.ton, r.sebelumnya.ton);
  const trenNilai = tren(r.kpi.nilai, r.sebelumnya.nilai);
  const nilaiBagian = rupiahBagian(r.kpi.nilai);
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
    <div className="mx-auto max-w-[1680px] space-y-6">
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
        <StatCard icon={Leaf} nada="hijau" nilai={<Satuan a={angka(r.kpi.ton)} s="ton" />} label="Total produksi" catatan={<Tren t={trenTon} />} />
        <StatCard icon={Coins} nada="kuning" nilai={<Satuan p="Rp" a={nilaiBagian.angka} s={nilaiBagian.satuan} />} label="Nilai produksi" catatan={<Tren t={trenNilai} />} />
        <StatCard icon={Users} nada="biru" nilai={<Satuan a={angkaBulat(r.kpi.wbp_rata)} s="orang" />} label="Rata-rata WBP terlibat per bulan" />
        <StatCard icon={Ruler} nada="teal" nilai={<Satuan a={angka(r.kpi.luas_m2)} s="m²" />} label="Luas lahan digunakan" />
        <StatCard icon={Building2} nada="biru" nilai={r.kpi.upt} label="UPT melapor" catatan={<span className="text-muted-foreground">{r.kpi.komoditas} jenis komoditas · {r.kpi.catatan} catatan</span>} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Grafik bulanan">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Omset per bulan</CardTitle><CardDescription>Nilai produksi yang dicatat, dalam miliar rupiah.</CardDescription></CardHeader>
          <CardContent><GrafikOmset data={r.bulanan} /></CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle>Tren WBP terlibat dan premi</CardTitle><CardDescription>WBP terlibat dalam orang, premi dalam juta rupiah.</CardDescription></CardHeader>
          <CardContent><GrafikWbp data={r.bulanan} /></CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Peta persebaran produksi komoditas UPT</CardTitle><CardDescription>Satu titik per UPT, diwarnai menurut komoditas dengan nilai produksi tertinggi di UPT itu. Klik titik untuk melihat rinciannya.</CardDescription></CardHeader>
        <CardContent>
          {r.upt.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada hasil pangan pada periode ini, jadi belum ada titik yang bisa ditampilkan.</p> : <PetaKomoditas titik={r.upt} teratas={teratas} />}
        </CardContent>
      </Card>

      {peringkatKanwil && (
        <section className="space-y-4" aria-label={`Peringkat ${golongan}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Peringkat judul={`10 ${golongan} teratas (produksi dan omset)`} data={peringkat(r.peringkat, "ton", "atas")} kolom="produksi" />
            <Peringkat judul={`10 ${golongan} terbawah (produksi dan omset)`} data={peringkat(r.peringkat, "ton", "bawah")} kolom="produksi" />
            <Peringkat judul={`10 ${golongan} teratas (warga binaan terlibat)`} data={peringkat(r.peringkat, "wbp", "atas")} kolom="wbp" />
            <Peringkat judul={`10 ${golongan} terbawah (warga binaan terlibat)`} data={peringkat(r.peringkat, "wbp", "bawah")} kolom="wbp" />
            <Peringkat judul={`10 ${golongan} teratas (luas lahan)`} data={peringkat(r.peringkat, "luas_m2", "atas")} kolom="luas" />
            <Peringkat judul={`10 ${golongan} terbawah (luas lahan)`} data={peringkat(r.peringkat, "luas_m2", "bawah")} kolom="luas" />
          </div>
          <p className="text-xs text-muted-foreground">Produksi dihitung dari satuan kg, kwintal, dan ton yang diubah ke ton. Satuan liter, ekor, dan butir ada pada tabel per komoditas di bawah. {golongan} tanpa data pada ukuran tertentu tidak ikut diperingkat.</p>
        </section>
      )}

      {sdp && (
        <Card>
          <CardHeader>
            <CardTitle>Pembanding data SDP</CardTitle>
            <CardDescription>Angka resmi pada dasbor Detail Ketahanan Pangan SDP{sdpBaris?.tahun ? ` tahun ${sdpBaris.tahun}` : ""}, sebagai pembanding catatan UPT di atas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <p><span className="text-muted-foreground">Total produksi SDP</span><br /><strong className="text-base tabular-nums">{sdp.kpi.total_produksi}</strong></p>
            <p><span className="text-muted-foreground">Nilai produksi SDP</span><br /><strong className="text-base tabular-nums">{sdp.kpi.nilai_produksi}</strong></p>
            <p><span className="text-muted-foreground">Catatan UPT pada periode ini</span><br /><strong className="text-base tabular-nums">{angka(r.kpi.ton)} ton · Rp {nilaiBagian.angka} {nilaiBagian.satuan}</strong></p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/sdp">Rincian data SDP</Link></Button>
              <Button asChild variant="outline" size="sm"><a href={SDP_URL} target="_blank" rel="noopener noreferrer">Buka dasbor SDP <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bisaCatat && (
        <Card>
          <CardHeader><CardTitle>Catat hasil</CardTitle><CardDescription>Panen, produksi ternak, atau tangkapan ikan. Satu baris per komoditas dan tanggal.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={catatHasil} submit="Simpan hasil" fields={{ kode_upt: { v: upt }, jenis: { s: "h-jenis" }, komoditas: { s: "h-kom" }, tanggal: { s: "h-tgl" }, volume: { n: "h-vol" }, satuan: { s: "h-sat" }, luas_ha: { n: "h-luas" }, nilai_rp: { n: "h-nilai" }, wbp_terlibat: { n: "h-wbp" }, premi_rp: { n: "h-premi" }, catatan: { s: "h-cat" } }}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Jenis kegiatan" htmlFor="h-jenis"><Select id="h-jenis" name="h-jenis" defaultValue="Pertanian">{JENIS_KEGIATAN.map((j) => <option key={j}>{j}</option>)}</Select></Field>
                <Field label="Komoditas" htmlFor="h-kom"><Input id="h-kom" name="h-kom" required maxLength={100} placeholder="Mis. Padi, Lele, Ayam petelur" /></Field>
                <Field label="Tanggal" htmlFor="h-tgl"><Input id="h-tgl" name="h-tgl" type="date" required defaultValue={hariIni} /></Field>
                <Field label="Volume" htmlFor="h-vol"><Input id="h-vol" name="h-vol" type="number" step="any" min={0} required /></Field>
                <Field label="Satuan" htmlFor="h-sat"><Select id="h-sat" name="h-sat" defaultValue="kg">{SATUAN_PANGAN.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="Luas lahan (ha)" htmlFor="h-luas" hint="Kosongkan untuk peternakan atau perikanan tanpa lahan."><Input id="h-luas" name="h-luas" type="number" step="any" min={0} /></Field>
                <Field label="Nilai produksi (Rp)" htmlFor="h-nilai" hint="Omset dari hasil ini, tanpa titik atau koma."><Input id="h-nilai" name="h-nilai" type="number" step="1" min={0} /></Field>
                <Field label="WBP terlibat (orang)" htmlFor="h-wbp" hint="Jumlah warga binaan yang mengerjakan kegiatan ini."><Input id="h-wbp" name="h-wbp" type="number" step="1" min={0} /></Field>
                <Field label="Premi WBP (Rp)" htmlFor="h-premi" hint="Premi yang dibayarkan kepada warga binaan."><Input id="h-premi" name="h-premi" type="number" step="1" min={0} /></Field>
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
            <TabelCari className="w-full min-w-[40rem] text-sm">
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
            </TabelCari>
          )}
        </CardContent>
      </Card>

      {daftarUpt.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Per UPT</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <TabelCari className="w-full min-w-[40rem] text-sm">
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
            </TabelCari>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Catatan terbaru</CardTitle><CardDescription>Maksimal 50 catatan terakhir pada periode ini.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {(terbaru ?? []).length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada catatan.</p> : (
            <TabelCari className="w-full min-w-[52rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">UPT</th><th className="py-2 pr-3">Komoditas</th><th className="py-2 pr-3 text-right">Volume</th><th className="py-2 pr-3 text-right">Nilai (Rp)</th><th className="py-2 pr-3 text-right">WBP</th><th className="py-2 pr-3">Catatan</th><th className="py-2" /></tr></thead>
              <tbody className="divide-y">
                {(terbaru ?? []).map((h) => (
                  <tr key={h.id} className="align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{fmtTanggal(h.tanggal)}</td>
                    <td className="py-2.5 pr-3">{h.upt_nama ?? h.kode_upt}</td>
                    <td className="py-2.5 pr-3">{kapital(h.komoditas ?? "")} <span className="text-xs text-muted-foreground">({h.jenis})</span></td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{nf.format(Number(h.volume))} {h.satuan}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{h.nilai_rp ? nf.format(Number(h.nilai_rp)) : "-"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{h.wbp_terlibat ?? "-"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{h.catatan ?? "-"}</td>
                    <td className="py-2.5 text-right">{cak.bisaKelola && h.id ? <ActionButton action={hapusHasil} input={{ id: h.id }} label="Hapus" variant="outline" confirm="Hapus catatan ini? Tindakan ini tidak bisa dibatalkan." /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </TabelCari>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Satuan({ a, s, p }: { a: string; s: string; p?: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0 whitespace-nowrap">
      {p ? <span className="text-[0.95rem] font-medium text-muted-foreground">{p}</span> : null}
      <span className="text-[1.7rem]">{a}</span>
      {s ? <span className="text-[0.95rem] font-medium text-muted-foreground">{s}</span> : null}
    </span>
  );
}

function Tren({ t }: { t: ReturnType<typeof tren> }) {
  if (!t) return <span className="text-muted-foreground">Belum ada pembanding periode sebelumnya</span>;
  if (t.arah === "tetap") return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-3.5 w-3.5" aria-hidden />Tetap</span>;
  const naik = t.arah === "naik";
  const Ikon = naik ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 font-medium ${naik ? "text-status-hijau" : "text-status-merah"}`}><Ikon className="h-3.5 w-3.5" aria-hidden />{naik ? "Naik" : "Turun"} {angka(t.persen)}% dari periode sebelumnya</span>;
}

const RUPIAH = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
function Peringkat({ judul, data, kolom }: { judul: string; data: RekapPeringkat[]; kolom: "produksi" | "wbp" | "luas" }) {
  return (
    <Card className="min-w-0">
      <CardHeader><CardTitle className="text-base">{judul}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        {data.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Belum ada data.</p> : (
          <table className="w-full min-w-[20rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 py-2 pr-2">No</th>
                <th className="py-2 pr-3">{judul.includes(" UPT ") ? "UPT" : "Kanwil"}</th>
                {kolom === "produksi" && <><th className="py-2 pr-3 text-right">Total produksi (ton)</th><th className="py-2 text-right">Total omset</th></>}
                {kolom === "wbp" && <th className="py-2 text-right">WBP terlibat (orang)</th>}
                {kolom === "luas" && <th className="py-2 text-right">Luas lahan (m²)</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((p, i) => (
                <tr key={`${p.nama}-${i}`}>
                  <td className="py-2 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium">{namaPendek(p.nama)}</td>
                  {kolom === "produksi" && <><td className="py-2 pr-3 text-right tabular-nums">{angka(p.ton)}</td><td className="whitespace-nowrap py-2 text-right tabular-nums">{p.nilai > 0 ? `Rp ${RUPIAH.format(p.nilai)}` : "-"}</td></>}
                  {kolom === "wbp" && <td className="py-2 text-right tabular-nums">{angkaBulat(p.wbp)}</td>}
                  {kolom === "luas" && <td className="py-2 text-right tabular-nums">{angka(p.luas_m2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
