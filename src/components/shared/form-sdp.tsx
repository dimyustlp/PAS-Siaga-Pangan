"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { simpanSdp } from "@/lib/actions/sdp";
import { KPI_SDP, TABEL_SDP } from "@/lib/domain/sdp";

export function FormSdp({ awal }: { awal: Record<string, string> }) {
  return (
    <ActionForm action={simpanSdp} build={(fd) => Object.fromEntries(fd.entries())} submit="Simpan ringkasan SDP" resetOnSuccess={false} success="Ringkasan SDP tersimpan.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tahun data" htmlFor="sdp-tahun">
          <Input id="sdp-tahun" name="tahun" inputMode="numeric" defaultValue={awal.tahun} required />
        </Field>
        <Field label="Tanggal cetak laporan SDP" htmlFor="sdp-tgl">
          <Input id="sdp-tgl" name="tanggal" type="date" defaultValue={awal.tanggal} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_SDP.map((k) => (
          <Field key={k.kunci} label={k.label} htmlFor={`sdp-${k.kunci}`}>
            <Input id={`sdp-${k.kunci}`} name={k.kunci} defaultValue={awal[k.kunci]} required />
          </Field>
        ))}
      </div>
      <Field label="Komoditas tertinggi (pisahkan dengan koma)" htmlFor="sdp-kom">
        <Input id="sdp-kom" name="komoditas" defaultValue={awal.komoditas} />
      </Field>
      <div className="grid gap-3 lg:grid-cols-2">
        {TABEL_SDP.map((t) => (
          <Field key={t.kunci} label={t.judul} htmlFor={`sdp-${t.kunci}`} hint={`Satu Kanwil per baris: ${t.kolom.join(" ; ")}`}>
            <Textarea id={`sdp-${t.kunci}`} name={t.kunci} rows={6} defaultValue={awal[t.kunci]} className="font-mono text-xs" />
          </Field>
        ))}
      </div>
    </ActionForm>
  );
}
