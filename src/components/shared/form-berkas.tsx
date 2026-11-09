"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { unggah } from "@/components/shared/upload-field";
import { createBerkas } from "@/lib/actions/berkas";
import { BERKAS_ACCEPT, KATEGORI_BERKAS } from "@/lib/domain/berkas";

type Props = {
  /** UPT yang boleh dipilih. Satu UPT = pilihan terkunci. */
  upt: { kode: string; nama: string }[];
  hariIni: string;
};

export function FormBerkas({ upt, hariIni }: Props) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"unggah" | "tautan">("unggah");
  const [pending, start] = React.useTransition();
  const [galat, setGalat] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const kode = String(fd.get("upt") ?? upt[0]?.kode ?? "");
    const file = fd.get("berkas");
    setGalat(null);
    setOk(false);
    start(async () => {
      let tambahan: Record<string, unknown> = {};
      if (mode === "unggah") {
        if (!(file instanceof File) || file.size === 0) return setGalat("Pilih berkas yang akan diunggah.");
        const hasil = await unggah("pas-siaga-berkas", kode, file);
        if ("error" in hasil) return setGalat(hasil.error);
        tambahan = { path: hasil.path, nama_berkas: file.name, ukuran_byte: file.size, mime: file.type || undefined };
      } else {
        tambahan = { tautan: String(fd.get("tautan") ?? "") };
      }
      const res = await createBerkas({
        kode_upt: kode,
        kategori: String(fd.get("kategori") ?? ""),
        judul: String(fd.get("judul") ?? ""),
        keterangan: String(fd.get("keterangan") ?? ""),
        tanggal: String(fd.get("tanggal") ?? ""),
        sumber: mode,
        ...tambahan,
      });
      if (!res.ok) return setGalat(res.error);
      setOk(true);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="inline-flex rounded-lg border border-input bg-card p-1 text-sm" role="tablist" aria-label="Cara menambah berkas">
        {([["unggah", "Unggah berkas"], ["tautan", "Tambah tautan"]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={mode === k ? "rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground" : "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="UPT" htmlFor="b-upt">
          <Select id="b-upt" name="upt" defaultValue={upt[0]?.kode} disabled={upt.length === 1}>
            {upt.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}
          </Select>
          {upt.length === 1 && <input type="hidden" name="upt" value={upt[0].kode} />}
        </Field>
        <Field label="Kategori" htmlFor="b-kat">
          <Select id="b-kat" name="kategori" required defaultValue="">
            <option value="" disabled>Pilih kategori</option>
            {KATEGORI_BERKAS.map((k) => <option key={k}>{k}</option>)}
          </Select>
        </Field>
        <Field label="Judul berkas" htmlFor="b-judul" className="sm:col-span-2">
          <Input id="b-judul" name="judul" required placeholder="Mis. Laporan pelaksanaan panen minggu ke-2" />
        </Field>
        <Field label="Tanggal berkas" htmlFor="b-tgl">
          <Input id="b-tgl" name="tanggal" type="date" required defaultValue={hariIni} />
        </Field>
        {mode === "unggah" ? (
          <Field label="Berkas" htmlFor="b-file" hint="PDF, JPG, PNG, WEBP, DOCX, atau XLSX. Maksimal 20 MB.">
            <Input id="b-file" name="berkas" type="file" accept={BERKAS_ACCEPT} />
          </Field>
        ) : (
          <Field label="Tautan (https)" htmlFor="b-tautan" hint="Mis. tautan folder Google Drive tempat hasil Google Form tersimpan.">
            <Input id="b-tautan" name="tautan" type="url" required placeholder="https://drive.google.com/…" />
          </Field>
        )}
        <Field label="Keterangan (opsional)" htmlFor="b-ket" className="sm:col-span-2">
          <Textarea id="b-ket" name="keterangan" rows={2} />
        </Field>
      </div>

      {galat && <Alert tone="bahaya">{galat}</Alert>}
      {ok && !galat && <Alert tone="sukses">Berkas tersimpan.</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : mode === "unggah" ? "Unggah dan simpan" : "Simpan tautan"}</Button>
    </form>
  );
}
