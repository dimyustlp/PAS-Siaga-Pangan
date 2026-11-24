import { Activity, ClipboardCheck, WifiOff } from "lucide-react";
import { Logo, LogoInstansi } from "@/components/layout/logo";
import { DeretSektor } from "@/components/layout/motif-pangan";
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
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.2fr_1fr]">
      <section className="bg-brand-gradient relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg viewBox="0 10 100 66" className="absolute -right-[4%] top-0 w-[62%] opacity-90 [mask-image:linear-gradient(to_left,black_55%,transparent)]">
            {TITIK.map(([x, y, t], i) => (
              <g key={i}>
                {t && (
                  <circle cx={x} cy={y} r="0.6" fill={t === "h" ? "hsl(152 62% 46%)" : t === "k" ? "hsl(42 96% 56%)" : "hsl(0 82% 61%)"}>
                    <animate attributeName="r" values="0.6;3.2;0.6" dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r="0.55" fill={t ? (t === "h" ? "hsl(152 62% 46%)" : t === "k" ? "hsl(42 96% 56%)" : "hsl(0 82% 61%)") : "hsl(0 0% 100% / 0.7)"} />
              </g>
            ))}
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <LogoInstansi />
            <span className="h-10 w-px bg-white/25" aria-hidden />
            <Logo />
          </div>
          <p className="mt-4 font-mono text-[0.68rem] font-medium uppercase leading-relaxed tracking-[0.16em] text-[#95D5B2]">
            Kementerian Imigrasi dan Pemasyarakatan
            <br />
            Direktorat Jenderal Pemasyarakatan
            <br />
            Direktorat Pengamanan dan Intelijen
          </p>
        </div>

        <div className="relative max-w-2xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
              PAS-SIAGA <span className="text-[#FBBF24]">Pangan</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[#D8F3DC]">
              Pemantauan dan pengamanan kegiatan ketahanan pangan pemasyarakatan: dari rencana kegiatan, kesiapan, pengawalan empat tahap, sampai laporan yang disahkan.
            </p>
            <DeretSektor />
          </div>
          <ul className="grid gap-3 xl:grid-cols-3">
            {POIN.map(({ ikon: Ikon, judul, teks }) => (
              <li key={judul} className="rounded-[14px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-white/[0.1] text-[#FBBF24] ring-1 ring-inset ring-white/15">
                  <Ikon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                </span>
                <span className="mt-3 block text-[0.95rem] font-semibold text-white">{judul}</span>
                <span className="mt-1 block text-[0.85rem] leading-relaxed text-[#B7E4C7]">{teks}</span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="relative flex gap-10">
          {[["Kantor wilayah", "33"], ["UPT terpantau", "611"], ["Tahap pengawalan", "4"]].map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[#95D5B2]">{k}</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex items-center justify-center bg-[#F8FAFC] px-4 py-10">
        <div className="halaman-masuk w-full max-w-[25rem]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoInstansi kecil />
            <Logo />
            <div className="leading-tight">
              <p className="font-bold">PAS-SIAGA Pangan</p>
              <p className="text-xs text-muted-foreground">Pengamanan kegiatan ketahanan pangan</p>
            </div>
          </div>
          <div className="kaca rounded-[14px] p-6 shadow-soft sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight">Masuk ke sistem</h2>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">Gunakan akun yang diberikan Pusat, Kanwil, atau Administrator.</p>
            {error && PESAN[error] && (
              <p role="alert" className="mb-4 rounded-[9px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-[hsl(0_70%_38%)]">
                {PESAN[error]}
              </p>
            )}
            <LoginForm next={next} />
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">Lupa kata sandi? Hubungi pengelola akun di Kanwil atau Pusat.</p>
          <p className="mt-2 text-center font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">Seluruh aktivitas tercatat dalam jejak audit</p>
        </div>
      </section>
    </main>
  );
}
