import { FormImporWb, FormLokasi } from "@/components/shared/forms-operator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Data induk" };
export const dynamic = "force-dynamic";

export default async function DataIndukPage() {
  const supabase = await createClient();
  const [lokasi, wb] = await Promise.all([
    supabase.from("master_locations").select("*").order("nama"),
    supabase.from("master_inmates").select("id", { count: "exact", head: true }).eq("aktif", true),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Data induk" description="Lokasi kegiatan dan daftar warga binaan yang dapat dipilih pada nominatif sesi." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Tambah lokasi</CardTitle></CardHeader><CardContent><FormLokasi /></CardContent></Card>
        <Card><CardHeader><CardTitle>Impor warga binaan</CardTitle><CardDescription>{wb.count ?? 0} warga binaan aktif terdaftar.</CardDescription></CardHeader><CardContent><FormImporWb /></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Lokasi terdaftar</CardTitle></CardHeader>
        <CardContent>
          {(lokasi.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada lokasi.</p> : (
            <ul className="divide-y text-sm">
              {(lokasi.data ?? []).map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span>{l.nama}{l.kode ? <span className="ml-2 font-mono text-xs text-muted-foreground">{l.kode}</span> : null}</span>
                  <span className="text-muted-foreground">{l.luas_ha ? `${l.luas_ha} ha` : ""}{l.aktif ? "" : " · nonaktif"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
