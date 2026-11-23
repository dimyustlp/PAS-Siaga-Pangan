"use client";

import * as React from "react";
import { Check, ChevronDown, Circle } from "lucide-react";
import { ActionForm } from "@/components/shared/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ubahRencanaBagian } from "@/lib/actions/sessions";

export type RincianAwal = {
  id: string;
  tanggal_mulai: string;
  rencana_berakhir: string | null;
  luas_lahan_ha: number | null;
  nomor_surat_perintah: string | null;
  nomor_persetujuan: string | null;
  titik_komunikasi: string | null;
  batas_area: string | null;
  rute: string | null;
  akses_warga: string | null;
};

function Bagian({ judul, uraian, lengkap, terbuka, children }: { judul: string; uraian: string; lengkap: boolean; terbuka?: boolean; children: React.ReactNode }) {
  return (
    <details open={terbuka} className="group rounded-xl border border-border/70 bg-white/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className={lengkap ? "text-status-hijau" : "text-muted-foreground"}>{lengkap ? <Check className="h-5 w-5" aria-hidden /> : <Circle className="h-5 w-5" aria-hidden />}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{judul}</span>
          <span className="block text-xs text-muted-foreground">{lengkap ? "Sudah diisi" : "Belum lengkap"} · {uraian}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border/60 p-4">{children}</div>
    </details>
  );
}

/** Rincian rencana diisi satu bagian demi satu bagian; tiap bagian punya tombol simpan sendiri. */
export function RincianEditor({ awal }: { awal: RincianAwal }) {
  const [p, setP] = React.useState({ mulai: awal.tanggal_mulai, akhir: awal.rencana_berakhir ?? "", luas: awal.luas_lahan_ha != null ? String(awal.luas_lahan_ha).replace(".", ",") : "" });
  const [d, setD] = React.useState({ sp: awal.nomor_surat_perintah ?? "", pers: awal.nomor_persetujuan ?? "" });
  const [a, setA] = React.useState({ kom: awal.titik_komunikasi ?? "", batas: awal.batas_area ?? "", rute: awal.rute ?? "", akses: awal.akses_warga ?? "" });

  return (
    <div className="space-y-3">
      <Bagian judul="1. Periode dan luas" uraian="tanggal mulai, rencana berakhir, luas lahan" lengkap={!!awal.tanggal_mulai && awal.luas_lahan_ha != null}>
        <ActionForm
          action={ubahRencanaBagian}
          submit="Simpan periode dan luas"
          success="Periode dan luas tersimpan."
          resetOnSuccess={false}
          build={() => ({ id: awal.id, bagian: "periode", tanggal_mulai: p.mulai, rencana_berakhir: p.akhir || undefined, luas_lahan_ha: p.luas.trim() ? Number(p.luas.replace(",", ".")) : undefined })}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal mulai" htmlFor="rb-mulai"><Input id="rb-mulai" type="date" required value={p.mulai} onChange={(e) => setP({ ...p, mulai: e.target.value })} /></Field>
            <Field label="Rencana berakhir" htmlFor="rb-akhir" hint="Kosongkan bila belum ditentukan."><Input id="rb-akhir" type="date" min={p.mulai} value={p.akhir} onChange={(e) => setP({ ...p, akhir: e.target.value })} /></Field>
            <Field label="Luas lahan atau kolam (ha)" htmlFor="rb-luas"><Input id="rb-luas" inputMode="decimal" value={p.luas} onChange={(e) => setP({ ...p, luas: e.target.value })} placeholder="mis. 2,5" /></Field>
          </div>
        </ActionForm>
      </Bagian>

      <Bagian judul="2. Surat dan persetujuan" uraian="nomor surat perintah dan persetujuan" lengkap={!!awal.nomor_surat_perintah && !!awal.nomor_persetujuan}>
        <ActionForm
          action={ubahRencanaBagian}
          submit="Simpan nomor surat"
          success="Nomor surat tersimpan."
          resetOnSuccess={false}
          build={() => ({ id: awal.id, bagian: "dokumen", nomor_surat_perintah: d.sp, nomor_persetujuan: d.pers })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomor surat perintah" htmlFor="rb-sp"><Input id="rb-sp" value={d.sp} onChange={(e) => setD({ ...d, sp: e.target.value })} /></Field>
            <Field label="Nomor persetujuan kegiatan" htmlFor="rb-pers"><Input id="rb-pers" value={d.pers} onChange={(e) => setD({ ...d, pers: e.target.value })} /></Field>
          </div>
        </ActionForm>
      </Bagian>

      <Bagian judul="3. Pengamanan di lokasi" uraian="titik komunikasi, batas area, rute, akses warga" lengkap={!!awal.titik_komunikasi && !!awal.batas_area && !!awal.rute && !!awal.akses_warga}>
        <ActionForm
          action={ubahRencanaBagian}
          submit="Simpan pengamanan"
          success="Rincian pengamanan tersimpan."
          resetOnSuccess={false}
          build={() => ({ id: awal.id, bagian: "pengamanan", titik_komunikasi: a.kom, batas_area: a.batas, rute: a.rute, akses_warga: a.akses })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titik komunikasi" htmlFor="rb-kom" hint="Mis. pos jaga, nomor radio atau telepon." className="sm:col-span-2"><Input id="rb-kom" value={a.kom} onChange={(e) => setA({ ...a, kom: e.target.value })} /></Field>
            <Field label="Batas area kegiatan" htmlFor="rb-batas"><Textarea id="rb-batas" rows={3} value={a.batas} onChange={(e) => setA({ ...a, batas: e.target.value })} placeholder="Batas-batas area yang boleh dijangkau WB" /></Field>
            <Field label="Rute berangkat dan pulang" htmlFor="rb-rute"><Textarea id="rb-rute" rows={3} value={a.rute} onChange={(e) => setA({ ...a, rute: e.target.value })} /></Field>
            <Field label="Akses warga sekitar" htmlFor="rb-akses" className="sm:col-span-2" hint="Siapa saja yang bisa berinteraksi di area kegiatan dan bagaimana diatur."><Textarea id="rb-akses" rows={2} value={a.akses} onChange={(e) => setA({ ...a, akses: e.target.value })} /></Field>
          </div>
        </ActionForm>
      </Bagian>
    </div>
  );
}
