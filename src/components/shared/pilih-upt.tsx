"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Field, Select } from "@/components/ui/form";
import type { KanwilRow, UptRow } from "@/lib/data/cakupan";

type Props = {
  kanwil: KanwilRow[];
  upt: UptRow[];
  kanwilDipilih: string;
  uptDipilih: string;
  /** Parameter alamat lain yang dipertahankan (mis. tab, periode). */
  jaga?: Record<string, string>;
  /** Tampilkan pilihan "Semua UPT" (untuk halaman rekap). Bila false, UPT wajib dipilih. */
  bolehSemua?: boolean;
};

/** Daftar UPT yang terlalu panjang dibuka hanya setelah Kanwil dipilih. */
const BATAS = 60;

/** Pemilih Kanwil lalu UPT. Setiap pilihan memuat ulang halaman dengan parameter alamat baru. */
export function PilihUpt({ kanwil, upt, kanwilDipilih, uptDipilih, jaga = {}, bolehSemua = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = React.useTransition();

  function ke(ubah: { kanwil?: string; upt?: string }) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(jaga)) if (v) sp.set(k, v);
    const n = { kanwil: kanwilDipilih, upt: uptDipilih, ...ubah };
    if (n.kanwil) sp.set("kanwil", n.kanwil);
    if (n.upt) sp.set("upt", n.upt);
    start(() => router.replace(sp.size ? `${pathname}?${sp.toString()}` : pathname, { scroll: false }));
  }

  const tampil = kanwilDipilih ? upt.filter((u) => u.kanwil_id === kanwilDipilih) : upt;
  const terkunci = !kanwilDipilih && upt.length > BATAS;

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-2" aria-busy={pending}>
      <Field label="Kanwil" htmlFor="pu-kanwil">
        <Select id="pu-kanwil" value={kanwilDipilih} onChange={(e) => ke({ kanwil: e.target.value, upt: "" })}>
          <option value="">{kanwil.length > 1 ? "Semua Kanwil" : "Kanwil Anda"}</option>
          {kanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </Select>
      </Field>
      <Field label="UPT" htmlFor="pu-upt">
        <Select id="pu-upt" value={uptDipilih} disabled={terkunci} onChange={(e) => ke({ upt: e.target.value })}>
          <option value="">{terkunci ? "Pilih Kanwil dulu" : bolehSemua ? "Semua UPT" : "Pilih UPT"}</option>
          {tampil.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}
        </Select>
      </Field>
    </div>
  );
}
