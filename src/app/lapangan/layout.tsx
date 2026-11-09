import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { RegisterSw } from "@/components/lapangan/register-sw";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";

export default async function LapanganLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-sidebar px-4 py-3 text-white shadow-md">
        <Link href="/lapangan" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(173_66%_40%)] to-[hsl(205_70%_45%)]"><ShieldCheck className="h-4 w-4 text-white" aria-hidden /></span>
          <span className="font-bold tracking-tight">PAS-SIAGA</span>
        </Link>
        <UserBar name={user.fullName} role={user.role} gelap />
      </header>
      <main className="halaman-masuk flex-1 px-4 py-5">{children}</main>
      <RegisterSw />
    </div>
  );
}
