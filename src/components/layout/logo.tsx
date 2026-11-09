/** Lambang PAS-SIAGA: perisai bergaris dengan titik pantau. Gambar vektor sendiri, tanpa berkas luar. */
export function Logo({ kecil = false }: { kecil?: boolean }) {
  const ukuran = kecil ? "h-8 w-8" : "h-10 w-10";
  return (
    <span className={`relative flex ${ukuran} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(224_90%_60%)] to-[hsl(262_80%_62%)] ring-1 ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_18px_-8px_hsl(240_80%_50%/0.7)]`}>
      <svg viewBox="0 0 24 24" className={kecil ? "h-4 w-4" : "h-5 w-5"} fill="none" aria-hidden>
        <path d="M12 2.8 4.5 5.6v5.6c0 4.6 3.1 8.4 7.5 10 4.4-1.6 7.5-5.4 7.5-10V5.6L12 2.8Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8.5 12.2h7M12 8.6v7.2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary text-primary titik-hidup" aria-hidden />
    </span>
  );
}
