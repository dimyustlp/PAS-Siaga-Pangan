"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { unggah } from "@/components/shared/upload-field";
import { lampirkanDokumenWajib } from "@/lib/actions/kendali";

/** Unggah berkas untuk satu dokumen wajib (a sampai m), lalu tautkan ke sesi. */
export function UnggahDokumenWajib({ sessionId, kode, ada }: { sessionId: string; kode: string; ada: boolean }) {
  const router = useRouter();
  const [proses, setProses] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setGalat(null);
    setProses(true);
    const hasil = await unggah("pas-siaga-documents", sessionId, file);
    if ("error" in hasil) {
      setGalat(hasil.error);
      setProses(false);
      return;
    }
    const res = await lampirkanDokumenWajib({ session_id: sessionId, kode, path: hasil.path, nama_berkas: file.name.slice(0, 200), mime: file.type || undefined, ukuran_byte: file.size });
    setProses(false);
    input.value = "";
    if (!res.ok) return setGalat(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground" htmlFor={`uw-${kode}`}>{ada ? "Usulkan revisi berkas (menunggu persetujuan Kepala UPT)" : "Unggah berkas"} (PDF, JPG, PNG, atau DOCX, maksimal 20 MB)</label>
      <Input id={`uw-${kode}`} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={onChange} disabled={proses} />
      {proses && <p className="text-xs text-muted-foreground">Mengunggah…</p>}
      {galat && <Alert tone="bahaya">{galat}</Alert>}
    </div>
  );
}
