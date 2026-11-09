"use client";

import * as React from "react";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form";
import { buatKunciGelang } from "@/lib/actions/gelang";

/** Membuat kunci penerima. Kunci hanya tampil di layar ini sekali, setelah itu tidak bisa dilihat lagi. */
export function KunciGelang({ sudahAda, alamat }: { sudahAda: boolean; alamat: string }) {
  const [kunci, setKunci] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [salin, setSalin] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  async function salinTeks(teks: string, tanda: string) {
    try {
      await navigator.clipboard.writeText(teks);
      setSalin(tanda);
      setTimeout(() => setSalin(null), 2000);
    } catch {
      setGalat("Salin otomatis gagal. Blok teksnya lalu salin manual.");
    }
  }

  const tautan = kunci ? `${alamat}?kunci=${kunci}&unit={unit}&jenis={jenis}&waktu={waktu}&lokasi={lokasi}` : "";

  return (
    <div className="space-y-4">
      <Button
        type="button"
        disabled={pending}
        variant={sudahAda ? "outline" : "default"}
        onClick={() => {
          if (sudahAda && !window.confirm("Kunci lama langsung tidak berlaku, dan notifikasi di sistem gelang harus diganti dengan kunci baru. Lanjutkan?")) return;
          setGalat(null);
          start(async () => {
            const res = await buatKunciGelang();
            if (!res.ok) setGalat(res.error);
            else setKunci(res.data.kunci);
          });
        }}
      >
        <KeyRound className="h-4 w-4" aria-hidden />
        {pending ? "Membuat…" : sudahAda ? "Buat kunci baru (ganti)" : "Buat kunci"}
      </Button>
      {galat && <Alert tone="bahaya">{galat}</Alert>}
      {kunci && (
        <div className="space-y-3 rounded-xl border border-status-kuning/50 bg-status-kuning/10 p-4">
          <p className="text-sm font-semibold">Salin sekarang. Kunci ini tidak akan ditampilkan lagi.</p>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Kunci</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-card px-3 py-2 font-mono text-xs">{kunci}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => salinTeks(kunci, "kunci")}><Copy className="h-4 w-4" aria-hidden />{salin === "kunci" ? "Tersalin" : "Salin"}</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Alamat lengkap untuk notifikasi (sesuaikan tanda kurung kurawal dengan variabel di sistem gelang)</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-card px-3 py-2 font-mono text-xs">{tautan}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => salinTeks(tautan, "tautan")}><Copy className="h-4 w-4" aria-hidden />{salin === "tautan" ? "Tersalin" : "Salin"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
