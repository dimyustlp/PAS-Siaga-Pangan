"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IsiLaporan } from "@/lib/domain/laporan-format";

/** Tombol unduh PDF. Pustaka PDF baru dimuat saat tombol ditekan agar halaman tetap ringan. */
export function TombolUnduhPdf({ isi, namaBerkas }: { isi: IsiLaporan; namaBerkas: string }) {
  const [langkah, setLangkah] = React.useState<string | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);

  async function unduh() {
    setGalat(null);
    setLangkah("Memuat penyusun PDF…");
    try {
      const { buatPdfLaporan } = await import("./buat-pdf");
      const blob = await buatPdfLaporan(isi, setLangkah);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = namaBerkas;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      console.error(e);
      setGalat("PDF gagal disusun. Coba lagi, atau gunakan tombol Cetak lalu pilih Simpan sebagai PDF.");
    } finally {
      setLangkah(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" onClick={unduh} disabled={!!langkah}>
        {langkah ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
        {langkah ? "Menyusun…" : "Unduh PDF"}
      </Button>
      {langkah && <p className="text-xs text-muted-foreground">{langkah}</p>}
      {galat && <p className="max-w-xs text-right text-xs text-status-merah">{galat}</p>}
    </div>
  );
}
