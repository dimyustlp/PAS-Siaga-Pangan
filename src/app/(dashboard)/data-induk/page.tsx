import Link from "next/link";
import { ClipboardCheck, Database, MapPin, Package, UserCheck, Users } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { FormImporWb, FormLokasi } from "@/components/shared/forms-operator";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import {
  catatHabituasi, hapusAnggotaKelompok, hapusInduk, simpanInventaris, simpanKelompok, simpanKondisiAwal,
  simpanPetugas, tambahAnggotaKelompok, ubahKondisiInventaris,
} from "@/lib/actions/data-induk";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { fmtTanggal, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Data induk" };
export const dynamic = "force-dynamic";

const TAB = [
  ["lokasi", "Lokasi", MapPin],
  ["kelompok", "Kelompok kerja", Users],
  ["petugas", "Petugas", UserCheck],
  ["inventaris", "Alat dan sarana", Package],
  ["wb", "Warga binaan", Database],
  ["awal", "Kondisi awal", ClipboardCheck],
] as const;
type KodeTab = (typeof TAB)[number][0];

type Q = { tab?: string; kanwil?: string; upt?: string };

const NADA_KONDISI = { Baik: "hijau", "Rusak ringan": "kuning", "Rusak berat": "merah", Hilang: "merah" } as const;

export default async function DataIndukPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const tab: KodeTab = TAB.some((t) => t[0] === q.tab) ? (q.tab as KodeTab) : "lokasi";
  const supabase = await createClient();
  const user = await requireUser();
  const cak = await ambilCakupan(supabase, user, q);
  const upt = cak.uptDipilih;
  const bisa = cak.bisaKelola && Boolean(upt);

  const hrefTab = (t: string) => {
    const sp = new URLSearchParams({ tab: t });
    if (cak.kanwilDipilih && !cak.terkunci) sp.set("kanwil", cak.kanwilDipilih);
    if (upt && !cak.terkunci) sp.set("upt", upt);
    return `/data-induk?${sp.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Data induk"
        description="Lokasi, kelompok kerja, petugas, alat dan sarana, warga binaan, serta kondisi awal setiap UPT. Isian ini dipakai oleh kegiatan, peta, dan evaluasi."
      />

      {!cak.terkunci && (
        <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={upt} jaga={{ tab }} bolehSemua={false} />
      )}

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1" aria-label="Bagian data induk">
        {TAB.map(([k, label, Ikon]) => (
          <Link
            key={k}
            href={hrefTab(k)}
            aria-current={tab === k ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Ikon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      {!upt ? (
        <Alert tone="info">Pilih Kanwil dan UPT di atas untuk melihat dan mengisi data induknya.</Alert>
      ) : tab === "lokasi" ? (
        <TabLokasi supabase={supabase} upt={upt} bisa={bisa} />
      ) : tab === "kelompok" ? (
        <TabKelompok supabase={supabase} upt={upt} bisa={bisa} />
      ) : tab === "petugas" ? (
        <TabPetugas supabase={supabase} upt={upt} bisa={bisa} />
      ) : tab === "inventaris" ? (
        <TabInventaris supabase={supabase} upt={upt} bisa={bisa} />
      ) : tab === "wb" ? (
        <TabWb supabase={supabase} upt={upt} bisa={bisa} />
      ) : (
        <TabAwal supabase={supabase} upt={upt} bisa={bisa} />
      )}
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof createClient>>;
type Props = { supabase: Sb; upt: string; bisa: boolean };

function Kosong({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</p>;
}

// ---------------------------------------------------------------- Lokasi
async function TabLokasi({ supabase, upt, bisa }: Props) {
  const { data } = await supabase.from("master_locations").select("*").eq("kode_upt", upt).order("nama").limit(500);
  const daftar = data ?? [];
  return (
    <div className="space-y-6">
      {bisa && <Card><CardHeader><CardTitle>Tambah lokasi</CardTitle></CardHeader><CardContent><FormLokasi kodeUpt={upt} /></CardContent></Card>}
      <Card>
        <CardHeader><CardTitle>Lokasi terdaftar</CardTitle><CardDescription>{daftar.length} lokasi.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {daftar.length === 0 ? <Kosong>Belum ada lokasi.</Kosong> : (
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="py-2 pr-3">Lokasi</th><th className="py-2 pr-3">Lahan</th><th className="py-2 pr-3">Komoditas</th><th className="py-2 pr-3 text-right">Luas</th><th className="py-2 pr-3 text-right">Daya tampung</th><th className="py-2">Penanggung jawab</th></tr>
              </thead>
              <tbody className="divide-y">
                {daftar.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="py-2.5 pr-3"><span className="font-medium">{l.nama}</span>{l.kode ? <span className="ml-2 font-mono text-xs text-muted-foreground">{l.kode}</span> : null}
                      <span className="block text-xs text-muted-foreground">{l.posisi}{l.jarak_km != null ? ` · ${l.jarak_km} km dari UPT` : ""}{l.aktif ? "" : " · nonaktif"}</span></td>
                    <td className="py-2.5 pr-3">{l.jenis_lahan ?? "-"}{l.status_lahan ? <span className="block text-xs text-muted-foreground">{l.status_lahan}</span> : null}</td>
                    <td className="py-2.5 pr-3">{l.komoditas_utama ?? "-"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{l.luas_ha != null ? `${l.luas_ha} ha` : "-"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{l.daya_tampung_wbp ?? "-"}</td>
                    <td className="py-2.5">{l.pj_lokasi ?? "-"}</td>
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

// ---------------------------------------------------------------- Kelompok kerja
async function TabKelompok({ supabase, upt, bisa }: Props) {
  const [kel, lok] = await Promise.all([
    supabase.from("kelompok_kerja").select("*").eq("kode_upt", upt).order("nama").limit(200),
    supabase.from("master_locations").select("id,nama").eq("kode_upt", upt).order("nama").limit(500),
  ]);
  const daftar = kel.data ?? [];
  const ids = daftar.map((k) => k.id);
  const anggota = ids.length
    ? (await supabase.from("kelompok_kerja_anggota").select("kelompok_id,inmate_id,master_inmates(nama,nomor_registrasi)").in("kelompok_id", ids).limit(5000)).data ?? []
    : [];
  const lokasi = lok.data ?? [];
  const namaLokasi = (id: string | null) => lokasi.find((l) => l.id === id)?.nama;

  return (
    <div className="space-y-6">
      {bisa && (
        <Card>
          <CardHeader><CardTitle>Tambah kelompok kerja</CardTitle><CardDescription>Kelompok WB yang bekerja bersama di satu jenis kegiatan atau lokasi.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={simpanKelompok} submit="Simpan kelompok" fields={{ kode_upt: { v: upt }, nama: { s: "k-nama" }, jenis_kegiatan: { s: "k-jenis" }, lokasi_id: { s: "k-lokasi" }, pembimbing: { s: "k-pembimbing" }, keterangan: { s: "k-ket" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama kelompok" htmlFor="k-nama"><Input id="k-nama" name="k-nama" required maxLength={120} /></Field>
                <Field label="Jenis kegiatan" htmlFor="k-jenis">
                  <Select id="k-jenis" name="k-jenis" defaultValue=""><option value="">Belum ditentukan</option><option>Pertanian</option><option>Peternakan</option><option>Perikanan</option></Select>
                </Field>
                <Field label="Lokasi kerja" htmlFor="k-lokasi">
                  <Select id="k-lokasi" name="k-lokasi" defaultValue=""><option value="">Belum ditentukan</option>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}</Select>
                </Field>
                <Field label="Pembimbing kerja (Bimker)" htmlFor="k-pembimbing"><Input id="k-pembimbing" name="k-pembimbing" maxLength={150} /></Field>
                <Field label="Keterangan" htmlFor="k-ket" className="sm:col-span-2"><Input id="k-ket" name="k-ket" maxLength={500} /></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
      {daftar.length === 0 ? <Kosong>Belum ada kelompok kerja.</Kosong> : daftar.map((k) => {
        const isi = anggota.filter((a) => a.kelompok_id === k.id);
        return (
          <Card key={k.id}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-5">
                <span className="min-w-0">
                  <span className="font-semibold">{k.nama}</span>
                  <span className="block text-xs text-muted-foreground">{[k.jenis_kegiatan, namaLokasi(k.lokasi_id), k.pembimbing ? `Bimker ${k.pembimbing}` : null].filter(Boolean).join(" · ") || "Belum ada rincian"}</span>
                </span>
                <Pill tone="biru">{isi.length} anggota</Pill>
              </summary>
              <CardContent className="space-y-4">
                {k.keterangan && <p className="text-sm text-muted-foreground">{k.keterangan}</p>}
                {isi.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada anggota.</p> : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {isi.map((a) => (
                      <li key={a.inmate_id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
                        <span className="min-w-0 truncate">{a.master_inmates?.nama}<span className="ml-2 font-mono text-xs text-muted-foreground">{a.master_inmates?.nomor_registrasi}</span></span>
                        {bisa && <ActionButton action={hapusAnggotaKelompok} input={{ kelompok_id: k.id, inmate_id: a.inmate_id }} label="Keluarkan" confirm="Keluarkan WB ini dari kelompok?" />}
                      </li>
                    ))}
                  </ul>
                )}
                {bisa && (
                  <ActionForm action={tambahAnggotaKelompok} submit="Tambah anggota" success="Anggota ditambahkan." fields={{ kelompok_id: { v: k.id }, teks: { s: `a-${k.id}` } }}>
                    <Field label="Nomor registrasi yang ditambahkan" htmlFor={`a-${k.id}`} hint="Tempel satu atau beberapa nomor registrasi, dipisah baris, koma, atau spasi. WB harus sudah terdaftar di UPT ini.">
                      <Textarea id={`a-${k.id}`} name={`a-${k.id}`} rows={2} required />
                    </Field>
                  </ActionForm>
                )}
                {bisa && <ActionButton action={hapusInduk} input={{ tabel: "kelompok_kerja", id: k.id }} label="Hapus kelompok" variant="destructive" confirm="Hapus kelompok ini beserta daftar anggotanya?" />}
              </CardContent>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Petugas
async function TabPetugas({ supabase, upt, bisa }: Props) {
  const { data } = await supabase.from("petugas_upt").select("*").eq("kode_upt", upt).order("nama").limit(500);
  const daftar = data ?? [];
  const sudah = daftar.filter((p) => p.tanggal_habituasi).length;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Ringkasan petugas">
        <StatCard icon={Users} nada="biru" nilai={daftar.length} label="petugas terdaftar" />
        <StatCard icon={UserCheck} nada="hijau" nilai={sudah} label="sudah habituasi" />
        <StatCard icon={ClipboardCheck} nada={daftar.length - sudah > 0 ? "kuning" : "hijau"} nilai={daftar.length - sudah} label="belum habituasi" />
      </section>
      {bisa && (
        <Card>
          <CardHeader><CardTitle>Tambah petugas</CardTitle><CardDescription>Habituasi adalah pembiasaan petugas dengan alur, catatan, dan SOP aplikasi sebelum bertugas.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={simpanPetugas} submit="Simpan petugas" fields={{ kode_upt: { v: upt }, nama: { s: "p-nama" }, nip: { s: "p-nip" }, jabatan: { s: "p-jabatan" }, regu: { s: "p-regu" }, tanggal_habituasi: { s: "p-tgl" }, materi_habituasi: { s: "p-materi" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama" htmlFor="p-nama"><Input id="p-nama" name="p-nama" required maxLength={150} /></Field>
                <Field label="NIP" htmlFor="p-nip"><Input id="p-nip" name="p-nip" inputMode="numeric" maxLength={24} /></Field>
                <Field label="Jabatan" htmlFor="p-jabatan"><Input id="p-jabatan" name="p-jabatan" maxLength={120} /></Field>
                <Field label="Regu" htmlFor="p-regu"><Input id="p-regu" name="p-regu" maxLength={60} /></Field>
                <Field label="Tanggal habituasi" htmlFor="p-tgl" hint="Kosongkan bila belum."><Input id="p-tgl" name="p-tgl" type="date" /></Field>
                <Field label="Materi habituasi" htmlFor="p-materi"><Input id="p-materi" name="p-materi" maxLength={300} /></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Daftar petugas</CardTitle></CardHeader>
        <CardContent>
          {daftar.length === 0 ? <Kosong>Belum ada petugas.</Kosong> : (
            <ul className="divide-y">
              {daftar.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">{p.nama}{p.nip ? <span className="ml-2 font-mono text-xs text-muted-foreground">{p.nip}</span> : null}</p>
                    <p className="text-xs text-muted-foreground">{[p.jabatan, p.regu ? `Regu ${p.regu}` : null].filter(Boolean).join(" · ") || "Jabatan belum diisi"}</p>
                    {p.tanggal_habituasi && <p className="text-xs text-muted-foreground">Habituasi {fmtTanggal(p.tanggal_habituasi)}{p.materi_habituasi ? `: ${p.materi_habituasi}` : ""}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={p.tanggal_habituasi ? "hijau" : "kuning"}>{p.tanggal_habituasi ? "Sudah habituasi" : "Belum habituasi"}</Pill>
                    {bisa && !p.tanggal_habituasi && (
                      <ActionForm action={catatHabituasi} submit="Catat habituasi" className="flex flex-wrap items-end gap-2 space-y-0" fields={{ id: { v: p.id }, tanggal_habituasi: { s: `h-${p.id}` }, materi_habituasi: { s: `m-${p.id}` } }}>
                        <Input name={`h-${p.id}`} type="date" required defaultValue={hariIniWib()} aria-label={`Tanggal habituasi ${p.nama}`} className="w-40" />
                        <Input name={`m-${p.id}`} placeholder="Materi" maxLength={300} aria-label={`Materi habituasi ${p.nama}`} className="w-40" />
                      </ActionForm>
                    )}
                    {bisa && <ActionButton action={hapusInduk} input={{ tabel: "petugas_upt", id: p.id }} label="Hapus" confirm={`Hapus ${p.nama} dari daftar petugas?`} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Alat kerja dan sarana
async function TabInventaris({ supabase, upt, bisa }: Props) {
  const { data } = await supabase.from("inventaris_upt").select("*").eq("kode_upt", upt).order("golongan").order("nama").limit(1000);
  const daftar = data ?? [];
  const unit = daftar.reduce((a, b) => a + b.jumlah, 0);
  const bermasalah = daftar.filter((b) => b.kondisi !== "Baik").reduce((a, b) => a + b.jumlah, 0);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Ringkasan inventaris">
        <StatCard icon={Package} nada="biru" nilai={daftar.length} label="jenis barang" />
        <StatCard icon={Database} nada="teal" nilai={unit} label="unit seluruhnya" />
        <StatCard icon={ClipboardCheck} nada={bermasalah > 0 ? "merah" : "hijau"} nilai={bermasalah} label="unit rusak atau hilang" />
      </section>
      {bisa && (
        <Card>
          <CardHeader><CardTitle>Tambah alat atau sarana</CardTitle><CardDescription>Alat kerja yang dibawa WB (cangkul, sabit, dan sejenisnya) dan sarana pendukung (kendaraan, radio, gelang).</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={simpanInventaris} submit="Simpan barang" fields={{ kode_upt: { v: upt }, golongan: { s: "i-gol" }, kategori: { s: "i-kat" }, nama: { s: "i-nama" }, kode_inventaris: { s: "i-kode" }, jumlah: { n: "i-jml" }, kondisi: { s: "i-kond" }, lokasi_simpan: { s: "i-simpan" }, keterangan: { s: "i-ket" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Golongan" htmlFor="i-gol"><Select id="i-gol" name="i-gol" defaultValue="Alat kerja"><option>Alat kerja</option><option>Sarana dan prasarana</option></Select></Field>
                <Field label="Kategori" htmlFor="i-kat" hint="Mis. alat tajam, kendaraan, komunikasi."><Input id="i-kat" name="i-kat" maxLength={80} /></Field>
                <Field label="Nama barang" htmlFor="i-nama"><Input id="i-nama" name="i-nama" required maxLength={150} /></Field>
                <Field label="Kode inventaris" htmlFor="i-kode"><Input id="i-kode" name="i-kode" maxLength={60} /></Field>
                <Field label="Jumlah" htmlFor="i-jml"><Input id="i-jml" name="i-jml" type="number" min={0} required defaultValue={1} /></Field>
                <Field label="Kondisi" htmlFor="i-kond"><Select id="i-kond" name="i-kond" defaultValue="Baik"><option>Baik</option><option>Rusak ringan</option><option>Rusak berat</option><option>Hilang</option></Select></Field>
                <Field label="Tempat penyimpanan" htmlFor="i-simpan"><Input id="i-simpan" name="i-simpan" maxLength={150} /></Field>
                <Field label="Keterangan" htmlFor="i-ket"><Input id="i-ket" name="i-ket" maxLength={500} /></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
      {(["Alat kerja", "Sarana dan prasarana"] as const).map((g) => {
        const isi = daftar.filter((b) => b.golongan === g);
        return (
          <Card key={g}>
            <CardHeader><CardTitle>{g}</CardTitle><CardDescription>{isi.length} jenis, {isi.reduce((a, b) => a + b.jumlah, 0)} unit.</CardDescription></CardHeader>
            <CardContent>
              {isi.length === 0 ? <Kosong>Belum ada data.</Kosong> : (
                <ul className="divide-y">
                  {isi.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-medium">{b.nama}{b.kode_inventaris ? <span className="ml-2 font-mono text-xs text-muted-foreground">{b.kode_inventaris}</span> : null}</p>
                        <p className="text-xs text-muted-foreground">{[b.kategori, b.lokasi_simpan ? `Disimpan di ${b.lokasi_simpan}` : null].filter(Boolean).join(" · ") || "Tanpa rincian"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={NADA_KONDISI[b.kondisi as keyof typeof NADA_KONDISI] ?? "netral"}>{b.kondisi}</Pill>
                        {bisa ? (
                          <ActionForm action={ubahKondisiInventaris} submit="Simpan" resetOnSuccess={false} className="flex flex-wrap items-end gap-2 space-y-0" fields={{ id: { v: b.id }, jumlah: { n: `j-${b.id}` }, kondisi: { s: `k-${b.id}` } }}>
                            <Input name={`j-${b.id}`} type="number" min={0} required defaultValue={b.jumlah} aria-label={`Jumlah ${b.nama}`} className="w-24" />
                            <Select name={`k-${b.id}`} defaultValue={b.kondisi} aria-label={`Kondisi ${b.nama}`} className="w-36"><option>Baik</option><option>Rusak ringan</option><option>Rusak berat</option><option>Hilang</option></Select>
                          </ActionForm>
                        ) : <span className="tabular-nums">{b.jumlah} unit</span>}
                        {bisa && <ActionButton action={hapusInduk} input={{ tabel: "inventaris_upt", id: b.id }} label="Hapus" confirm={`Hapus ${b.nama} dari inventaris?`} />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Warga binaan
async function TabWb({ supabase, upt, bisa }: Props) {
  const { count } = await supabase.from("master_inmates").select("id", { count: "exact", head: true }).eq("kode_upt", upt).eq("aktif", true);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Warga binaan terdaftar</CardTitle><CardDescription>Hanya Administrator, Operator, dan Kepala Pengamanan UPT yang dapat melihat daftar ini.</CardDescription></CardHeader>
        <CardContent><p className="text-4xl font-semibold tabular-nums">{count ?? 0}</p><p className="text-sm text-muted-foreground">warga binaan aktif</p></CardContent>
      </Card>
      {bisa && <Card><CardHeader><CardTitle>Impor warga binaan</CardTitle></CardHeader><CardContent><FormImporWb kodeUpt={upt} /></CardContent></Card>}
    </div>
  );
}

// ---------------------------------------------------------------- Kondisi awal
async function TabAwal({ supabase, upt, bisa }: Props) {
  const { data: a } = await supabase.from("kondisi_awal").select("*").eq("kode_upt", upt).maybeSingle();
  return (
    <div className="space-y-6">
      <Alert tone="info">
        Kondisi awal adalah keadaan sebelum PAS-SIAGA Pangan dipakai, diisi dari catatan manual UPT. Nilainya dibandingkan dengan hasil sistem pada halaman Evaluasi.
      </Alert>
      <Card>
        <CardHeader><CardTitle>Kondisi awal UPT</CardTitle><CardDescription>{a ? `Terakhir diperbarui ${fmtTanggal(a.updated_at)}.` : "Belum diisi."} Kosongkan isian yang datanya tidak ada.</CardDescription></CardHeader>
        <CardContent>
          {bisa ? (
            <ActionForm
              action={simpanKondisiAwal}
              submit="Simpan kondisi awal"
              resetOnSuccess={false}
              fields={{
                kode_upt: { v: upt }, periode_dari: { s: "periode_dari" }, periode_sampai: { s: "periode_sampai" },
                kegiatan_per_bulan: { n: "kegiatan_per_bulan" }, pct_catatan_lengkap: { n: "pct_catatan_lengkap" },
                pct_serah_terima_cocok: { n: "pct_serah_terima_cocok" }, pct_temuan_tindak_lanjut: { n: "pct_temuan_tindak_lanjut" },
                pct_tindak_lanjut_selesai: { n: "pct_tindak_lanjut_selesai" }, menit_pelaporan_kejadian: { n: "menit_pelaporan_kejadian" },
                gangguan_per_bulan: { n: "gangguan_per_bulan" }, sumber_data: { s: "sumber_data" }, catatan: { s: "catatan" },
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Periode pengamatan: dari" htmlFor="periode_dari"><Input id="periode_dari" name="periode_dari" type="date" defaultValue={a?.periode_dari ?? ""} /></Field>
                <Field label="Periode pengamatan: sampai" htmlFor="periode_sampai"><Input id="periode_sampai" name="periode_sampai" type="date" defaultValue={a?.periode_sampai ?? ""} /></Field>
                <Field label="Kegiatan per bulan" htmlFor="kegiatan_per_bulan" hint="Rata-rata kegiatan kerja luar yang berjalan setiap bulan."><Input id="kegiatan_per_bulan" name="kegiatan_per_bulan" inputMode="decimal" defaultValue={a?.kegiatan_per_bulan ?? ""} /></Field>
                <Field label="Gangguan per bulan" htmlFor="gangguan_per_bulan"><Input id="gangguan_per_bulan" name="gangguan_per_bulan" inputMode="decimal" defaultValue={a?.gangguan_per_bulan ?? ""} /></Field>
                <Field label="Catatan lengkap (%)" htmlFor="pct_catatan_lengkap" hint="Kegiatan yang dokumen dan catatannya lengkap (setara indikator E3)."><Input id="pct_catatan_lengkap" name="pct_catatan_lengkap" inputMode="decimal" defaultValue={a?.pct_catatan_lengkap ?? ""} /></Field>
                <Field label="Catatan keluar dan kembali cocok (%)" htmlFor="pct_serah_terima_cocok" hint="Setara indikator E2."><Input id="pct_serah_terima_cocok" name="pct_serah_terima_cocok" inputMode="decimal" defaultValue={a?.pct_serah_terima_cocok ?? ""} /></Field>
                <Field label="Temuan yang punya tindak lanjut (%)" htmlFor="pct_temuan_tindak_lanjut" hint="Setara indikator E5."><Input id="pct_temuan_tindak_lanjut" name="pct_temuan_tindak_lanjut" inputMode="decimal" defaultValue={a?.pct_temuan_tindak_lanjut ?? ""} /></Field>
                <Field label="Tindak lanjut yang selesai (%)" htmlFor="pct_tindak_lanjut_selesai" hint="Setara indikator E6."><Input id="pct_tindak_lanjut_selesai" name="pct_tindak_lanjut_selesai" inputMode="decimal" defaultValue={a?.pct_tindak_lanjut_selesai ?? ""} /></Field>
                <Field label="Waktu pelaporan kejadian (menit)" htmlFor="menit_pelaporan_kejadian" hint="Rata-rata selang dari kejadian sampai sampai ke pimpinan."><Input id="menit_pelaporan_kejadian" name="menit_pelaporan_kejadian" inputMode="decimal" defaultValue={a?.menit_pelaporan_kejadian ?? ""} /></Field>
                <Field label="Sumber data" htmlFor="sumber_data"><Input id="sumber_data" name="sumber_data" maxLength={300} defaultValue={a?.sumber_data ?? ""} placeholder="Mis. buku register dan laporan bulanan" /></Field>
                <Field label="Catatan" htmlFor="catatan" className="sm:col-span-2"><Textarea id="catatan" name="catatan" rows={2} maxLength={1000} defaultValue={a?.catatan ?? ""} /></Field>
              </div>
            </ActionForm>
          ) : a ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {([["Kegiatan per bulan", a.kegiatan_per_bulan], ["Gangguan per bulan", a.gangguan_per_bulan], ["Catatan lengkap (%)", a.pct_catatan_lengkap], ["Keluar dan kembali cocok (%)", a.pct_serah_terima_cocok], ["Temuan bertindak lanjut (%)", a.pct_temuan_tindak_lanjut], ["Tindak lanjut selesai (%)", a.pct_tindak_lanjut_selesai], ["Waktu pelaporan (menit)", a.menit_pelaporan_kejadian]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="tabular-nums">{v ?? "-"}</dd></div>
              ))}
            </dl>
          ) : <Kosong>Belum diisi.</Kosong>}
        </CardContent>
      </Card>
    </div>
  );
}
