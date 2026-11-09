import { Activity, ClipboardCheck, WifiOff } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

const PESAN: Record<string, string> = {
  nonaktif: "Akun ini sudah dinonaktifkan. Hubungi Administrator.",
  profil: "Akun ini belum terdaftar sebagai pengguna aplikasi. Hubungi Administrator.",
};

const POIN = [
  { ikon: Activity, judul: "Status langsung", teks: "Hijau, kuning, merah, kritis. Berubah otomatis begitu hitungan WB tidak cocok." },
  { ikon: ClipboardCheck, judul: "Jejak lengkap", teks: "Kesiapan, keputusan, dan tindak lanjut tercatat dan bisa diaudit." },
  { ikon: WifiOff, judul: "Tanpa sinyal", teks: "Pengawal tetap mencatat di lokasi, terkirim saat sinyal kembali." },
];

/* Titik-titik UPT bergaya peta (posisi kira-kira sebaran nusantara), sebagian berdenyut. */
const TITIK: [number, number, string?][] = [
  [8, 22], [12, 30], [16, 36], [20, 42], [24, 50], [27, 55, "k"], [30, 58], [34, 62], [38, 63], [42, 64, "h"], [46, 65], [50, 66],
  [54, 64], [40, 40], [44, 46], [48, 38, "h"], [52, 44], [58, 40], [60, 48, "m"], [64, 52], [66, 44], [70, 50], [74, 46],
  [78, 52], [82, 48, "h"], [86, 54], [90, 50], [62, 62], [68, 64], [72, 66, "k"], [58, 34], [22, 34], [30, 46], [36, 54, "h"],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;

  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-white/[0.06] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg viewBox="0 10 100 66" className="absolute -right-[4%] top-0 w-[60%] opacity-60 [mask-image:linear-gradient(to_left,black_55%,transparent)]">
            {TITIK.map(([x, y, t], i) => (
              <g key={i}>
                {t && (
                  <circle cx={x} cy={y} r="0.6" fill={t === "h" ? "hsl(152 62% 46%)" : t === "k" ? "hsl(42 96% 56%)" : "hsl(0 82% 61%)"}>
                    <animate attributeName="r" values="0.6;3.2;0.6" dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r="0.55" fill={t ? (t === "h" ? "hsl(152 62% 46%)" : t === "k" ? "hsl(42 96% 56%)" : "hsl(0 82% 61%)") : "hsl(224 15% 45%)"} />
              </g>
            ))}
          </svg>
                  </div>

        <div className="relative flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">PAS-SIAGA Pangan</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Ditjen Pemasyarakatan</p>
          </div>
        </div>

        <div className="relative max-w-xl space-y-10">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-status-hijau text-status-hijau titik-hidup" aria-hidden />
              33 Kanwil · 611 UPT
            </p>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter xl:text-5xl">
              Kegiatan pangan di luar tembok,
              <span className="text-muted-foreground"> tetap terkendali.</span>
            </h1>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06]">
            {POIN.map(({ ikon: Ikon, judul, teks }) => (
              <li key={judul} className="flex items-start gap-4 bg-[hsl(228_18%_7%)] p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-inset ring-primary/25">
                  <Ikon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{judul}</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">{teks}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">Direktorat Pengamanan dan Intelijen · Direktorat Jenderal Pemasyarakatan</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="halaman-masuk w-full max-w-[25rem]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <div className="leading-tight">
              <p className="font-semibold">PAS-SIAGA Pangan</p>
              <p className="text-xs text-muted-foreground">Pengamanan kegiatan ketahanan pangan</p>
            </div>
          </div>
          <div className="bezel">
            <div className="kaca tepi-hidup p-6 sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">Gunakan akun yang diberikan Administrator.</p>
              {error && PESAN[error] && (
                <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-[hsl(0_90%_78%)]">
                  {PESAN[error]}
                </p>
              )}
              <LoginForm next={next} />
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">Lupa kata sandi? Hubungi Administrator.</p>
        </div>
      </section>
    </main>
  );
}
