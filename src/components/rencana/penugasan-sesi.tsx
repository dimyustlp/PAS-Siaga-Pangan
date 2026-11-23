"use client";

import * as React from "react";
import { UserCog } from "lucide-react";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { ubahPenugasan } from "@/lib/actions/sessions";

export type PengawalPilihan = { id: string; full_name: string };

/** Operator menugaskan atau mengganti pengawal. Pengawal yang dipilih langsung melihat sesi ini di dasbornya. */
export function PenugasanSesi({ sessionId, awal, pengawal }: { sessionId: string; awal: string[]; pengawal: PengawalPilihan[] }) {
  const [buka, setBuka] = React.useState(false);
  const [dipilih, setDipilih] = React.useState<string[]>(awal);
  const nama = awal.map((id) => pengawal.find((p) => p.id === id)?.full_name ?? "Pengawal").join(", ");
  const alih = (id: string) => setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <div className="space-y-2">
      <p className="text-sm">{nama || <span className="text-muted-foreground">Belum ada</span>}</p>
      <Button type="button" size="sm" variant="outline" onClick={() => setBuka((b) => !b)} aria-expanded={buka}>
        <UserCog className="h-4 w-4" aria-hidden />{buka ? "Tutup" : "Tugaskan pengawal"}
      </Button>
      {buka && (
        <ActionForm
          action={ubahPenugasan}
          submit="Simpan penugasan"
          success="Penugasan tersimpan. Pengawal langsung melihat tugasnya."
          resetOnSuccess={false}
          build={() => ({ session_id: sessionId, petugas_ids: dipilih })}
          className="rounded-lg border bg-secondary/30 p-3"
        >
          {pengawal.length === 0 ? (
            <p className="text-sm text-status-merah">Belum ada akun Pengawal aktif di UPT Anda. Minta Administrator membuatkannya.</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {pengawal.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
                  <input type="checkbox" checked={dipilih.includes(p.id)} onChange={() => alih(p.id)} className="h-4 w-4" />
                  {p.full_name}
                </label>
              ))}
            </div>
          )}
        </ActionForm>
      )}
    </div>
  );
}
