import { Beef, Fish, Trees, Wheat } from "lucide-react";

/** Hiasan panel utama: garis kontur sawah berundak dan satu tangkai padi bergaris tipis. Vektor ringan, tanpa gambar. */
export function MotifPangan() {
  return (
    <svg viewBox="0 0 800 320" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs>
        <linearGradient id="mp-garis" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="hsl(40 70% 70%)" stopOpacity="0" />
          <stop offset="0.55" stopColor="hsl(40 70% 70%)" stopOpacity="0.28" />
          <stop offset="1" stopColor="hsl(40 70% 70%)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#mp-garis)" strokeWidth="1">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${260 + i * 18} 330 C ${420 + i * 14} ${250 - i * 16}, ${560 + i * 8} ${170 - i * 14}, 820 ${120 - i * 12}`} />
        ))}
      </g>
      <g transform="translate(688 64)" fill="none" stroke="hsl(40 70% 72%)" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round">
        <path d="M0 190 C 6 130, 10 70, 34 0" />
        {[18, 40, 62, 84, 106].map((y, i) => (
          <g key={y}>
            <path d={`M${30 - i * 5} ${y} c -14 2 -22 10 -24 20`} />
            <path d={`M${31 - i * 5} ${y + 8} c 12 -1 20 4 24 13`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

const SEKTOR = [
  { ikon: Wheat, label: "Pertanian" },
  { ikon: Trees, label: "Perkebunan" },
  { ikon: Fish, label: "Perikanan" },
  { ikon: Beef, label: "Peternakan" },
];

/** Deret empat sektor ketahanan pangan. */
export function DeretSektor({ hitung }: { hitung?: Partial<Record<string, number>> }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {SEKTOR.map(({ ikon: Ikon, label }) => (
        <li key={label} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[0.8rem] font-medium">
          <Ikon className="h-4 w-4 text-[hsl(44_90%_66%)]" aria-hidden />
          {label}
          {hitung && <span className="font-mono text-white/80">{hitung[label] ?? 0}</span>}
        </li>
      ))}
    </ul>
  );
}
