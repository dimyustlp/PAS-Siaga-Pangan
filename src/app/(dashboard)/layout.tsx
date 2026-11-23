import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/lib/auth";
import { namaUnit } from "@/lib/data/unit";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: pengaturan }, unit] = await Promise.all([
    supabase.from("pengaturan_aplikasi").select("mode_latihan").maybeSingle(),
    namaUnit(user),
  ]);
  const latihan = pengaturan?.mode_latihan === true;

  return (
    <div className="min-h-[100dvh] print:block">
      <SiteHeader name={user.fullName} role={user.role} unit={unit} />
      <div className="flex min-h-[100dvh] flex-col lg:pl-[248px] print:block print:pl-0">
      <main className="halaman-masuk mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 md:py-8 print:max-w-none print:p-0">
        {latihan && (
          <div role="status" className="mb-5 rounded-xl border border-status-kuning/50 bg-status-kuning/15 px-4 py-2.5 text-sm font-medium text-[hsl(32_90%_26%)] print:hidden">
            MODE LATIHAN. Kegiatan yang dibuat sekarang ditandai latihan, tidak dihitung pada evaluasi, dan pesan Telegram diberi label LATIHAN.
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
