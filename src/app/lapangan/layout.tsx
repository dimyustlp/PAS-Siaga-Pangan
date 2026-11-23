import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { RegisterSw } from "@/components/lapangan/register-sw";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";
import { namaUnit } from "@/lib/data/unit";

export default async function LapanganLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unit = await namaUnit(user);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <header className="bg-upt-gradient sticky top-0 z-10 text-white shadow-[0_10px_24px_-16px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/lapangan" className="flex min-w-0 items-center gap-2">
            <Logo kecil />
            <span className="min-w-0 leading-tight">
              <span className="block font-bold tracking-tight">PAS-SIAGA <span className="text-[hsl(44_90%_66%)]">PANGAN</span></span>
              <span className="block truncate text-[0.6875rem] text-white/75">{unit ?? "Pengawal kegiatan"}</span>
            </span>
          </Link>
          <UserBar name={user.fullName} role={user.role} ringkas gelap />
        </div>
        <div className="garis-emas h-[3px]" aria-hidden />
      </header>
      <main className="halaman-masuk flex-1 px-4 py-5">{children}</main>
      <RegisterSw />
    </div>
  );
}
