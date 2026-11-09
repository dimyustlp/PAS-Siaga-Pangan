import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Keputusan" };

export default function KeputusanPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold">Keputusan</h1>
      <Card>
        <CardHeader>
          <CardTitle>Persetujuan, verifikasi, dan penutupan</CardTitle>
          <CardDescription>
            Halaman Kepala Pengamanan untuk memutuskan kesiapan, memverifikasi gangguan, menurunkan status, dan menutup
            kegiatan. Dibangun pada Fase 3 dan 4.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
