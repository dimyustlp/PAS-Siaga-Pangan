"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

/**
 * Pengganti <table> yang memberi kotak pencarian di atasnya bila barisnya lebih dari lima.
 * Penyaringan dilakukan di layar (tanpa memuat ulang), mencocokkan seluruh teks baris.
 */
export function TabelCari({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  const tabel = React.useRef<HTMLTableElement>(null);
  const [kata, setKata] = React.useState("");
  const [jumlah, setJumlah] = React.useState({ semua: 0, tampil: 0 });

  const saring = React.useCallback(() => {
    const el = tabel.current;
    if (!el) return;
    const baris = Array.from(el.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr"));
    const k = kata.trim().toLowerCase();
    let tampil = 0;
    for (const b of baris) {
      const cocok = !k || (b.textContent ?? "").toLowerCase().includes(k);
      b.style.display = cocok ? "" : "none";
      if (cocok) tampil++;
    }
    setJumlah((j) => (j.semua === baris.length && j.tampil === tampil ? j : { semua: baris.length, tampil }));
  }, [kata]);

  React.useEffect(() => {
    saring();
    const el = tabel.current;
    if (!el) return;
    const mo = new MutationObserver(() => saring());
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [saring]);

  return (
    <>
      {jumlah.semua > 5 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-white/70 px-3 py-2 print:hidden">
          <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-input bg-white px-2.5 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Cari di tabel ini…" className="w-full bg-transparent text-sm outline-none" aria-label="Cari di tabel" />
            {kata && (
              <button type="button" onClick={() => setKata("")} aria-label="Hapus pencarian" className="text-muted-foreground"><X className="h-4 w-4" aria-hidden /></button>
            )}
          </label>
          <span className="text-xs text-muted-foreground">{kata ? `${jumlah.tampil} dari ${jumlah.semua} baris` : `${jumlah.semua} baris`}</span>
        </div>
      )}
      <table ref={tabel} {...props}>{children}</table>
    </>
  );
}
