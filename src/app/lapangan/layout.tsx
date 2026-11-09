import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { RegisterSw } from "@/components/lapangan/register-sw";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";

export default async function LapanganLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <header className="bg-sidebar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 backdrop-blur-xl">
        <Link href="/lapangan" className="flex items-center gap-2">
          <Logo kecil />
          <span className="font-bold tracking-tight">PAS-SIAGA</span>
        </Link>
        <UserBar name={user.fullName} role={user.role} ringkas />
      </header>
      <main className="halaman-masuk flex-1 px-4 py-5">{children}</main>
      <RegisterSw />
    </div>
  );
}
