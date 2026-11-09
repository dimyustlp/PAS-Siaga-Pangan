"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const UKURAN: Record<string, number> = { "pas-siaga-documents": 20, "pas-siaga-evidence": 10, "pas-siaga-berkas": 20 };

/** Mengunggah berkas langsung dari browser ke Storage (menghindari batas ukuran permintaan server). */
export async function unggah(bucket: string, sessionId: string, file: File): Promise<{ path: string } | { error: string }> {
  const batas = UKURAN[bucket] ?? 10;
  if (file.size > batas * 1024 * 1024) return { error: `Ukuran berkas maksimal ${batas} MB.` };
  const aman = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "berkas";
  const path = `${sessionId}/${Date.now()}-${aman}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) return { error: "Berkas gagal diunggah. Periksa jenis berkas dan koneksi, lalu coba lagi." };
  return { path };
}

type Props = {
  bucket: "pas-siaga-documents" | "pas-siaga-evidence";
  sessionId: string;
  /** Bila diisi, alamat berkas disimpan di input tersembunyi bernama ini (untuk dipakai ActionForm). */
  name?: string;
  accept: string;
  label?: string;
  capture?: boolean;
  onUploaded?: (path: string) => void | Promise<void>;
};

export function UploadField({ bucket, sessionId, name, accept, capture, onUploaded }: Props) {
  const [status, setStatus] = React.useState<"diam" | "unggah" | "selesai">("diam");
  const [galat, setGalat] = React.useState<string | null>(null);
  const [path, setPath] = React.useState("");
  const [namaBerkas, setNamaBerkas] = React.useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalat(null);
    setStatus("unggah");
    const hasil = await unggah(bucket, sessionId, file);
    if ("error" in hasil) {
      setGalat(hasil.error);
      setStatus("diam");
      return;
    }
    setPath(hasil.path);
    setNamaBerkas(file.name);
    setStatus("selesai");
    await onUploaded?.(hasil.path);
  }

  return (
    <div className="space-y-2">
      <Input type="file" accept={accept} onChange={onChange} disabled={status === "unggah"} {...(capture ? { capture: "environment" } : {})} />
      {name && <input type="hidden" name={name} value={path} />}
      {status === "unggah" && <p className="text-xs text-muted-foreground">Mengunggah…</p>}
      {status === "selesai" && <p className="text-xs text-status-hijau">Terunggah: {namaBerkas}</p>}
      {galat && <Alert tone="bahaya">{galat}</Alert>}
    </div>
  );
}
