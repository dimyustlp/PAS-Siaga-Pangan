import Link from "next/link";
import { ActionButton } from "@/components/shared/action-form";
import { FormBerita } from "@/components/shared/form-berita";
import { PilihUpt } from "@/components/shared/pilih-upt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Pill } from "@/components/ui/form";
import { hapusBerita } from "@/lib/actions/pangan";
import { requireUser } from "@/lib/auth";
import { ambilCakupan } from "@/lib/data/cakupan";
import { fmtTanggal, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { KATEGORI_BERITA } from "@/lib/validations/induk";

export const metadata = { title: "Berita ketahanan pangan" };
export const dynamic = "force-dynamic";

const BATAS = 30;

export default async function BeritaPage({ searchParams }: { searchParams: Promise<{ kategori?: string; kanwil?: string; upt?: string }> }) {
  const q = await searchParams;
  const kategori = (KATEGORI_BERITA as readonly string[]).includes(q.kategori ?? "") ? (q.kategori as string) : "";
  const supabase = await createClient();
  const user = await requireUser();
  const cak = await ambilCakupan(supabase, user, q);
  const upt = cak.uptDipilih;

  let kueri = supabase.from("berita_pangan").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false }).limit(BATAS);
  if (kategori) kueri = kueri.eq("kategori", kategori);
  if (upt) kueri = kueri.eq("kode_upt", upt);
  else if (cak.kanwilDipilih) {
    const kode = cak.upt.filter((u) => u.kanwil_id === cak.kanwilDipilih).map((u) => u.kode);
    kueri = kueri.in("kode_upt", kode.length ? kode : ["-"]);
  }
  const { data } = await kueri;
  const daftar = data ?? [];

  const fotoPath = daftar.map((b) => b.foto_path).filter((x): x is string => !!x);
  const url = new Map<string, string>();
  if (fotoPath.length) {
    const { data: ttd } = await supabase.storage.from("pas-siaga-berita").createSignedUrls(fotoPath, 3600);
    for (const t of ttd ?? []) if (t.path && t.signedUrl) url.set(t.path, t.signedUrl);
  }
  const namaUpt = new Map(cak.upt.map((u) => [u.kode, u.nama]));
  const bisaTulis = cak.bisaKelola && Boolean(upt);

  const href = (k: string) => {
    const sp = new URLSearchParams();
    if (k) sp.set("kategori", k);
    if (cak.kanwilDipilih && !cak.terkunci) sp.set("kanwil", cak.kanwilDipilih);
    if (upt && !cak.terkunci) sp.set("upt", upt);
    return sp.size ? `/berita?${sp.toString()}` : "/berita";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Berita ketahanan pangan" description="Kabar panen, program, kunjungan, dan capaian dari UPT." />

      {!cak.terkunci && <PilihUpt kanwil={cak.kanwil} upt={cak.upt} kanwilDipilih={cak.kanwilDipilih} uptDipilih={upt} jaga={{ kategori }} />}

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1" aria-label="Kategori berita">
        {[["", "Semua"], ...KATEGORI_BERITA.map((k) => [k, k])].map(([k, label]) => (
          <Link key={k} href={href(k)} aria-current={kategori === k ? "page" : undefined} className={cn("shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors", kategori === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{label}</Link>
        ))}
      </nav>

      {bisaTulis && (
        <Card>
          <CardHeader><CardTitle>Tulis berita</CardTitle><CardDescription>Berita yang diterbitkan dapat dibaca semua pengguna aplikasi.</CardDescription></CardHeader>
          <CardContent><FormBerita kodeUpt={upt} hariIni={hariIniWib()} /></CardContent>
        </Card>
      )}

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada berita{kategori ? ` pada kategori ${kategori}` : ""}.</p>
      ) : (
        <div className="space-y-4">
          {daftar.map((b) => (
            <Card key={b.id}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-[12rem_1fr]">
                {b.foto_path && url.get(b.foto_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url.get(b.foto_path)} alt={`Foto: ${b.judul}`} className="h-40 w-full rounded-lg object-cover sm:h-full" loading="lazy" />
                ) : <div className="hidden sm:block" />}
                <article className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Pill tone="biru">{b.kategori}</Pill>
                    {!b.diterbitkan && <Pill tone="kuning">Draf</Pill>}
                    <span>{fmtTanggal(b.tanggal)}</span>
                    {b.kode_upt && <span>· {namaUpt.get(b.kode_upt) ?? b.kode_upt}</span>}
                  </div>
                  <h2 className="text-lg font-semibold leading-snug">{b.judul}</h2>
                  {b.ringkasan && <p className="text-sm font-medium text-muted-foreground">{b.ringkasan}</p>}
                  <p className="whitespace-pre-line text-sm leading-relaxed">{b.isi}</p>
                  {cak.bisaKelola && <div className="pt-1"><ActionButton action={hapusBerita} input={{ id: b.id }} label="Hapus berita" confirm="Hapus berita ini beserta fotonya? Tindakan ini tidak bisa dibatalkan." /></div>}
                </article>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {daftar.length >= BATAS && <p className="text-center text-xs text-muted-foreground">Menampilkan {BATAS} berita terbaru. Gunakan kategori atau UPT untuk mempersempit.</p>}
    </div>
  );
}
