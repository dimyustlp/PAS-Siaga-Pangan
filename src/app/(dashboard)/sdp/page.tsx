import Link from "next/link";
import { Coins, ExternalLink, Leaf, MapPinned, Ruler, Users } from "lucide-react";
import { FormSdp } from "@/components/shared/form-sdp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { KPI_SDP, SDP_URL, TABEL_SDP, barisKeTeks, bacaDataSdp } from "@/lib/domain/sdp";
import { fmtWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Data SDP ketahanan pangan" };
export const dynamic = "force-dynamic";

const IKON = [Leaf, Coins, Users, MapPinned, Ruler];

const sederhana = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export default async function SdpPage({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const q = await searchParams;
  const supabase = await createClient();
  const user = await requireUser();
  const { data: semua } = await supabase.from("sdp_ringkasan").select("tahun,data,tanggal_data,diubah_at").order("tahun", { ascending: false });
  const daftar = semua ?? [];
  const pilih = daftar.find((d) => String(d.tahun) === q.tahun) ?? daftar[0];
  const data = pilih ? bacaDataSdp(pilih.data) : null;
  const bisaUbah = user.role === "administrator" || user.role === "pemantau_pusat";

  // Sorot baris Kanwil milik pengguna (nama provinsi pada SDP dicocokkan dengan nama Kanwil).
  let kanwilSaya = "";
  if (user.kanwilId) {
    const { data: k } = await supabase.from("master_kanwil").select("nama").eq("id", user.kanwilId).maybeSingle();
    kanwilSaya = sederhana(k?.nama ?? "");
  }
  const milikSaya = (nama: string) => !!kanwilSaya && !!sederhana(nama) && kanwilSaya.endsWith(sederhana(nama));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Data SDP ketahanan pangan"
        description="Ringkasan dasbor Detail Ketahanan Pangan pada Sistem Database Pemasyarakatan (SDP) Ditjenpas: produksi, nilai, warga binaan terlibat, dan luas lahan per Kanwil."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={SDP_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Buka dasbor SDP
            </a>
          </Button>
        }
      />

      {daftar.length > 1 && (
        <nav aria-label="Pilih tahun" className="flex flex-wrap gap-2">
          {daftar.map((d) => (
            <Link key={d.tahun} href={`/sdp?tahun=${d.tahun}`} className={cn("rounded-full border px-3 py-1 text-sm", d.tahun === pilih?.tahun ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}>
              {d.tahun}
            </Link>
          ))}
        </nav>
      )}

      {!data ? (
        <Alert tone="waspada">Ringkasan SDP belum diisi. {bisaUbah ? "Isi angka dari laporan cetak SDP pada formulir di bawah." : "Hubungi Pemantau Pusat atau Administrator."}</Alert>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Tahun {pilih!.tahun}
            {pilih!.tanggal_data && <> · data SDP per {fmtWaktu(pilih!.tanggal_data)}</>} · diperbarui di PAS-SIAGA {fmtWaktu(pilih!.diubah_at)}. Rincian bulanan, peta sebaran, dan data per UPT tersedia pada dasbor SDP (perlu akun SDP).
          </p>

          <section aria-label="Angka utama" className="muncul grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
            {KPI_SDP.map((k, i) => {
              const Ikon = IKON[i];
              return (
                <div key={k.kunci} className="kaca rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</p>
                    <Ikon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  </div>
                  <p className="mt-2 break-words font-mono text-xl font-medium tabular-nums">{data.kpi[k.kunci] || "-"}</p>
                </div>
              );
            })}
          </section>

          {data.komoditas && data.komoditas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Komoditas tertinggi di peta sebaran:</span>
              {data.komoditas.map((k) => <Pill key={k} tone="hijau">{k}</Pill>)}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {TABEL_SDP.map((t) => (
              <Card key={t.kunci} className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.judul}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0 pb-2">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="w-10 px-3 py-2 text-left">No</th>
                        {t.kolom.map((c, i) => <th key={c} className={cn("px-3 py-2", i === 0 ? "text-left" : "text-right")}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data[t.kunci].map((r, n) => (
                        <tr key={n} className={cn(milikSaya(r[0] ?? "") && "bg-[hsl(44_90%_60%/0.18)] font-semibold")}>
                          <td className="px-3 py-2 text-muted-foreground">{n + 1}</td>
                          {t.kolom.map((_, i) => <td key={i} className={cn("px-3 py-2", i === 0 ? "" : "whitespace-nowrap text-right tabular-nums")}>{r[i] ?? "-"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data[t.kunci].length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Belum diisi.</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {bisaUbah && (
        <Card id="perbarui">
          <CardHeader>
            <CardTitle className="text-base">Perbarui angka SDP</CardTitle>
            <CardDescription>
              Dasbor SDP hanya bisa dibuka dengan akun SDP. Cetak laporan dari dasbor SDP, lalu salin angkanya ke sini agar semua Kanwil dan UPT dapat melihat ringkasan yang sama. Satu baris tabel ditulis seperti &quot;Jawa Barat ; 771,35 Ton ; Rp 6,09 Miliar&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormSdp
              awal={{
                tahun: String(pilih?.tahun ?? new Date().getFullYear()),
                tanggal: pilih?.tanggal_data ? pilih.tanggal_data.slice(0, 10) : "",
                ...(data?.kpi ?? { total_produksi: "", nilai_produksi: "", rata_wbp: "", rata_luas_wilayah: "", rata_luas_lahan: "" }),
                komoditas: (data?.komoditas ?? []).join(", "),
                ...Object.fromEntries(TABEL_SDP.map((t) => [t.kunci, barisKeTeks(data?.[t.kunci] ?? [])])),
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
