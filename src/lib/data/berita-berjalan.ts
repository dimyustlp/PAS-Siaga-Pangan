import type { createClient } from "@/lib/supabase/server";
import type { ButirBerita } from "@/components/shared/berita-berjalan";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const fmtTgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const tgl = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : fmtTgl.format(d);
};

/** Berita internal yang sudah diterbitkan + berita luar (diperbarui otomatis tiap jam), terbaru di depan. */
export async function ambilBeritaBerjalan(supabase: Supabase, batas = 24): Promise<ButirBerita[]> {
  const [dalam, luar] = await Promise.all([
    supabase.from("berita_pangan").select("id,judul,tanggal,kode_upt").eq("diterbitkan", true).order("tanggal", { ascending: false }).limit(8),
    supabase.from("berita_luar").select("id,judul,sumber,url,terbit_at").order("terbit_at", { ascending: false, nullsFirst: false }).limit(batas),
  ]);
  const a: (ButirBerita & { t: string })[] = (dalam.data ?? []).map((b) => ({
    kunci: `d${b.id}`,
    judul: b.judul,
    sumber: "PAS-SIAGA",
    tanggal: tgl(b.tanggal),
    href: "/berita",
    luar: false,
    t: b.tanggal,
  }));
  const b: (ButirBerita & { t: string })[] = (luar.data ?? []).map((x) => ({
    kunci: `l${x.id}`,
    judul: x.judul,
    sumber: x.sumber,
    tanggal: x.terbit_at ? tgl(x.terbit_at) : null,
    href: x.url,
    luar: true,
    t: x.terbit_at ?? "",
  }));
  return [...a, ...b]
    .sort((p, q) => q.t.localeCompare(p.t))
    .slice(0, batas)
    .map(({ t: _t, ...r }) => r);
}
