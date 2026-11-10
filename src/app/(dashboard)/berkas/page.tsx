import Link from "next/link";
import { CheckCircle2, ChevronRight, ExternalLink, FileText, FolderOpen, Link2, MinusCircle } from "lucide-react";
import { ActionButton } from "@/components/shared/action-form";
import { FormBerkas } from "@/components/shared/form-berkas";
import { SaringBerkas } from "@/components/shared/saring-berkas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { deleteBerkas } from "@/lib/actions/berkas";
import { requireUser } from "@/lib/auth";
import { KATEGORI_BERKAS, KATEGORI_POKOK, fmtUkuran, ringkasPerKanwil, ringkasPerUpt } from "@/lib/domain/berkas";
import { fmtTanggalPendek, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Berkas" };
export const dynamic = "force-dynamic";

type Q = { kanwil?: string; upt?: string; kategori?: string; q?: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const BATAS_DAFTAR = 1000;
const TANPA = "tanpa";

/** Mengambil kolom ringkas semua berkas yang terlihat, per 1.000 baris, agar hitungan tidak terpotong batas bawaan. */
async function ambilRingkasan(supabase: Supabase) {
  const baris: { kanwil_id: string | null; kode_upt: string | null; kategori: string | null; tanggal: string | null }[] = [];
  for (let dari = 0; dari < 20000; dari += 1000) {
    const { data, error } = await supabase.from("v_berkas").select("kanwil_id,kode_upt,kategori,tanggal").order("id").range(dari, dari + 999);
    if (error) return { baris, galat: true };
    baris.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return { baris, galat: false };
}

export default async function BerkasPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const supabase = await createClient();
  const [user, kanwilRes, uptRes, ringkasanRes] = await Promise.all([
    requireUser(),
    supabase.from("master_kanwil").select("*").order("nama"),
    supabase.from("master_upt").select("*").order("nama"),
    ambilRingkasan(supabase),
  ]);
  const semuaKanwil = kanwilRes.data ?? [];
  const semuaUpt = uptRes.data ?? [];

  // UPT yang masuk cakupan pengguna (data berkas sendiri sudah dibatasi RLS).
  const luas = user.role === "administrator" || user.role === "pemantau_pusat";
  const uptCakupan = semuaUpt.filter((u) =>
    luas ? true : user.role === "pemantau_kanwil" ? u.kanwil_id === user.kanwilId : u.kode === user.kodeUpt
  );
  const bisaUnggah = ["administrator", "operator", "kepala_pengamanan"].includes(user.role);
  const bisaHapus = user.role === "administrator" || user.role === "operator";
  const uptUnggah = user.role === "administrator" ? semuaUpt : uptCakupan;

  const kanwilCakupan = semuaKanwil.filter((k) => uptCakupan.some((u) => u.kanwil_id === k.id));
  const adaTanpaKanwil = uptCakupan.some((u) => !u.kanwil_id);
  const kanwilSaya = semuaKanwil.find((k) => k.id === (user.kanwilId ?? semuaUpt.find((u) => u.kode === user.kodeUpt)?.kanwil_id));

  // Pilihan aktif. UPT yang dipilih menentukan Kanwilnya; pengguna dengan satu Kanwil langsung masuk ke Kanwil itu.
  const uptDipilih = uptCakupan.find((u) => u.kode === q.upt) ?? null;
  const kanwilPilihan =
    q.kanwil === TANPA
      ? TANPA
      : kanwilCakupan.find((k) => k.id === q.kanwil)?.id ??
        uptDipilih?.kanwil_id ??
        (kanwilCakupan.length === 1 && !adaTanpaKanwil ? kanwilCakupan[0].id : "");
  const kanwilDipilih = kanwilCakupan.find((k) => k.id === kanwilPilihan) ?? null;
  const kata = (q.q ?? "").trim().toLowerCase();
  const kategoriDipilih = (KATEGORI_BERKAS as readonly string[]).includes(q.kategori ?? "") ? (q.kategori as string) : "";

  const uptRuang = uptCakupan.filter((u) =>
    kanwilPilihan === TANPA ? !u.kanwil_id : kanwilPilihan ? u.kanwil_id === kanwilPilihan : true
  );
  const uptTerlihat = uptDipilih ? [uptDipilih] : uptRuang;
  const fokus = Boolean(kanwilPilihan || uptDipilih);
  const mencari = Boolean(kategoriDipilih || kata);

  // Ringkasan hitungan memakai seluruh berkas yang terlihat.
  const ringkas = ringkasPerUpt(uptCakupan, ringkasanRes.baris);
  const perKanwil = ringkasPerKanwil(kanwilCakupan, uptCakupan, ringkas);

  // Daftar berkas hanya dimuat bila ada pilihan atau pencarian; tampilan awal cukup ringkasan dan beberapa yang terbaru.
  let daftarQuery = supabase.from("v_berkas").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false });
  if (kanwilPilihan === TANPA) daftarQuery = daftarQuery.is("kanwil_id", null);
  else if (kanwilPilihan) daftarQuery = daftarQuery.eq("kanwil_id", kanwilPilihan);
  if (uptDipilih) daftarQuery = daftarQuery.eq("kode_upt", uptDipilih.kode);
  if (kategoriDipilih) daftarQuery = daftarQuery.eq("kategori", kategoriDipilih);
  const bukaDaftar = fokus || mencari;
  const daftarRes = await daftarQuery.limit(bukaDaftar ? BATAS_DAFTAR : 8);
  const berkasSemua = daftarRes.data ?? [];
  const berkas = berkasSemua.filter(
    (b) => !kata || `${b.judul} ${b.keterangan ?? ""} ${b.nama_berkas ?? ""} ${b.upt_nama ?? ""}`.toLowerCase().includes(kata)
  );

  // Pengelompokan daftar: per UPT bila Kanwil dipilih, per Kanwil bila sedang mencari di seluruh cakupan.
  const perUptKelompok = fokus;
  const kelompok = (() => {
    const peta = new Map<string, { kunci: string; nama: string; isi: typeof berkas }>();
    for (const b of berkas) {
      const kunci = perUptKelompok ? (b.kode_upt ?? "-") : (b.kanwil_id ?? TANPA);
      const nama = perUptKelompok ? (b.upt_nama ?? "UPT tidak dikenal") : (b.kanwil_nama ?? "Tanpa Kanwil");
      const g = peta.get(kunci) ?? { kunci, nama, isi: [] };
      g.isi.push(b);
      peta.set(kunci, g);
    }
    return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  })();
  const bukaSemua = Boolean(uptDipilih) || kelompok.length <= 2;

  const galat = ringkasanRes.galat || daftarRes.error;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Berkas"
        description="Penampungan berkas kegiatan per Kanwil dan UPT. Pilih Kanwil, lalu UPT, agar daftar tidak memanjang."
        actions={bisaUnggah ? <Button asChild size="sm"><a href="#unggah">Tambah berkas</a></Button> : undefined}
      />

      {galat && <Alert tone="bahaya">Berkas belum bisa dibaca sepenuhnya. Muat ulang halaman.</Alert>}

      <SaringBerkas
        kanwil={kanwilCakupan.map((k) => ({ id: k.id, nama: k.nama }))}
        upt={uptCakupan.map((u) => ({ kode: u.kode, nama: u.nama, kanwil_id: u.kanwil_id }))}
        kategori={KATEGORI_BERKAS}
        nilai={{ kanwil: kanwilPilihan, upt: uptDipilih?.kode ?? "", kategori: kategoriDipilih, q: q.q ?? "" }}
        adaTanpaKanwil={adaTanpaKanwil}
      />

      {!fokus && kanwilSaya?.tautan_form && (
        <Card className="border-brand/40 bg-brand-soft/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">Penampungan lewat Google Form · {kanwilSaya.nama}</p>
              <p className="text-sm text-muted-foreground">Berkas yang dikirim lewat Google Form tersimpan di Drive Kanwil. Daftarkan tautan foldernya di sini agar ikut terpantau.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><a href={kanwilSaya.tautan_form} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Buka Google Form</a></Button>
              {kanwilSaya.tautan_folder && <Button asChild size="sm" variant="outline"><a href={kanwilSaya.tautan_folder} target="_blank" rel="noopener noreferrer"><FolderOpen className="h-4 w-4" aria-hidden />Folder Drive</a></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {fokus ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>{uptDipilih ? uptDipilih.nama : kanwilDipilih?.nama ?? "Tanpa Kanwil"}</CardTitle>
                <CardDescription>
                  {uptDipilih
                    ? `${kanwilDipilih?.nama ?? "Tanpa Kanwil"} · kelengkapan berkas pokok`
                    : `${uptRuang.length} UPT · kelengkapan berkas pokok. Tanda kuning berarti belum ada berkas.`}
                </CardDescription>
              </div>
              {kanwilDipilih && (kanwilDipilih.tautan_form || kanwilDipilih.tautan_folder) && (
                <div className="flex flex-wrap gap-2">
                  {kanwilDipilih.tautan_form && <Button asChild size="sm" variant="outline"><a href={kanwilDipilih.tautan_form} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Google Form</a></Button>}
                  {kanwilDipilih.tautan_folder && <Button asChild size="sm" variant="outline"><a href={kanwilDipilih.tautan_folder} target="_blank" rel="noopener noreferrer"><FolderOpen className="h-4 w-4" aria-hidden />Folder Drive</a></Button>}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {uptTerlihat.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada UPT pada pilihan ini.</p>
            ) : (
              <div className="max-h-[26rem] overflow-auto rounded-lg border">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="sticky top-0 bg-secondary text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">UPT</th>
                      {KATEGORI_POKOK.map((k) => <th key={k} className="px-2 py-2 text-center">{k}</th>)}
                      <th className="px-2 py-2 text-right">Total</th>
                      <th className="px-3 py-2">Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {uptTerlihat.map((u) => {
                      const r = ringkas.get(u.kode)!;
                      const href = `/berkas?${new URLSearchParams({ ...(kanwilPilihan ? { kanwil: kanwilPilihan } : {}), upt: u.kode }).toString()}`;
                      return (
                        <tr key={u.kode} className={u.kode === uptDipilih?.kode ? "bg-brand-soft/40" : undefined}>
                          <td className="px-3 py-2 font-medium">
                            {uptDipilih ? u.nama : <Link href={href} scroll={false} className="text-brand hover:underline">{u.nama}</Link>}
                          </td>
                          {KATEGORI_POKOK.map((k) => {
                            const n = r.perKategori[k] ?? 0;
                            return (
                              <td key={k} className="px-2 py-2 text-center">
                                {n > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-status-hijau"><CheckCircle2 className="h-4 w-4" aria-hidden />{n}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[hsl(34_92%_30%)]"><MinusCircle className="h-4 w-4" aria-hidden /><span className="sr-only">belum ada</span>0</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-right tabular-nums">{r.total}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{r.terakhir ? fmtTanggalPendek(r.terakhir) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !mencari ? (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan per Kanwil</CardTitle>
            <CardDescription>
              {perKanwil.length > 1 ? "Pilih satu Kanwil untuk melihat UPT dan berkasnya. " : ""}
              UPT lengkap berarti sudah punya berkas di keempat kategori pokok: {KATEGORI_POKOK.join(", ")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {perKanwil.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada UPT pada cakupan Anda.</p>
            ) : (
              <div className="max-h-[28rem] overflow-auto rounded-lg border">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead className="sticky top-0 bg-secondary text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Kanwil</th>
                      <th className="px-2 py-2 text-right">UPT</th>
                      <th className="px-2 py-2 text-right">UPT lengkap</th>
                      <th className="px-2 py-2 text-right">Berkas</th>
                      <th className="px-3 py-2">Terakhir</th>
                      <th className="px-3 py-2"><span className="sr-only">Buka</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {perKanwil.map((k) => (
                      <tr key={k.id ?? TANPA} className="hover:bg-ink/[0.03]">
                        <td className="px-3 py-2 font-medium"><Link href={`/berkas?kanwil=${k.id ?? TANPA}`} scroll={false} className="hover:underline">{k.nama}</Link></td>
                        <td className="px-2 py-2 text-right tabular-nums">{k.jumlahUpt}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          <span className={k.uptLengkap === k.jumlahUpt ? "text-status-hijau" : k.uptLengkap === 0 ? "text-[hsl(34_92%_30%)]" : undefined}>{k.uptLengkap}/{k.jumlahUpt}</span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{k.total}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{k.terakhir ? fmtTanggalPendek(k.terakhir) : "-"}</td>
                        <td className="px-3 py-2 text-right"><Link href={`/berkas?kanwil=${k.id ?? TANPA}`} scroll={false} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Buka<ChevronRight className="h-3.5 w-3.5" aria-hidden /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3" aria-label={bukaDaftar ? "Daftar berkas" : "Berkas terbaru"}>
        <h2 className="text-sm font-semibold">
          {bukaDaftar ? `${berkas.length} berkas${berkas.length !== berkasSemua.length ? ` dari ${berkasSemua.length}` : ""}` : "Berkas terbaru"}
        </h2>
        {berkasSemua.length >= BATAS_DAFTAR && bukaDaftar && <Alert tone="waspada">Daftar dibatasi {BATAS_DAFTAR.toLocaleString("id-ID")} berkas terbaru. Persempit dengan memilih UPT atau kategori.</Alert>}
        {berkas.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada berkas pada pilihan ini.</p>}

        {bukaDaftar ? (
          kelompok.map((g) => (
            <details key={g.kunci} open={bukaSemua} className="group rounded-xl border border-border/70 bg-card shadow-soft">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><FolderOpen className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block font-bold">{g.nama}</span><span className="block text-xs text-muted-foreground">{g.isi.length} berkas</span></span>
              </summary>
              <div className="max-h-80 overflow-y-auto border-t">
                <ul className="divide-y">{g.isi.map((b) => <BarisBerkas key={b.id ?? ""} b={b} tampilUpt={!perUptKelompok} bisaHapus={bisaHapus} />)}</ul>
              </div>
            </details>
          ))
        ) : (
          berkas.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-card shadow-soft">
              <ul className="divide-y">{berkas.map((b) => <BarisBerkas key={b.id ?? ""} b={b} tampilUpt bisaHapus={bisaHapus} />)}</ul>
            </div>
          )
        )}
      </section>

      {bisaUnggah && (
        <Card id="unggah">
          <CardHeader><CardTitle>Tambah berkas</CardTitle><CardDescription>Unggah langsung, atau catat tautan folder Drive bila berkas masuk lewat Google Form.</CardDescription></CardHeader>
          <CardContent>
            <FormBerkas
              upt={uptUnggah.map((u) => ({ kode: u.kode, nama: u.nama, kanwil_id: u.kanwil_id }))}
              kanwil={semuaKanwil.filter((k) => uptUnggah.some((u) => u.kanwil_id === k.id)).map((k) => ({ id: k.id, nama: k.nama }))}
              awal={{ kanwil: kanwilPilihan === TANPA ? "" : kanwilPilihan, upt: uptDipilih?.kode ?? "" }}
              hariIni={hariIniWib()}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Baris = {
  id: string | null;
  judul: string | null;
  kategori: string | null;
  sumber: string | null;
  upt_nama: string | null;
  tanggal: string | null;
  ukuran_byte: number | null;
  pengunggah: string | null;
  keterangan: string | null;
};

function BarisBerkas({ b, tampilUpt, bisaHapus }: { b: Baris; tampilUpt: boolean; bisaHapus: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {b.sumber === "tautan" ? <Link2 className="h-4 w-4" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{b.judul}</p>
        <p className="text-xs text-muted-foreground">
          {tampilUpt && b.upt_nama ? `${b.upt_nama} · ` : ""}{b.tanggal ? fmtTanggalPendek(b.tanggal) : "-"} · {b.sumber === "tautan" ? "Tautan" : fmtUkuran(b.ukuran_byte)}{b.pengunggah ? ` · ${b.pengunggah}` : ""}
        </p>
        {b.keterangan && <p className="text-xs text-muted-foreground">{b.keterangan}</p>}
      </div>
      {b.kategori && <Pill tone="biru">{b.kategori}</Pill>}
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`/berkas/${b.id}/unduh`} target={b.sumber === "tautan" ? "_blank" : undefined} rel="noopener noreferrer">{b.sumber === "tautan" ? "Buka" : "Unduh"}</a>
        </Button>
        {bisaHapus && b.id && <ActionButton action={deleteBerkas} input={{ id: b.id }} label="Hapus" variant="destructive" confirm="Hapus berkas ini? Tindakan ini tidak bisa dibatalkan." />}
      </div>
    </li>
  );
}
