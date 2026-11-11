import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { UserBar } from "@/components/layout/user-bar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: pengaturan } = await supabase.from("pengaturan_aplikasi").select("mode_latihan").maybeSingle();
  const latihan = pengaturan?.mode_latihan === true;

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[17rem_1fr] print:block">
      <aside className="sticky top-0 z-30 md:h-[100dvh] md:p-3 print:hidden">
        <div className="bg-sidebar flex h-full flex-col border-b border-ink/[0.06] backdrop-blur-xl md:rounded-[1.6rem] md:border md:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_60px_-34px_hsl(224_70%_40%/0.35)]">
          <div className="flex items-center gap-3 px-4 py-3 md:px-5 md:pb-5 md:pt-6">
            <Logo />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight">PAS-SIAGA</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Pangan</p>
            </div>
            <div className="ml-auto md:hidden">
              <UserBar name={user.fullName} role={user.role} ringkas />
            </div>
          </div>
          <p className="hidden px-6 pb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70 md:block">Menu</p>
          <div className="px-3 pb-3 md:flex-1 md:overflow-y-auto md:pb-4">
            <NavLinks role={user.role} />
          </div>
          <div className="hidden border-t border-ink/[0.06] p-3 md:block">
            <UserBar name={user.fullName} role={user.role} />
          </div>
        </div>
      </aside>
      <main className="halaman-masuk min-w-0 px-4 py-6 md:px-8 md:py-8 print:p-0">
        {latihan && (
          <div role="status" className="mx-auto mb-5 max-w-5xl rounded-xl border border-status-kuning/50 bg-status-kuning/15 px-4 py-2.5 text-sm font-medium text-[hsl(32_90%_26%)] print:hidden">
            MODE LATIHAN. Kegiatan yang dibuat sekarang ditandai latihan, tidak dihitung pada evaluasi, dan pesan Telegram diberi label LATIHAN.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
