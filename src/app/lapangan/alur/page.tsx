import { AlurKerja } from "@/components/shared/alur-kerja";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Alur kerja" };

export default async function AlurPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alur kerja Pengawal</h1>
        <p className="text-sm text-muted-foreground">Urutan tugas dari menerima penugasan sampai laporan kegiatan. Untuk mulai bekerja, buka menu Tugas saya.</p>
      </div>
      <AlurKerja role={user.role} />
    </div>
  );
}
