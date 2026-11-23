"use client";

/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ubahKopLengkap } from "@/lib/actions/tahap";
import { alamatKop, barisBaku, BARIS_KOP_MAKS } from "@/lib/domain/kop";

export type AwalKop = {
  kode: string;
  upt: string;
  kanwil: string | null;
  baris: string[] | null;
  alamat: string;
  kodePos: string;
  telepon: string;
  faks: string;
  email: string;
  website: string;
  kota: string;
};

/** Pratinjau kop yang dipakai bersama oleh halaman Kop surat dan penyesuaian per surat. */
export function PratinjauKop({ baris, alamat }: { baris: string[]; alamat: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 font-serif text-black">
      <div className="flex items-center gap-4">
        <img src="/logo-kemenimipas.png" alt="" className="h-16 w-16 shrink-0 object-contain" />
        <div className="flex-1 text-center leading-tight">
          {baris.map((b, i) => (
            <p key={i} className={i === baris.length - 1 ? "text-[0.9375rem] font-bold" : "text-[0.8125rem] font-bold"}>{b}</p>
          ))}
          {alamat && <p className="mt-1 text-[0.625rem]">{alamat}</p>}
        </div>
        <img src="/logo-pemasyarakatan.png" alt="" className="h-10 w-auto shrink-0 object-contain sm:h-16" />
      </div>
      <div className="mt-2 border-b-[3px] border-black" />
      <div className="mt-[2px] border-b border-black" />
    </div>
  );
}

/** Daftar baris judul kop yang bisa ditambah, dihapus, dan diurutkan. */
export function EditorBaris({ nilai, onUbah, baku }: { nilai: string[]; onUbah: (b: string[]) => void; baku: string[] }) {
  const ubah = (i: number, v: string) => onUbah(nilai.map((x, k) => (k === i ? v : x)));
  const geser = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= nilai.length) return;
    const c = [...nilai];
    [c[i], c[j]] = [c[j], c[i]];
    onUbah(c);
  };
  return (
    <div className="space-y-2">
      {nilai.map((b, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input value={b} onChange={(e) => ubah(i, e.target.value)} maxLength={150} aria-label={`Baris kop ${i + 1}`} className="min-w-0 flex-1" />
          <Button type="button" variant="outline" size="sm" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan baris"><ArrowUp className="h-4 w-4" aria-hidden /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => geser(i, 1)} disabled={i === nilai.length - 1} aria-label="Turunkan baris"><ArrowDown className="h-4 w-4" aria-hidden /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onUbah(nilai.filter((_, k) => k !== i))} aria-label="Hapus baris"><Trash2 className="h-4 w-4" aria-hidden /></Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onUbah([...nilai, ""])} disabled={nilai.length >= BARIS_KOP_MAKS}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah baris
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onUbah(baku)}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Kembalikan susunan baku
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Baris terakhir tampil paling besar (biasanya nama UPT). Tulis huruf kapital bila diinginkan.</p>
    </div>
  );
}

export function FormKop({ awal }: { awal: AwalKop }) {
  const baku = React.useMemo(() => barisBaku(awal.kanwil, awal.upt), [awal.kanwil, awal.upt]);
  const [baris, setBaris] = React.useState<string[]>(awal.baris && awal.baris.length ? awal.baris : baku);
  const [f, setF] = React.useState({ alamat: awal.alamat, kodePos: awal.kodePos, telepon: awal.telepon, faks: awal.faks, email: awal.email, website: awal.website, kota: awal.kota });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const tampil = baris.map((b) => b.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold">Pratinjau</p>
        <PratinjauKop baris={tampil.length ? tampil : baku} alamat={alamatKop({ alamat: f.alamat, kodePos: f.kodePos, telepon: f.telepon, faks: f.faks, email: f.email, website: f.website })} />
      </div>
      <ActionForm
        action={ubahKopLengkap}
        submit="Simpan kop surat"
        success="Kop surat tersimpan dan langsung dipakai pada laporan dan surat berikutnya."
        resetOnSuccess={false}
        build={() => ({
          kode: awal.kode,
          // Susunan sama dengan baku disimpan kosong, supaya ikut berubah bila nama Kanwil atau UPT diperbarui.
          baris: tampil.join("\n") === baku.join("\n") ? [] : tampil,
          alamat: f.alamat, kode_pos: f.kodePos, telepon: f.telepon, faks: f.faks, email: f.email, website: f.website, kota: f.kota,
        })}
      >
        <Field label="Baris judul kop" hint="Semua baris bisa diganti, ditambah, dihapus, atau diurutkan ulang sesuai kondisi UPT.">
          <EditorBaris nilai={baris} onUbah={setBaris} baku={baku} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alamat kantor" htmlFor="k-alamat" className="sm:col-span-2"><Input id="k-alamat" value={f.alamat} onChange={set("alamat")} placeholder="Jl. …, Kecamatan …, Kabupaten …" /></Field>
          <Field label="Kode pos" htmlFor="k-pos"><Input id="k-pos" value={f.kodePos} onChange={set("kodePos")} inputMode="numeric" /></Field>
          <Field label="Telepon" htmlFor="k-tel"><Input id="k-tel" value={f.telepon} onChange={set("telepon")} /></Field>
          <Field label="Faksimile" htmlFor="k-faks"><Input id="k-faks" value={f.faks} onChange={set("faks")} /></Field>
          <Field label="Pos-el (email)" htmlFor="k-mail"><Input id="k-mail" value={f.email} onChange={set("email")} /></Field>
          <Field label="Laman (website)" htmlFor="k-web"><Input id="k-web" value={f.website} onChange={set("website")} /></Field>
          <Field label="Kota penandatanganan" htmlFor="k-kota" hint="Muncul di atas tanda tangan, mis. Tangerang."><Input id="k-kota" value={f.kota} onChange={set("kota")} /></Field>
        </div>
      </ActionForm>
    </div>
  );
}
