import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { FasePill } from "@/components/shared/session-panels";
import { FormImporWb, FormKegiatan, FormLokasi, FormSesiBaru } from "@/components/shared/forms-operator";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { fmtTanggal, fmtTanggalPendek } from "@/lib/format";

export const metadata = { title: "Kegiatan" };
export const dynamic = "force-dynamic";

export default async function KegiatanPage() {
  const supabase = await createClient();
  const [kegiatan, sesi, lokasi, pengawal, wb] = await Promise.all([
    supabase.from("activities").select("*").order("tanggal_mulai", { ascending: false }).limit(100),
    supabase.from("v_session_overview").select("*").order("tanggal_sesi", { ascending: false }).limit(100),
    supabase.from("master_locations").select("*").eq("aktif", true).order("nama"),
    supabase.from("profiles").select("id,full_name,nip").eq("role", "pengawal").eq("is_active", true).order("full_name"),
    supabase.from("master_inmates").select("id", { count: "exact", head: true }).eq("aktif", true),
  ]);

  const daftarKegiatan = kegiatan.data ?? [];
  const daftarLokasi = lokasi.data ?? [];
  const opsiKegiatan = daftarKegiatan.map((k) => {
    const l = daftarLokasi.find((x) => x.id === k.lokasi_id);
    return { id: k.id, label: `${k.kode_kegiatan} · ${k.jenis_kegiatan} · ${l?.nama ?? "-"}` };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Kegiatan"
        description="Siapkan rencana kegiatan dan sesi harian. Kepala Pengamanan memutuskan kesiapan setelah dokumen, daftar nominatif, dan enam indikator kesiapan lengkap."
      />

      <section className="space-y-3" aria-labelledby="h-sesi">
        <h2 id="h-sesi" className="text-lg font-semibold">Sesi harian</h2>
        {(sesi.data ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada sesi. Buat rencana kegiatan lalu sesi harian di bawah.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {(sesi.data ?? []).map((s) => (
              <li key={s.session_id ?? ""}>
                <Link href={`/kegiatan/${s.session_id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-secondary/60">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.jenis_kegiatan} · {s.lokasi_nama}</span>
                    <span className="block text-xs text-muted-foreground">{s.kode_kegiatan}{s.latihan ? " · LATIHAN" : ""} · {fmtTanggalPendek(s.tanggal_sesi)} · {s.jumlah_narapidana} WB</span>
                  </span>
                  <FasePill fase={s.fase} />
                  {s.status_keamanan && <StatusBadge status={s.status_keamanan} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Rencana kegiatan baru</CardTitle><CardDescription>Berlaku untuk jangka waktu tertentu; sesi harian dibuat di bawahnya.</CardDescription></CardHeader>
          <CardContent><FormKegiatan lokasi={daftarLokasi} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sesi harian baru</CardTitle><CardDescription>Satu sesi per kegiatan per tanggal.</CardDescription></CardHeader>
          <CardContent><FormSesiBaru kegiatan={opsiKegiatan} pengawal={pengawal.data ?? []} /></CardContent>
        </Card>
      </div>

      {daftarKegiatan.length > 0 && (
        <section className="space-y-2" aria-labelledby="h-keg">
          <h2 id="h-keg" className="text-lg font-semibold">Rencana kegiatan</h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {daftarKegiatan.map((k) => (
              <li key={k.id} className="px-4 py-2.5">
                <span className="font-medium">{k.kode_kegiatan}</span> · {k.jenis_kegiatan} · {daftarLokasi.find((l) => l.id === k.lokasi_id)?.nama ?? "-"}
                <span className="block text-xs text-muted-foreground">{fmtTanggal(k.tanggal_mulai)}{k.rencana_berakhir ? ` s.d. ${fmtTanggal(k.rencana_berakhir)}` : ""}{k.luas_lahan_ha ? ` · ${k.luas_lahan_ha} ha` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="h-induk">
        <h2 id="h-induk" className="text-lg font-semibold">Data induk UPT</h2>
        <Alert>Data pribadi WB dipakai terbatas pada keperluan kegiatan. Saat ini terdaftar {wb.count ?? 0} warga binaan aktif.</Alert>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Tambah lokasi</CardTitle></CardHeader><CardContent><FormLokasi /></CardContent></Card>
          <Card><CardHeader><CardTitle>Impor warga binaan</CardTitle></CardHeader><CardContent><FormImporWb /></CardContent></Card>
        </div>
      </section>
    </div>
  );
}
