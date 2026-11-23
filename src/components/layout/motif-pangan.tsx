import { Beef, Fish, Trees, Wheat } from "lucide-react";

/** Hiasan panel utama: matahari pagi, sawah berundak, dan bulir padi. Gambar vektor sendiri. */
export function MotifPangan() {
  return (
    <svg viewBox="0 0 600 220" className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full opacity-80" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="mp-sawah" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="hsl(140 50% 55%)" stopOpacity="0.35" />
          <stop offset="1" stopColor="hsl(150 60% 30%)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="505" cy="70" r="34" fill="hsl(44 95% 62%)" opacity="0.35" />
      <circle cx="505" cy="70" r="20" fill="hsl(44 95% 66%)" opacity="0.45" />
      <path d="M0 150 C120 120 220 140 320 125 S520 100 600 118 V220 H0Z" fill="url(#mp-sawah)" />
      <path d="M0 175 C140 150 260 168 380 152 S540 140 600 150 V220 H0Z" fill="hsl(150 55% 28%)" opacity="0.35" />
      <g stroke="hsl(44 90% 70%)" strokeOpacity="0.35" strokeWidth="1.2" fill="none">
        <path d="M0 192 C150 170 300 186 600 166" />
        <path d="M0 205 C160 186 320 200 600 182" />
      </g>
      <g stroke="hsl(44 90% 70%)" strokeOpacity="0.55" strokeWidth="1.4" fill="none" strokeLinecap="round">
        {[470, 500, 530, 560].map((x, i) => (
          <g key={x} transform={`translate(${x} ${168 - (i % 3) * 6})`}>
            <path d="M0 40 C2 26 2 14 0 0" />
            <path d="M0 8 c-6 -1 -9 -5 -9 -9 4 0 8 3 9 9z M0 16 c6 -1 9 -5 9 -9 -4 0 -8 3 -9 9z M0 24 c-6 -1 -9 -5 -9 -9 4 0 8 3 9 9z" fill="hsl(44 90% 70%)" fillOpacity="0.4" />
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
        <li key={label} className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
          <Ikon className="h-4 w-4 text-[hsl(44_90%_66%)]" aria-hidden />
          {label}
          {hitung && <span className="font-mono text-white/80">{hitung[label] ?? 0}</span>}
        </li>
      ))}
    </ul>
  );
}
