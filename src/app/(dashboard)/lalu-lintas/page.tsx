import Link from "next/link";
import { ArrowLeftRight, DoorClosed, DoorOpen, Footprints, TriangleAlert } from "lucide-react";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { describeLog } from "@/lib/domain/describe";
import { ringkasLalin, selisihKembali } from "@/lib/domain/lalu-lintas";
import { fmtJam, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lalu lintas WBP" };
export const dynamic = "force-dynamic";

const TGL = /^\d{4}-\d{2}-\d{2}$/;
const BATAS = 300;
const JENIS_GERAK = ["Serah terima di blok", "P2U keluar atau masuk", "Tiba di lokasi", "Pindah area atau ganti pengawal", "Pengembalian sebagian"] as const;

export default async function LaluLintasPage({ searchParams }: { searchParams: Promise<{ tanggal?: string; kanwil?: string; upt?: string }> }) {
  const q = await searchParams;
  const tanggal = q.tanggal && TGL.test(q.tanggal) ? q.tanggal : hariIniWib();
  const supabase = await createClient();
  const user = await requireUser();
  const cak = await ambilCakupan(supabase, user, q);

  let kueri = supabase.from("v_session_overview").select("*").eq("tanggal_sesi", tanggal).eq("status_kesiapan", "Dapat Dimulai").order("kode_upt").order("kode_kegiatan").limit(BATAS);
  if (cak.uptDipilih) kueri = kueri.eq("kode_upt", cak.uptDipilih);
  else if (cak.kanwilDipilih) {
    const kode = cak.upt.filter((u) => u.kanwil_id === cak.kanwilDipilih).map((u) => u.kode);
    kueri = kueri.in("kode_upt", kode.length ? kode : ["-"]);
  }
  const { data: sesi, error } = await kueri;
  const daftar = sesi ?? [];
  const ringkas = ringkasLalin(daftar);

  const ids = daftar.map((s) => s.session_id).filter((x): x is string => !!x);
  const gerak = ids.length
    ? (await supabase.from("field_logs").select("id,session_id,waktu_kejadian,jenis_entri,payload").in("session_id", ids).in("jenis_entri", [...JENIS_GERAK]).order("waktu_kejadian", { ascending: false }).limit(120)).data ?? []
    : [];
  const infoSesi = new Map(daftar.map((s) => [s.session_id, s]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Lalu lintas WBP"
        description="Pergerakan warga binaan pada kegiatan yang berjalan: keluar dari blok, tiba di lokasi, pemeriksaan hitungan, dan kembali ke blok."
        actions={<RealtimeRefresh tabel={["field_logs"]} />}
      />

      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={cak.uptDipilih} jaga={{ tanggal }} />}

      <form className="flex flex-wrap items-end gap-3" aria-label="Pilih tanggal">
        {cak.kanwilDipilih && !cak.terkunci && <input type="hidden" name="kanwil" value={cak.kanwilDipilih} />}
        {cak.uptDipilih && !cak.terkunci && <input type="hidden" name="upt" value={cak.uptDipilih} />}
        <Field label="Tanggal sesi" htmlFor="tanggal"><Input id="tanggal" name="tanggal" type="date" defaultValue={tanggal} /></Field>
        <Button type="submit" variant="outline">Terapkan</Button>
      </form>

      {error && <Alert tone="bahaya">Data belum bisa dibaca. Muat ulang halaman.</Alert>}
      {daftar.length >= BATAS && <Alert tone="waspada">Hanya {BATAS} sesi pertama yang ditampilkan. Pilih Kanwil atau UPT untuk mempersempit.</Alert>}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Ringkasan lalu lintas">
        <StatCard icon={ArrowLeftRight} nada="biru" nilai={ringkas.sesi} label="sesi berjalan" />
        <StatCard icon={DoorOpen} nada="teal" nilai={ringkas.keluar} label="WB keluar dari blok" />
        <StatCard icon={Footprints} nada="kuning" nilai={ringkas.masihDiLuar} label="WB masih di luar" />
        <StatCard icon={DoorClosed} nada="hijau" nilai={ringkas.kembali} label="WB sudah kembali" />
        <StatCard icon={TriangleAlert} nada={ringkas.selisih > 0 ? "merah" : "hijau"} nilai={ringkas.selisih} label="sesi dengan selisih" />
      </section>

      <Card>
        <CardHeader><CardTitle>Per sesi</CardTitle><CardDescription>Selisih dihitung dari jumlah keluar dikurangi jumlah kembali. Selisih selain nol dinaikkan ke status MERAH otomatis.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {daftar.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada sesi berjalan pada tanggal ini.</p> : (
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="py-2 pr-3">Kegiatan</th><th className="py-2 pr-3">Fase</th><th className="py-2 pr-3">Keluar</th><th className="py-2 pr-3">Tiba</th><th className="py-2 pr-3">Hitung terakhir</th><th className="py-2 pr-3">Kembali</th><th className="py-2 pr-3">Selisih</th><th className="py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {daftar.map((o) => {
                  const sel = selisihKembali(o);
                  return (
                    <tr key={o.session_id} className="align-top">
                      <td className="py-2.5 pr-3">
                        <Link href={`/sesi/${o.session_id}`} className="font-medium text-brand hover:underline">{o.kode_kegiatan}</Link>{o.latihan ? <Pill tone="kuning" className="ml-2">Latihan</Pill> : null}
                        <span className="block text-xs text-muted-foreground">{o.upt_nama ?? o.kode_upt} · {o.lokasi_nama ?? "-"}</span>
                      </td>
                      <td className="py-2.5 pr-3">{o.fase}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{o.keluar_at ? `${o.wbp_keluar ?? "?"} WB · ${fmtJam(o.keluar_at)}` : "-"}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{o.tiba_at ? fmtJam(o.tiba_at) : "-"}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{o.hitung_terakhir_at ? `${o.wbp_terakhir_dihitung ?? "?"} WB · ${fmtJam(o.hitung_terakhir_at)}` : "-"}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{o.kembali_at ? `${o.wbp_kembali ?? "?"} WB · ${fmtJam(o.kembali_at)}` : "-"}</td>
                      <td className="py-2.5 pr-3">{sel === null ? "-" : sel === 0 ? <Pill tone="hijau">Cocok</Pill> : <Pill tone="merah">{sel > 0 ? `${sel} belum kembali` : `${-sel} lebih`}</Pill>}</td>
                      <td className="py-2.5">{o.status_keamanan ? <StatusBadge status={o.status_keamanan} /> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Jejak pergerakan</CardTitle><CardDescription>Catatan serah terima, P2U, kedatangan, pindah area, dan pengembalian sebagian. Terbaru di atas.</CardDescription></CardHeader>
        <CardContent>
          {gerak.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada catatan pergerakan.</p> : (
            <ol className="divide-y">
              {gerak.map((g) => {
                const o = infoSesi.get(g.session_id);
                return (
                  <li key={g.id} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[5rem_1fr] sm:gap-4">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmtJam(g.waktu_kejadian)}</span>
                    <span>
                      {describeLog(g.jenis_entri, g.payload)}
                      <span className="block text-xs text-muted-foreground">{o?.kode_kegiatan} · {o?.upt_nama ?? o?.kode_upt}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
