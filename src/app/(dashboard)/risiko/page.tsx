import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateRisk } from "@/lib/actions/notes";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtWaktu } from "@/lib/format";

export const metadata = { title: "Risiko & mitigasi" };
export const dynamic = "force-dynamic";

const NADA = { Dipantau: "biru", Terjadi: "merah", Terkendali: "hijau" } as const;

export default async function RisikoPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("risk_register").select("*").order("nomor");
  const bisaUbah = user.role === "administrator" || user.role === "kepala_pengamanan";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Risiko & mitigasi" description="Risiko pelaksanaan proyek dan langkah mitigasinya. Perbarui statusnya selama uji coba berjalan." />
      {error && <Alert tone="bahaya">Data belum bisa dibaca. Muat ulang halaman.</Alert>}
      <ul className="space-y-4">
        {(data ?? []).map((r) => (
          <li key={r.id}>
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium"><span className="text-muted-foreground">{r.nomor}.</span> {r.risiko}</p>
                  <Pill tone={NADA[r.status as keyof typeof NADA] ?? "netral"}>{r.status}</Pill>
                </div>
                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Mitigasi: </span>{r.mitigasi}</p>
                {r.catatan && <p className="text-sm">Catatan: {r.catatan}</p>}
                <p className="text-xs text-muted-foreground">Diperbarui {fmtWaktu(r.updated_at)}</p>
                {bisaUbah && (
                  <ActionForm action={updateRisk} submit="Perbarui" resetOnSuccess={false} className="flex flex-wrap items-end gap-2 space-y-0" fields={{ id: { v: r.id }, status: { s: "status" }, catatan: { s: "catatan" } }}>
                    <Select name="status" defaultValue={r.status} className="w-40" aria-label="Status risiko"><option>Dipantau</option><option>Terjadi</option><option>Terkendali</option></Select>
                    <Input name="catatan" defaultValue={r.catatan ?? ""} placeholder="Catatan (opsional)" className="min-w-48 flex-1" aria-label="Catatan" />
                  </ActionForm>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
