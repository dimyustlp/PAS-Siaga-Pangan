"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Nilai = { kanwil: string; upt: string; kategori: string; q: string };

type Props = {
  kanwil: { id: string; nama: string }[];
  upt: { kode: string; nama: string; kanwil_id: string | null }[];
  kategori: readonly string[];
  nilai: Nilai;
  /** Ada UPT tanpa Kanwil pada cakupan. */
  adaTanpaKanwil: boolean;
};

/** Daftar UPT yang terlalu panjang dibuka hanya setelah Kanwil dipilih. */
const BATAS_DAFTAR_UPT = 60;

/** Saringan bertingkat: Kanwil dulu, lalu UPT di dalamnya. Setiap pilihan langsung memuat ulang halaman. */
export function SaringBerkas({ kanwil, upt, kategori, nilai, adaTanpaKanwil }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [kata, setKata] = React.useState(nilai.q);
  const [pending, start] = React.useTransition();

  React.useEffect(() => setKata(nilai.q), [nilai.q]);

  function ke(ubah: Partial<Nilai>) {
    const n = { ...nilai, q: kata.trim(), ...ubah };
    const sp = new URLSearchParams();
    (["kanwil", "upt", "kategori", "q"] as const).forEach((k) => {
      if (n[k]) sp.set(k, n[k]);
    });
    const tujuan = sp.size ? `${pathname}?${sp.toString()}` : pathname;
    start(() => router.replace(tujuan, { scroll: false }));
  }

  const uptTampil = nilai.kanwil
    ? upt.filter((u) => (nilai.kanwil === "tanpa" ? !u.kanwil_id : u.kanwil_id === nilai.kanwil))
    : upt;
  const uptTerkunci = !nilai.kanwil && upt.length > BATAS_DAFTAR_UPT;
  const adaSaringan = Boolean(nilai.kanwil || nilai.upt || nilai.kategori || nilai.q);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ke({});
      }}
      className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.8fr_1fr_auto]"
      aria-label="Pilih Kanwil dan UPT"
      aria-busy={pending}
    >
      <Field label="Kanwil" htmlFor="f-kanwil">
        <Select id="f-kanwil" value={nilai.kanwil} onChange={(e) => ke({ kanwil: e.target.value, upt: "" })}>
          <option value="">{kanwil.length > 1 ? "Semua Kanwil" : "Kanwil Anda"}</option>
          {kanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          {adaTanpaKanwil && <option value="tanpa">Tanpa Kanwil</option>}
        </Select>
      </Field>
      <Field label="UPT" htmlFor="f-upt">
        <Select id="f-upt" value={nilai.upt} disabled={uptTerkunci} onChange={(e) => ke({ upt: e.target.value })}>
          <option value="">{uptTerkunci ? "Pilih Kanwil dulu" : "Semua UPT"}</option>
          {uptTampil.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}
        </Select>
      </Field>
      <Field label="Kategori" htmlFor="f-kat">
        <Select id="f-kat" value={nilai.kategori} onChange={(e) => ke({ kategori: e.target.value })}>
          <option value="">Semua</option>
          {kategori.map((k) => <option key={k}>{k}</option>)}
        </Select>
      </Field>
      <Field label="Kata kunci" htmlFor="f-q">
        <Input id="f-q" value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Judul atau nama berkas" />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit" variant="outline" disabled={pending}><Search className="h-4 w-4" aria-hidden />Cari</Button>
        {adaSaringan && (
          <Button asChild variant="ghost" size="sm" className="w-9 px-0" title="Atur ulang saringan">
            <Link href={pathname} scroll={false}><X className="h-4 w-4" aria-hidden /><span className="sr-only">Atur ulang saringan</span></Link>
          </Button>
        )}
      </div>
    </form>
  );
}
