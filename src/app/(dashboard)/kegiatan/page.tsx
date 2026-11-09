import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Kegiatan" };

export default function KegiatanPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold">Kegiatan</h1>
      <Card>
        <CardHeader>
          <CardTitle>Rencana kegiatan dan sesi harian</CardTitle>
          <CardDescription>
            Halaman Operator untuk mendaftarkan lokasi, warga binaan, kegiatan, dan sesi harian. Dibangun pada Fase 3 dan 4.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
