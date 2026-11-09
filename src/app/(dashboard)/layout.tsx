import { ShieldCheck } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b bg-card md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <span className="font-semibold leading-tight">PAS-SIAGA Pangan</span>
        </div>
        <div className="px-3 pb-3 md:pb-6">
          <NavLinks role={user.role} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end border-b bg-card px-4 py-3 md:px-8">
          <UserBar name={user.fullName} role={user.role} />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
