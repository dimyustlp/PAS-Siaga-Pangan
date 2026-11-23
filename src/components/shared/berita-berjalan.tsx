"use client";

import * as React from "react";
import Link from "next/link";
import { Newspaper, Pause, Play } from "lucide-react";

export type ButirBerita = {
  kunci: string;
  judul: string;
  sumber: string | null;
  tanggal: string | null;
  href: string;
  luar: boolean;
};

/**
 * Pita berita berjalan. Berhenti saat disentuh/diarahkan kursor, dan bisa dijeda dengan tombol.
 * Pada perangkat yang meminta gerak dikurangi, pita berubah menjadi daftar yang bisa digeser manual.
 */
export function BeritaBerjalan({ butir }: { butir: ButirBerita[] }) {
  const [jeda, setJeda] = React.useState(false);
  if (butir.length === 0) return null;
  // Kecepatan baca ±70 piksel per detik; panjang pita kira-kira 9 piksel per huruf.
  const panjang = butir.reduce((n, b) => n + b.judul.length + (b.sumber?.length ?? 0) + 12, 0);
  const durasi = Math.max(40, Math.round((panjang * 9) / 70));

  const daftar = (salinan: boolean) =>
    butir.map((b) => {
      const isi = (
        <>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(41_80%_48%)]" aria-hidden />
          <span className="font-medium">{b.judul}</span>
          {(b.sumber || b.tanggal) && (
            <span className="text-xs text-muted-foreground">
              {b.sumber}
              {b.sumber && b.tanggal ? " · " : ""}
              {b.tanggal}
            </span>
          )}
        </>
      );
      const kelas = "inline-flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded";
      return (
        <li key={(salinan ? "b-" : "a-") + b.kunci} aria-hidden={salinan || undefined}>
          {b.luar ? (
            <a href={b.href} target="_blank" rel="noopener noreferrer" className={kelas} tabIndex={salinan ? -1 : undefined}>{isi}</a>
          ) : (
            <Link href={b.href} className={kelas} tabIndex={salinan ? -1 : undefined}>{isi}</Link>
          )}
        </li>
      );
    });

  return (
    <section aria-label="Berita ketahanan pangan Pemasyarakatan" className="flex items-stretch overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
      <Link
        href="/berita"
        className="flex shrink-0 items-center gap-2 bg-[hsl(var(--primary))] px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground sm:px-4"
      >
        <Newspaper className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Berita pangan</span>
      </Link>
      <div className="pita-berita relative min-w-0 flex-1 overflow-hidden" data-jeda={jeda ? "1" : "0"} style={{ "--durasi": `${durasi}s` } as React.CSSProperties}>
        <ul className="pita-berita-isi">
          {daftar(false)}
          {daftar(true)}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setJeda((j) => !j)}
        className="flex w-10 shrink-0 items-center justify-center border-l border-border/70 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={jeda ? "Jalankan berita" : "Hentikan berita"}
        aria-pressed={jeda}
      >
        {jeda ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
      </button>
    </section>
  );
}
