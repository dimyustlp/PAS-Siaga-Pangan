"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { LaporanResmi } from "@/components/laporan/laporan-resmi";
import { TombolUnduhPdf } from "@/components/laporan/tombol-unduh";
import { EditorBaris, PratinjauKop } from "@/components/shared/form-kop";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { IsiLaporan } from "@/lib/domain/laporan-format";

/**
 * Laporan dengan kop dari UPT yang bisa disesuaikan untuk surat ini saja.
 * Perubahan di sini tidak menyimpan apa pun; kop tetap diubah lewat menu Kop surat UPT.
 */
export function LaporanKopSesuai({ isi, namaBerkas, kiri, atas }: { isi: IsiLaporan; namaBerkas: string; kiri: React.ReactNode; atas: React.ReactNode }) {
  const [baris, setBaris] = React.useState(isi.kopBaris);
  const [alamat, setAlamat] = React.useState(isi.kopAlamat);
  const kotaAwal = isi.kotaTanggal.split(", ")[0] ?? "";
  const [kota, setKota] = React.useState(kotaAwal.startsWith(".") ? "" : kotaAwal);
  const berubah = baris.join("\n") !== isi.kopBaris.join("\n") || alamat !== isi.kopAlamat || kota !== (kotaAwal.startsWith(".") ? "" : kotaAwal);

  const isiPakai = React.useMemo<IsiLaporan>(() => {
    const tanggal = isi.kotaTanggal.split(", ").slice(1).join(", ");
    return {
      ...isi,
      kopBaris: baris.map((b) => b.trim()).filter(Boolean),
      kopAlamat: alamat.trim(),
      kotaTanggal: `${kota.trim() || "........................"}, ${tanggal}`,
    };
  }, [isi, baris, alamat, kota]);

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">{kiri}</div>
        <TombolUnduhPdf isi={isiPakai} namaBerkas={namaBerkas} />
      </div>

      <details className="no-print kaca group rounded-2xl p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold">
          <span>Sesuaikan kop untuk surat ini{berubah ? " (sudah diubah)" : ""}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">Ubah sesuai kondisi di lapangan. Perubahan hanya berlaku pada pratinjau, cetakan, dan PDF laporan ini; kop tersimpan UPT tidak berubah.</p>
          <PratinjauKop baris={isiPakai.kopBaris} alamat={isiPakai.kopAlamat} />
          <Field label="Baris judul kop"><EditorBaris nilai={baris} onUbah={setBaris} baku={isi.kopBaris} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Baris alamat dan kontak" htmlFor="ks-alamat" className="sm:col-span-2"><Input id="ks-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} /></Field>
            <Field label="Kota penandatanganan" htmlFor="ks-kota"><Input id="ks-kota" value={kota} onChange={(e) => setKota(e.target.value)} /></Field>
          </div>
        </div>
      </details>

      {atas}
      <LaporanResmi isi={isiPakai} />
    </div>
  );
}
