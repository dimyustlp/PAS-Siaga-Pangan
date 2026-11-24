import { Beef, Fish, Trees, Wheat } from "lucide-react";

/** Hiasan panel utama: cincin radar kuningan dengan sapuan pelan. Vektor ringan, tanpa gambar. */
export function MotifPangan() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="pointer-events-none absolute -right-20 top-1/2 h-[150%] -translate-y-1/2 [mask-image:linear-gradient(to_left,black_25%,transparent_92%)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="mp-sapu" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D97706" stopOpacity="0" />
          <stop offset="1" stopColor="#FBBF24" stopOpacity="0.32" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#D97706" strokeWidth="1">
        {[56, 100, 144, 188].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} strokeOpacity={0.26 - r / 1200} />
        ))}
        <path d="M200 4V396M4 200H396" strokeOpacity="0.14" />
      </g>
      <path d="M200 200 L388 200 A188 188 0 0 0 351 88 Z" fill="url(#mp-sapu)">
        <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="14s" repeatCount="indefinite" />
      </path>
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
        <li key={label} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-3 py-1.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.06em]">
          <Ikon className="h-4 w-4 text-[#FBBF24]" aria-hidden />
          {label}
          {hitung && <span className="font-mono text-white/80">{hitung[label] ?? 0}</span>}
        </li>
      ))}
    </ul>
  );
}
