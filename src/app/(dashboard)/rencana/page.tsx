import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { bersihkanKataCari, LABEL_STATUS_RENCANA, statusRencana, UKURAN_HALAMAN_RENCANA, type StatusRencana } from "@/lib/domain/rencana";
import { fmtTanggal, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rencana kegiatan" };
export const dynamic = "force-dynamic";

type Q = { q?: string; jenis?: string; status?: string; dari?: string; sampai?: string; kanwil?: string; upt?: string; hal?: string };
const TONE: Record<StatusRencana, "biru" | "hijau" | "netral"> = { akan: "biru", berjalan: "hijau", selesai: "netral" };

export default async function RencanaPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const cak = await ambilCakupan(supabase, user, q);
  const hariIni = hariIniWib();
  const kata = bersihkanKataCari(q.q);
  const jenis = ["Pertanian", "Peternakan", "Perikanan"].includes(q.jenis ?? "") ? (q.jenis as string) : "";
  const status = (["akan", "berjalan", "selesai"] as const).find((s) => s === q.status) ?? "";
  const tgl = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const dari = tgl(q.dari);
  const sampai = tgl(q.sampai);
  const hal = Math.max(1, Number.parseInt(q.hal ?? "1", 10) || 1);

  let kueri = supabase.from("v_rencana_kegiatan").select("*", { count: "exact" });
  if (cak.uptDipilih) kueri = kueri.eq("kode_upt", cak.uptDipilih);
  else if (cak.kanwilDipilih) kueri = kueri.eq("kanwil_id", cak.kanwilDipilih);
  if (jenis) kueri = kueri.eq("jenis_kegiatan", jenis as "Pertanian");
  if (status === "akan") kueri = kueri.gt("tanggal_mulai", hariIni);
  if (status === "berjalan") kueri = kueri.lte("tanggal_mulai", hariIni).or(`rencana_berakhir.is.null,rencana_berakhir.gte.${hariIni}`);
  if (status === "selesai") kueri = kueri.lt("rencana_berakhir", hariIni);
  if (dari) kueri = kueri.or(`rencana_berakhir.is.null,rencana_berakhir.gte.${dari}`);
  if (sampai) kueri = kueri.lte("tanggal_mulai", sampai);
  if (kata) {
    const p = `%${kata}%`;
    kueri = kueri.or(["kode_kegiatan", "upt_nama", "lokasi_nama", "nomor_surat_perintah", "nomor_persetujuan", "kanwil_nama"].map((k) => `${k}.ilike.${p}`).join(","));
  }
  const dari0 = (hal - 1) * UKURAN_HALAMAN_RENCANA;
  const { data, count, error } = await kueri.order("tanggal_mulai", { ascending: false }).order("kode_kegiatan", { ascending: false }).range(dari0, dari0 + UKURAN_HALAMAN_RENCANA - 1);
  const baris = data ?? [];
  const total = count ?? 0;
  const jumlahHal = Math.max(1, Math.ceil(total / UKURAN_HALAMAN_RENCANA));
  const tampilUpt = cak.uptDipilih === "" && !cak.terkunci;

  const param = (ubah: Partial<Q>) => {
    const sp = new URLSearchParams();
    const n: Q = { q: kata, jenis, status, dari, sampai, kanwil: cak.kanwilDipilih, upt: cak.uptDipilih, hal: String(hal), ...ubah };
    for (const [k, v] of Object.entries(n)) if (v && !(k === "hal" && v === "1")) sp.set(k, v);
    return `/rencana${sp.size ? `?${sp.toString()}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      <PageHeader
        title="Rencana kegiatan"
        description="Daftar rencana kegiatan yang sudah diinput UPT beserta lampirannya. Halaman ini hanya untuk melihat dan mencari; perubahan dilakukan Operator UPT di menu Kegiatan."
      />

      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={cak.uptDipilih} jaga={{ q: kata, jenis, status, dari, sampai }} />}

      <form className="flex flex-wrap items-end gap-3" aria-label="Cari rencana kegiatan">
        {cak.kanwilDipilih && !cak.terkunci && <input type="hidden" name="kanwil" value={cak.kanwilDipilih} />}
        {cak.uptDipilih && !cak.terkunci && <input type="hidden" name="upt" value={cak.uptDipilih} />}
        <Field label="Cari" htmlFor="r-q" className="min-w-[16rem] flex-1" hint="Kode kegiatan, UPT, Kanwil, lokasi, nomor surat perintah, atau nomor persetujuan.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="r-q" name="q" defaultValue={kata} placeholder="Cari rencana kegiatan…" className="pl-9" />
          </div>
        </Field>
        <Field label="Jenis" htmlFor="r-jenis">
          <Select id="r-jenis" name="jenis" defaultValue={jenis}><option value="">Semua jenis</option><option>Pertanian</option><option>Peternakan</option><option>Perikanan</option></Select>
        </Field>
        <Field label="Status" htmlFor="r-status">
          <Select id="r-status" name="status" defaultValue={status}><option value="">Semua status</option><option value="berjalan">Berjalan</option><option value="akan">Akan datang</option><option value="selesai">Selesai</option></Select>
        </Field>
        <Field label="Periode dari" htmlFor="r-dari"><Input id="r-dari" name="dari" type="date" defaultValue={dari} /></Field>
        <Field label="Sampai" htmlFor="r-sampai"><Input id="r-sampai" name="sampai" type="date" defaultValue={sampai} /></Field>
        <Button type="submit">Terapkan</Button>
        {(kata || jenis || status || dari || sampai) && <Button asChild variant="outline"><Link href={param({ q: "", jenis: "", status: "", dari: "", sampai: "", hal: "1" })}>Atur ulang</Link></Button>}
      </form>

      {error && <p className="text-sm text-status-merah">Daftar belum bisa dimuat. Muat ulang halaman ini.</p>}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5 text-sm text-muted-foreground">
          <span>{total} rencana kegiatan{total > UKURAN_HALAMAN_RENCANA ? ` · halaman ${Math.min(hal, jumlahHal)} dari ${jumlahHal}` : ""}</span>
          <span className="text-xs">Urut dari tanggal mulai terbaru</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Kegiatan <span className="font-normal normal-case">(klik kode untuk rincian)</span></th>
                {tampilUpt && <th className="px-3 py-2.5 font-medium">UPT</th>}
                <th className="px-3 py-2.5 font-medium">Lokasi</th>
                <th className="px-3 py-2.5 font-medium">Periode</th>
                <th className="px-3 py-2.5 text-right font-medium">Luas (ha)</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Sesi</th>
                <th className="px-3 py-2.5 font-medium">Lampiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {baris.length === 0 && (
                <tr><td colSpan={tampilUpt ? 8 : 7} className="px-4 py-10 text-center text-muted-foreground">Tidak ada rencana kegiatan yang cocok.</td></tr>
              )}
              {baris.map((r) => {
                const st = statusRencana(r.tanggal_mulai ?? hariIni, r.rencana_berakhir, hariIni);
                return (
                  <tr key={r.activity_id} className="align-top hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <Link href={`/rencana/${r.activity_id}`} className="font-medium text-primary hover:underline">{r.kode_kegiatan}</Link>
                      <div className="text-xs text-muted-foreground">{r.jenis_kegiatan}{r.latihan ? " · LATIHAN" : ""}</div>
                      {(r.nomor_surat_perintah || r.nomor_persetujuan) && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {r.nomor_surat_perintah ? `SP ${r.nomor_surat_perintah}` : ""}{r.nomor_surat_perintah && r.nomor_persetujuan ? " · " : ""}{r.nomor_persetujuan ? `Persetujuan ${r.nomor_persetujuan}` : ""}
                        </div>
                      )}
                    </td>
                    {tampilUpt && <td className="px-3 py-3">{r.upt_nama}<div className="text-xs text-muted-foreground">{r.kanwil_nama?.replace(/^Kantor Wilayah Ditjenpas /, "")}</div></td>}
                    <td className="px-3 py-3">{r.lokasi_nama ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmtTanggal(r.tanggal_mulai)}<div className="text-xs text-muted-foreground">{r.rencana_berakhir ? `s.d. ${fmtTanggal(r.rencana_berakhir)}` : "tanpa tanggal berakhir"}</div></td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.luas_lahan_ha ?? "-"}</td>
                    <td className="px-3 py-3"><Pill tone={TONE[st]}>{LABEL_STATUS_RENCANA[st]}</Pill></td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.jumlah_sesi}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        {r.surat_sesi_id ? <a href={`/dokumen/${r.surat_sesi_id}/surat_perintah`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline"><FileText className="h-3.5 w-3.5" aria-hidden />Surat perintah{(r.jumlah_surat ?? 0) > 1 ? ` (${r.jumlah_surat})` : ""}</a> : <span className="text-xs text-muted-foreground">Surat perintah belum ada</span>}
                        {r.rencana_sesi_id ? <a href={`/dokumen/${r.rencana_sesi_id}/rencana_pengamanan`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline"><FileText className="h-3.5 w-3.5" aria-hidden />Rencana pengamanan{(r.jumlah_rencana ?? 0) > 1 ? ` (${r.jumlah_rencana})` : ""}</a> : <span className="text-xs text-muted-foreground">Rencana pengamanan belum ada</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {jumlahHal > 1 && (
          <nav className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5" aria-label="Halaman">
            <Button asChild variant="outline" size="sm" className={hal <= 1 ? "pointer-events-none opacity-50" : ""}><Link href={param({ hal: String(hal - 1) })} aria-disabled={hal <= 1}>Sebelumnya</Link></Button>
            <span className="text-sm text-muted-foreground">Halaman {Math.min(hal, jumlahHal)} dari {jumlahHal}</span>
            <Button asChild variant="outline" size="sm" className={hal >= jumlahHal ? "pointer-events-none opacity-50" : ""}><Link href={param({ hal: String(hal + 1) })} aria-disabled={hal >= jumlahHal}>Berikutnya</Link></Button>
          </nav>
        )}
      </Card>
    </div>
  );
}
