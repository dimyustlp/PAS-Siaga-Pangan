import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";

export default async function LapanganLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card px-4 py-3">
        <Link href="/lapangan" className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-semibold">PAS-SIAGA</span>
        </Link>
        <UserBar name={user.fullName} role={user.role} />
      </header>
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
