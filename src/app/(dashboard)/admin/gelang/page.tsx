import { headers } from "next/headers";
import { KunciGelang } from "@/components/shared/kunci-gelang";
import { TautanGelang } from "@/components/shared/tautan-gelang";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader, Pill } from "@/components/ui/form";
import { fmtWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Penerima gelang" };
export const dynamic = "force-dynamic";

export default async function AdminGelangPage() {
  const supabase = await createClient();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const alamat = `${proto}://${host}/api/gelang/alarm`;

  const { data: diatur, error } = await supabase.rpc("admin_status_kunci_gelang");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Penerima gelang" description="Pengaturan penerima alarm dari sistem pemantauan gelang." actions={<TautanGelang />} />
      {error && <Alert tone="bahaya">Status kunci belum bisa dibaca. Muat ulang halaman.</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Alamat penerima</CardTitle>
          <CardDescription>Alamat ini yang dipanggil sistem gelang saat alarm terjadi.</CardDescription>
        </CardHeader>
        <CardContent><code className="block break-all rounded-lg bg-secondary px-3 py-2 font-mono text-xs">{alamat}</code></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Kunci rahasia {diatur ? <Pill tone="hijau">Sudah dibuat</Pill> : <Pill tone="kuning">Belum dibuat</Pill>}</CardTitle>
          <CardDescription>{diatur ? `Terakhir diatur ${fmtWaktu(diatur)}.` : "Tanpa kunci, alarm dari luar ditolak."} Database hanya menyimpan sidik jarinya, jadi kunci tidak bisa dilihat lagi setelah layar ini ditutup.</CardDescription>
        </CardHeader>
        <CardContent><KunciGelang sudahAda={!!diatur} alamat={alamat} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cara memasang di sistem gelang</CardTitle></CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Buat kunci di atas, lalu salin alamat lengkapnya.</li>
            <li>Di sistem gelang, buka menu Notifikasi, buat notifikasi baru untuk jenis kejadian yang perlu dikonfirmasi (keluar zona, perangkat dilepas atau dirusak, baterai lemah, sinyal terputus).</li>
            <li>Pada tindakan notifikasi pilih &quot;Kirim permintaan ke URL&quot; (metode GET), lalu tempel alamat lengkap tadi.</li>
            <li>Ganti {"{unit}"}, {"{jenis}"}, {"{waktu}"}, dan {"{lokasi}"} dengan variabel bawaan sistem gelang untuk nama unit, teks atau jenis alarm, waktu kejadian, dan lokasi.</li>
            <li>Pastikan nama unit diawali kode dan garis bawah, mis. 0834_M Hendi F. Lalu daftarkan kodenya di menu Gelang bagian Pemetaan unit gelang.</li>
            <li>Uji dengan satu unit. Alarm yang masuk akan muncul di menu Gelang dan menunggu konfirmasi.</li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Jangan membagikan kunci atau akun sistem gelang lewat chat atau surel. Bila kunci bocor, buat kunci baru dan ganti di notifikasi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
