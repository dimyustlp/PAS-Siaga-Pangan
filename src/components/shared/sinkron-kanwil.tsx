"use client";

import * as React from "react";

/**
 * Saat UPT dipilih pada formulir akun, Kanwil di formulir yang sama langsung diisi sesuai wilayah UPT tersebut.
 * Bekerja untuk formulir buat akun dan ubah akun (dicari lewat name="upt" dan name="kanwil").
 */
export function SinkronKanwil({ peta }: { peta: Record<string, string | null> }) {
  React.useEffect(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    const ubah = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLSelectElement) || el.name !== "upt" || !el.form) return;
      const kanwil = el.form.querySelector<HTMLSelectElement>('select[name="kanwil"]');
      const tujuan = peta[el.value];
      if (!kanwil || !tujuan || kanwil.value === tujuan) return;
      setter?.call(kanwil, tujuan);
      kanwil.dispatchEvent(new Event("change", { bubbles: true }));
    };
    document.addEventListener("change", ubah);
    return () => document.removeEventListener("change", ubah);
  }, [peta]);
  return null;
}
