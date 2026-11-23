import { HardDrive } from "lucide-react";
import { ActionForm } from "@/components/shared/action-form";
import { SalinKode } from "@/components/shared/salin-kode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { aturDrive } from "@/lib/actions/tahap";
import { kodeAppsScript } from "@/lib/domain/apps-script";
import { fmtUkuran } from "@/lib/domain/tahap";
import { fmtWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Google Drive & batas unggah" };
export const dynamic = "force-dynamic";

const KUOTA_GB = 200;

export default async function DrivePage() {
  const supabase = await createClient();
  const [set, kunci, pakai] = await Promise.all([
    supabase.from("pengaturan_aplikasi").select("drive_url,drive_aktif,drive_diatur_at,batas_foto_mb,batas_berkas_mb").maybeSingle(),
    supabase.rpc("admin_drive_kunci"),
    supabase.rpc("pemakaian_lampiran"),
  ]);
  const s = set.data;
  const p = (pakai.data ?? {}) as { jumlah?: number; byte?: number; drive_byte?: number; supabase_byte?: number };
  const persen = ((p.drive_byte ?? 0) / (KUOTA_GB * 1024 ** 3)) * 100;
  const kode = typeof kunci.data === "string" ? kodeAppsScript(kunci.data) : null;

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      <PageHeader title="Google Drive & batas unggah" description="Foto dan berkas tahap pengawalan disimpan di Google Drive instansi dan dicatat di Google Sheet (bisa diunduh sebagai Excel). Sebelum Drive terhubung, berkas disimpan sementara di server aplikasi." />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={HardDrive} nada={s?.drive_aktif ? "hijau" : "kuning"} nilai={s?.drive_aktif ? "Aktif" : "Belum"} label="Google Drive" />
        <StatCard icon={HardDrive} nada="biru" nilai={fmtUkuran(p.drive_byte ?? 0)} label={`terpakai di Drive (${persen.toFixed(2)}% dari ${KUOTA_GB} GB)`} />
        <StatCard icon={HardDrive} nada="teal" nilai={p.jumlah ?? 0} label={`lampiran tercatat · server aplikasi ${fmtUkuran(p.supabase_byte ?? 0)}`} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Batas unggahan</CardTitle>
          <CardDescription>
            Saran: foto 5 MB (HP sudah memperkecil foto otomatis menjadi sekitar 0,5–1,5 MB) dan berkas PDF 10 MB. Dengan 200 GB, perkiraan muat sekitar
            10.000–15.000 kegiatan (rata-rata 13–20 MB per kegiatan untuk 4 tahap).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={aturDrive} submit="Simpan pengaturan" resetOnSuccess={false} build={undefined} fields={{ url: { s: "url" }, aktif: { b: "aktif" }, batas_foto: { n: "foto" }, batas_berkas: { n: "berkas" } }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Batas foto (MB)" htmlFor="foto"><Input id="foto" name="foto" type="number" min={1} max={20} defaultValue={s?.batas_foto_mb ?? 5} /></Field>
              <Field label="Batas berkas PDF (MB)" htmlFor="berkas"><Input id="berkas" name="berkas" type="number" min={1} max={40} defaultValue={s?.batas_berkas_mb ?? 10} /></Field>
              <Field label="Alamat aplikasi web Apps Script" htmlFor="url" hint="Bentuknya https://script.google.com/macros/s/…/exec" className="sm:col-span-2"><Input id="url" name="url" defaultValue={s?.drive_url ?? ""} placeholder="https://script.google.com/macros/s/AKfy…/exec" /></Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="aktif" defaultChecked={!!s?.drive_aktif} className="h-4 w-4" />Simpan lampiran ke Google Drive</label>
            </div>
          </ActionForm>
          {s?.drive_diatur_at && <p className="mt-3 text-xs text-muted-foreground">Terakhir diatur {fmtWaktu(s.drive_diatur_at)}.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menghubungkan Google Drive <Pill tone={s?.drive_aktif ? "hijau" : "kuning"} className="ml-2">{s?.drive_aktif ? "Terhubung" : "Belum terhubung"}</Pill></CardTitle>
          <CardDescription>Dilakukan sekali saja, memakai akun Google yang punya ruang 200 GB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Buka <a href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">script.google.com</a> dengan akun Google tersebut. Halaman proyek baru akan terbuka.</li>
            <li>Hapus tulisan yang ada, lalu tempel kode di bawah (tekan tombol <b>Salin kode</b> dulu). Kunci rahasia sudah terisi di dalamnya.</li>
            <li>Tekan <b>Simpan</b>, lalu tekan <b>Jalankan</b> sekali dan izinkan akses Google Drive saat diminta. Folder &quot;PAS-SIAGA Pangan - Lampiran Kegiatan&quot; dan Google Sheet rekap dibuat otomatis.</li>
            <li>Tekan <b>Terapkan → Deployment baru</b>, pilih jenis <b>Aplikasi web</b>, isi &quot;Jalankan sebagai: Saya&quot; dan &quot;Yang memiliki akses: Siapa saja&quot;, lalu <b>Terapkan</b>.</li>
            <li>Salin alamat aplikasi web yang muncul, tempel di kolom alamat di atas, centang &quot;Simpan lampiran ke Google Drive&quot;, lalu Simpan. Aplikasi akan menguji sambungannya.</li>
          </ol>
          <Alert tone="info">Berkas di Drive tetap privat milik akun tersebut. Pengguna aplikasi melihatnya melalui PAS-SIAGA Pangan sesuai haknya. Rekap Excel: buka Google Sheet &quot;Rekap Unggahan PAS-SIAGA Pangan&quot; → File → Download → Microsoft Excel.</Alert>
          {kode ? <SalinKode kode={kode} /> : <Alert tone="bahaya">Kunci belum bisa dibuat. Muat ulang halaman.</Alert>}
        </CardContent>
      </Card>
    </div>
  );
}
