import { ShieldCheck } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr] print:block">
      <aside className="bg-sidebar text-white md:sticky md:top-0 md:h-screen md:overflow-y-auto print:hidden">
        <div className="flex items-center gap-3 px-4 py-4 md:px-5 md:py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(173_66%_40%)] to-[hsl(205_70%_45%)] shadow-lg shadow-black/30">
            <ShieldCheck className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div className="leading-tight">
            <p className="font-bold tracking-tight">PAS-SIAGA</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Pangan</p>
          </div>
        </div>
        <div className="px-3 pb-3 md:pb-6">
          <NavLinks role={user.role} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-end border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur md:px-8 print:hidden">
          <UserBar name={user.fullName} role={user.role} />
        </header>
        <main className="halaman-masuk flex-1 px-4 py-6 md:px-8 md:py-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
