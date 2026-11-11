"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { unggah } from "@/components/shared/upload-field";
import { terbitkanBerita } from "@/lib/actions/pangan";
import { KATEGORI_BERITA } from "@/lib/validations/induk";

type Props = { kodeUpt: string; hariIni: string };

export function FormBerita({ kodeUpt, hariIni }: Props) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [galat, setGalat] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const foto = fd.get("foto");
    setGalat(null);
    setOk(false);
    start(async () => {
      let foto_path: string | undefined;
      if (foto instanceof File && foto.size > 0) {
        if (!/^image\/(jpeg|png|webp)$/.test(foto.type)) return setGalat("Foto harus berformat JPG, PNG, atau WEBP.");
        const hasil = await unggah("pas-siaga-berita", kodeUpt, foto);
        if ("error" in hasil) return setGalat(hasil.error);
        foto_path = hasil.path;
      }
      const teks = (n: string) => {
        const v = fd.get(n);
        return typeof v === "string" && v.trim() ? v.trim() : undefined;
      };
      const res = await terbitkanBerita({
        kode_upt: kodeUpt,
        kategori: teks("kategori"),
        judul: teks("judul"),
        ringkasan: teks("ringkasan"),
        isi: teks("isi"),
        tanggal: teks("tanggal"),
        foto_path,
        diterbitkan: fd.get("diterbitkan") === "on",
      });
      if (!res.ok) return setGalat(res.error);
      setOk(true);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategori" htmlFor="n-kat"><Select id="n-kat" name="kategori" defaultValue="Panen">{KATEGORI_BERITA.map((k) => <option key={k}>{k}</option>)}</Select></Field>
        <Field label="Tanggal" htmlFor="n-tgl"><Input id="n-tgl" name="tanggal" type="date" required defaultValue={hariIni} /></Field>
        <Field label="Judul" htmlFor="n-judul" className="sm:col-span-2"><Input id="n-judul" name="judul" required minLength={5} maxLength={200} /></Field>
        <Field label="Ringkasan (opsional)" htmlFor="n-ring" className="sm:col-span-2" hint="Satu atau dua kalimat yang tampil di daftar."><Input id="n-ring" name="ringkasan" maxLength={400} /></Field>
        <Field label="Isi berita" htmlFor="n-isi" className="sm:col-span-2"><Textarea id="n-isi" name="isi" rows={6} required minLength={10} maxLength={8000} /></Field>
        <Field label="Foto (opsional)" htmlFor="n-foto" hint="JPG, PNG, atau WEBP. Maksimal 5 MB."><Input id="n-foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="diterbitkan" defaultChecked className="h-4 w-4" />Terbitkan sekarang</label>
      </div>
      {galat && <Alert tone="bahaya">{galat}</Alert>}
      {ok && !galat && <Alert tone="sukses">Berita tersimpan.</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan berita"}</Button>
    </form>
  );
}
