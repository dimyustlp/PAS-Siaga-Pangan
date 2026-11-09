import { Activity, ClipboardCheck, ShieldCheck, WifiOff } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

const PESAN: Record<string, string> = {
  nonaktif: "Akun ini sudah dinonaktifkan. Hubungi Operator UPT.",
  profil: "Akun ini belum terdaftar sebagai pengguna aplikasi. Hubungi Operator UPT.",
};

const POIN = [
  { ikon: Activity, teks: "Status keamanan kegiatan terpantau langsung, dari hijau sampai kritis" },
  { ikon: ClipboardCheck, teks: "Kesiapan, penghitungan WB, dan tindak lanjut tercatat rapi dan bisa diaudit" },
  { ikon: WifiOff, teks: "Pengawal tetap bisa mencatat di lokasi tanpa sinyal" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="bg-brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[hsl(173_70%_50%)]/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">PAS-SIAGA Pangan</span>
        </div>
        <div className="relative max-w-lg space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Kegiatan pangan di luar tembok, tetap terkendali.</h1>
            <p className="text-white/80">Sistem pemantauan dan pengamanan kegiatan ketahanan pangan pemasyarakatan.</p>
          </div>
          <ul className="space-y-4">
            {POIN.map(({ ikon: Ikon, teks }) => (
              <li key={teks} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/15">
                  <Ikon className="h-4 w-4" aria-hidden />
                </span>
                {teks}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">Direktorat Pengamanan dan Intelijen · Direktorat Jenderal Pemasyarakatan</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="halaman-masuk w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold">PAS-SIAGA Pangan</p>
              <p className="text-xs text-muted-foreground">Pengamanan kegiatan ketahanan pangan</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight">Masuk</h2>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">Gunakan akun yang diberikan Operator UPT.</p>
            {error && PESAN[error] && (
              <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {PESAN[error]}
              </p>
            )}
            <LoginForm next={next} />
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">Lupa kata sandi? Hubungi Operator UPT.</p>
        </div>
      </section>
    </main>
  );
}
