import Link from "next/link";
import { BellRing, CheckCircle2 } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { TautanGelang } from "@/components/shared/tautan-gelang";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { hapusUnitGelang, konfirmasiAlarm, simpanUnitGelang } from "@/lib/actions/gelang";
import { requireUser } from "@/lib/auth";
import { fmtWaktu, sejak } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Gelang" };
export const dynamic = "force-dynamic";

export default async function GelangPage() {
  const supabase = await createClient();
  const [user, menunggu, riwayat, unit, upt] = await Promise.all([
    requireUser(),
    supabase.from("v_gelang_alarm").select("*").eq("status", "Menunggu").order("waktu", { ascending: false }).limit(200),
    supabase.from("v_gelang_alarm").select("*").neq("status", "Menunggu").order("waktu", { ascending: false }).limit(50),
    supabase.from("gelang_unit").select("*").order("kode_unit").limit(1000),
    supabase.from("master_upt").select("kode,nama").order("nama"),
  ]);
  const daftarMenunggu = menunggu.data ?? [];
  const daftarRiwayat = riwayat.data ?? [];
  const daftarUnit = unit.data ?? [];
  const daftarUpt = upt.data ?? [];
  const bisaAtur = user.role === "administrator" || user.role === "operator";
  const bisaLihatSesi = user.role !== "pengawal";
  const namaUpt = (kode: string) => daftarUpt.find((u) => u.kode === kode)?.nama ?? kode;

  const idWb = [...new Set(daftarUnit.map((u) => u.inmate_id).filter((x): x is string => !!x))];
  const wb = idWb.length ? (await supabase.from("master_inmates").select("id,nama,nomor_registrasi").in("id", idWb)).data ?? [] : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Gelang"
        description="Alarm dari sistem pemantauan gelang. Setiap alarm dikonfirmasi langsung dengan petugas di lokasi sebelum ditutup."
        actions={<><RealtimeRefresh tabel={["gelang_alarm"]} /><TautanGelang /></>}
      />
      {(menunggu.error || riwayat.error) && <Alert tone="bahaya">Alarm belum bisa dibaca. Muat ulang halaman.</Alert>}

      <section aria-label="Alarm menunggu konfirmasi" className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><BellRing className="h-5 w-5 text-status-merah" aria-hidden />Menunggu konfirmasi <span className="text-muted-foreground">({daftarMenunggu.length})</span></h2>
        {daftarMenunggu.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada alarm yang menunggu.</p>}
        {daftarMenunggu.map((a) => (
          <Card key={a.id} className="border-status-merah/40">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{a.jenis}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.wb_nama ?? a.unit_nama}{a.nomor_registrasi ? ` · ${a.nomor_registrasi}` : ""} · {a.upt_nama ?? "UPT belum terpetakan"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtWaktu(a.waktu)} ({sejak(a.waktu)}){a.lokasi ? ` · ${a.lokasi}` : ""}{a.baterai ? ` · baterai ${a.baterai}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!a.session_id && <Pill tone="kuning">Tanpa sesi aktif</Pill>}
                  {a.session_id && bisaLihatSesi && <Link href={`/sesi/${a.session_id}`} className="text-sm font-semibold text-brand hover:underline">{a.kode_kegiatan ?? "Lihat sesi"}</Link>}
                </div>
              </div>
              <ActionForm action={konfirmasiAlarm} submit="Simpan konfirmasi" fields={{ id: { v: a.id }, status: { s: "status" }, tindakan: { s: "tindakan" } }} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                <Field label="Hasil" htmlFor={`s-${a.id}`}>
                  <Select id={`s-${a.id}`} name="status" defaultValue="Dikonfirmasi"><option>Dikonfirmasi</option><option>Bukan gangguan</option></Select>
                </Field>
                <Field label="Hasil konfirmasi dengan petugas" htmlFor={`t-${a.id}`}>
                  <Input id={`t-${a.id}`} name="tindakan" required minLength={3} maxLength={1000} placeholder="Mis. Petugas Pos 2 sudah dihubungi, WB di tempat" />
                </Field>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle>Riwayat terakhir</CardTitle><CardDescription>50 alarm terakhir yang sudah dikonfirmasi.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {daftarRiwayat.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-3">Waktu</th><th className="py-2 pr-3">Alarm</th><th className="py-2 pr-3">Unit / WB</th><th className="py-2 pr-3">Hasil</th><th className="py-2">Keterangan</th></tr></thead>
              <tbody className="divide-y">
                {daftarRiwayat.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs">{fmtWaktu(a.waktu)}</td>
                    <td className="py-2 pr-3">{a.jenis}</td>
                    <td className="py-2 pr-3">{a.wb_nama ?? a.unit_nama}</td>
                    <td className="py-2 pr-3"><Pill tone={a.status === "Dikonfirmasi" ? "merah" : "netral"}>{a.status}</Pill></td>
                    <td className="py-2 text-xs text-muted-foreground">{a.tindakan}{a.dikonfirmasi_nama ? ` (${a.dikonfirmasi_nama})` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {bisaAtur && (
        <Card>
          <CardHeader>
            <CardTitle>Pemetaan unit gelang</CardTitle>
            <CardDescription>
              Nama unit di sistem gelang diawali kode, mis. &quot;0834_M Hendi F&quot; berarti kode 0834. Alarm hanya bisa masuk ke UPT bila kodenya terdaftar di sini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ActionForm
              action={simpanUnitGelang}
              submit="Simpan unit"
              fields={{ kode_upt: { s: "kode_upt" }, teks: { s: "teks" } }}
              success="Unit tersimpan."
              className="space-y-3"
            >
              <Field label="UPT" htmlFor="g-upt">
                <Select id="g-upt" name="kode_upt" required defaultValue={user.role === "administrator" ? "" : (user.kodeUpt ?? "")}>
                  {user.role === "administrator" && <option value="">Pilih UPT</option>}
                  {(user.role === "administrator" ? daftarUpt : daftarUpt.filter((u) => u.kode === user.kodeUpt)).map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}
                </Select>
              </Field>
              <Field label="Daftar unit" htmlFor="g-teks" hint="Satu baris per unit: kode, nama (opsional), nomor registrasi WB (opsional). Pisahkan dengan koma. Contoh: 0834, M Hendi F, AII-123/2024">
                <Textarea id="g-teks" name="teks" required rows={5} placeholder={"0834, M Hendi F, AII-123/2024\n0835, Budi S"} />
              </Field>
            </ActionForm>

            <div className="overflow-x-auto">
              {daftarUnit.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada unit terdaftar.</p>
              ) : (
                <table className="w-full min-w-[34rem] text-sm">
                  <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-3">Kode</th><th className="py-2 pr-3">Nama unit</th><th className="py-2 pr-3">WB</th><th className="py-2 pr-3">UPT</th><th className="py-2" /></tr></thead>
                  <tbody className="divide-y">
                    {daftarUnit.map((u) => {
                      const w = wb.find((x) => x.id === u.inmate_id);
                      return (
                        <tr key={u.id}>
                          <td className="py-2 pr-3 font-mono text-xs">{u.kode_unit}</td>
                          <td className="py-2 pr-3">{u.nama_unit ?? "-"}</td>
                          <td className="py-2 pr-3">{w ? `${w.nama} (${w.nomor_registrasi})` : "-"}</td>
                          <td className="py-2 pr-3">{namaUpt(u.kode_upt)}</td>
                          <td className="py-2 text-right"><ActionButton action={hapusUnitGelang} input={{ id: u.id }} label="Hapus" variant="destructive" confirm="Hapus unit ini dari pemetaan?" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Sistem ini hanya menerima alarm. Posisi WB tidak dipantau terus-menerus di sini.</p>
    </div>
  );
}
