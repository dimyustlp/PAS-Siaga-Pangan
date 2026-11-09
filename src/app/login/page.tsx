import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

const PESAN: Record<string, string> = {
  nonaktif: "Akun ini sudah dinonaktifkan. Hubungi Operator UPT.",
  profil: "Akun ini belum terdaftar sebagai pengguna aplikasi. Hubungi Operator UPT.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-xl font-semibold">PAS-SIAGA Pangan</h1>
            <p className="text-sm text-muted-foreground">Pengamanan kegiatan ketahanan pangan</p>
          </div>
        </div>
        {error && PESAN[error] && (
          <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {PESAN[error]}
          </p>
        )}
        <LoginForm next={next} />
        <p className="mt-6 text-xs text-muted-foreground">
          Akun dibuat oleh Operator UPT. Lupa kata sandi? Hubungi Operator.
        </p>
      </div>
    </main>
  );
}
