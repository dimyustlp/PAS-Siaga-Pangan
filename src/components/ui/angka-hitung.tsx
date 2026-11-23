"use client";

import * as React from "react";

/** Angka yang naik halus dari 0 saat pertama tampil. Tanpa pustaka tambahan; dilewati bila pengguna memilih gerak dikurangi. */
export function AngkaHitung({ nilai, durasi = 900 }: { nilai: number; durasi?: number }) {
  const [tampil, setTampil] = React.useState(nilai);
  React.useEffect(() => {
    if (nilai === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTampil(nilai);
      return;
    }
    let raf = 0;
    const mulai = performance.now();
    const langkah = (t: number) => {
      const p = Math.min(1, (t - mulai) / durasi);
      setTampil(Math.round(nilai * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(langkah);
    };
    setTampil(0);
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [nilai, durasi]);
  return <span className="angka-hitung">{tampil.toLocaleString("id-ID")}</span>;
}
