import { Card, CardContent } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/form";
import { fmtWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Jejak audit" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audit_events").select("*").order("waktu", { ascending: false }).limit(200);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Jejak audit" description="200 kejadian terakhir: perubahan akun, keputusan, penutupan sesi, dan tindakan penting lain. Catatan ini tidak dapat diubah." />
      {error && <Alert tone="bahaya">Data belum bisa dibaca. Muat ulang halaman.</Alert>}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Pelaku</th><th className="px-4 py-2">Aksi</th><th className="px-4 py-2">Sasaran</th></tr></thead>
            <tbody className="divide-y">
              {(data ?? []).map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{fmtWaktu(e.waktu)}</td>
                  <td className="px-4 py-2">{e.aktor_nama ?? "Sistem"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{e.aksi}</td>
                  <td className="px-4 py-2">{e.sasaran_nama ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Belum ada catatan.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
