import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, PageHeader, Select } from "@/components/ui/form";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { SesiTabel } from "@/components/shared/session-panels";
import { perhatianSesi, skorUrgensi } from "@/lib/domain/attention";
import { listOverview, listUpt } from "@/lib/data/overview";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rbac";

export const metadata = { title: "Dasbor" };
export const dynamic = "force-dynamic";

const URUTAN: SecurityStatus[] = ["HIJAU", "KUNING", "MERAH", "KRITIS"];

export default async function DasborPage({ searchParams }: { searchParams: Promise<{ upt?: string }> }) {
  const user = await requireUser();
  const { upt } = await searchParams;
  const luas = user.role === "administrator" || user.role === "pemantau_pusat" || user.role === "pemantau_kanwil";
  const daftarUpt = luas ? await listUpt() : [];
  const { rows, error } = await listOverview({ upt: luas && upt ? upt : undefined });

  const now = new Date();
  const aktif = rows.filter((r) => !r.ditutup_at);
  const berjalan = aktif.filter((r) => r.status_kesiapan === "Dapat Dimulai");
  const menunggu = aktif.filter((r) => r.status_kesiapan === "Menunggu").length;
  const hitung = (st: SecurityStatus) => berjalan.filter((r) => r.status_keamanan === st).length;
  const perlu = aktif.filter((r) => perhatianSesi(r, now).length > 0);
  const tlTerlambat = aktif.reduce((a, r) => a + (r.tindak_lanjut_terlambat ?? 0), 0);
  const urut = [...rows].sort((a, b) => skorUrgensi(b, now) - skorUrgensi(a, now) || (b.tanggal_sesi ?? "").localeCompare(a.tanggal_sesi ?? ""));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Dasbor"
        description={`${user.fullName} · ${ROLE_LABEL[user.role]}. Kegiatan aktif dan 14 hari terakhir pada cakupan Anda.`}
        actions={
          <>
            <RealtimeRefresh />
            {user.role === "operator" && (
              <Button asChild size="sm"><Link href="/kegiatan">Siapkan kegiatan</Link></Button>
            )}
            {user.role === "kepala_pengamanan" && (
              <Button asChild size="sm"><Link href="/keputusan">Antrean keputusan</Link></Button>
            )}
          </>
        }
      />

      {error && <Alert tone="bahaya">Data belum bisa dibaca dari database. Muat ulang halaman, atau hubungi Administrator bila berulang.</Alert>}

      {luas && daftarUpt.length > 1 && (
        <form className="flex items-center gap-2" aria-label="Pilih UPT">
          <label htmlFor="upt" className="text-sm font-medium">UPT</label>
          <Select id="upt" name="upt" defaultValue={upt ?? ""} className="w-72">
            <option value="">Semua UPT pada cakupan</option>
            {daftarUpt.map((u) => <option key={u.id} value={u.kode}>{u.nama}</option>)}
          </Select>
          <Button type="submit" variant="outline" size="sm">Terapkan</Button>
        </form>
      )}

      <section aria-label="Status keamanan kegiatan berjalan" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {URUTAN.map((st) => (
          <Card key={st}>
            <CardHeader className="pb-2"><StatusBadge status={st} className="w-fit" /></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{hitung(st)}</p>
              <p className="text-xs text-muted-foreground">kegiatan berjalan</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Ringkasan perhatian" className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-3xl font-semibold tabular-nums">{menunggu}</p><p className="text-sm text-muted-foreground">menunggu keputusan kesiapan</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-3xl font-semibold tabular-nums">{perlu.length}</p><p className="text-sm text-muted-foreground">kegiatan perlu perhatian</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-3xl font-semibold tabular-nums">{tlTerlambat}</p><p className="text-sm text-muted-foreground">tindak lanjut lewat tenggat</p></CardContent></Card>
      </section>

      <section aria-label="Daftar sesi" className="space-y-3">
        <h2 className="text-lg font-semibold">Sesi kegiatan</h2>
        <SesiTabel rows={urut} now={now} tampilkanUpt={luas} />
      </section>
    </div>
  );
}
