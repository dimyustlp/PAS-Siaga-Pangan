import Link from "next/link";
import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { buatPenilaian } from "@/lib/actions/penilaian";
import { requireUser } from "@/lib/auth";
import { CATATAN_KATEGORI, hitungPenilaian, type BarisSkor } from "@/lib/domain/penilaian";
import { fmtTanggal, hariIniWib, tambahHari } from "@/lib/format";
import { longgar } from "@/lib/supabase/longgar";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Penilaian pelaksanaan" };
export const dynamic = "force-dynamic";

const TONE = { Kurang: "merah", Cukup: "kuning", Baik: "biru", "Sangat Baik": "hijau" } as const;

export default async function PenilaianPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const db = longgar(supabase);
  const bisaBuat = ["administrator", "operator", "kepala_pengamanan"].includes(user.role);

  const [daftar, upt, keg] = await Promise.all([
    db.from("penilaian_evaluasi").select("*").order("tanggal_penilaian", { ascending: false }).limit(100),
    bisaBuat && user.role === "administrator" ? supabase.from("master_upt").select("kode,nama").order("nama") : Promise.resolve({ data: null }),
    bisaBuat ? supabase.from("activities").select("id,kode_kegiatan,jenis_kegiatan,kode_upt").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: null }),
  ]);
  const rows = (daftar.data ?? []) as Record<string, unknown>[];
  const ids = rows.map((r) => String(r.id));
  const skor = ids.length ? await db.from("penilaian_skor").select("penilaian_id,no,skor,tb").in("penilaian_id", ids) : { data: [] };
  const per = new Map<string, BarisSkor[]>();
  for (const s of (skor.data ?? []) as { penilaian_id: string; no: number; skor: 0 | 1 | 2 | null; tb: boolean }[]) {
    (per.get(s.penilaian_id) ?? per.set(s.penilaian_id, []).get(s.penilaian_id)!).push({ no: s.no, skor: s.skor, tb: s.tb });
  }
  const sampai = hariIniWib();
  const dari = tambahHari(sampai, -30);
  const kegiatan = (keg.data ?? []).filter((k) => user.role === "administrator" || k.kode_upt === user.kodeUpt);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader title="Penilaian pelaksanaan pengamanan" description="Penilaian 19 indikator menurut pedoman. Sebagian skor diisi otomatis dari data aplikasi sebagai saran, lalu penilai memeriksa dan memutuskan skor akhirnya." />
      <Alert>{CATATAN_KATEGORI}</Alert>

      {bisaBuat && (
        <Card>
          <CardHeader><CardTitle>Buat penilaian baru</CardTitle><CardDescription>Setelah dibuat, skor saran terisi dari sesi yang tercatat pada periode yang dipilih. Penilai tetap dapat mengubah setiap skor.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm
              action={buatPenilaian}
              submit="Buat penilaian"
              className="grid gap-3 sm:grid-cols-2"
              fields={{ kode_upt: { s: "kode_upt" }, activity_id: { s: "activity_id" }, kegiatan_lokasi: { s: "kegiatan_lokasi" }, periode_dari: { s: "periode_dari" }, periode_sampai: { s: "periode_sampai" }, tanggal_penilaian: { s: "tanggal_penilaian" }, penilai_nama: { s: "penilai_nama" }, penilai_jabatan: { s: "penilai_jabatan" }, penanggung_jawab: { s: "penanggung_jawab" }, sertakan_latihan: { b: "sertakan_latihan" } }}
            >
              {user.role === "administrator" ? (
                <Field label="UPT" htmlFor="u"><Select id="u" name="kode_upt" defaultValue="">{<option value="">Pilih UPT</option>}{(upt.data ?? []).map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select></Field>
              ) : (
                <input type="hidden" name="kode_upt" value={user.kodeUpt ?? ""} />
              )}
              <Field label="Kegiatan tertentu (opsional)" htmlFor="a"><Select id="a" name="activity_id" defaultValue=""><option value="">Semua kegiatan pada periode</option>{kegiatan.map((k) => <option key={k.id} value={k.id}>{k.kode_kegiatan} · {k.jenis_kegiatan}</option>)}</Select></Field>
              <Field label="Kegiatan dan lokasi yang dinilai" htmlFor="kl" className="sm:col-span-2"><Input id="kl" name="kegiatan_lokasi" placeholder="Contoh: Budidaya sayur di lahan Blok Timur" /></Field>
              <Field label="Periode dari" htmlFor="pd"><Input id="pd" name="periode_dari" type="date" defaultValue={dari} /></Field>
              <Field label="Periode sampai" htmlFor="ps"><Input id="ps" name="periode_sampai" type="date" defaultValue={sampai} /></Field>
              <Field label="Tanggal penilaian" htmlFor="tp"><Input id="tp" name="tanggal_penilaian" type="date" defaultValue={sampai} /></Field>
              <Field label="Penanggung jawab kegiatan" htmlFor="pj"><Input id="pj" name="penanggung_jawab" /></Field>
              <Field label="Nama penilai" htmlFor="pn"><Input id="pn" name="penilai_nama" defaultValue={user.fullName} /></Field>
              <Field label="Jabatan penilai" htmlFor="pjb"><Input id="pjb" name="penilai_jabatan" /></Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="sertakan_latihan" className="h-4 w-4" /> Sertakan sesi latihan dalam penilaian</label>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Daftar penilaian</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 pr-2">Tanggal</th><th className="pr-2">Kegiatan dan lokasi</th><th className="pr-2">Periode</th><th className="pr-2">Penilai</th><th className="pr-2">Skor</th><th className="pr-2">Kategori</th><th className="pr-2">Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const h = hitungPenilaian(per.get(String(r.id)) ?? []);
                  return (
                    <tr key={String(r.id)} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-2">{fmtTanggal(String(r.tanggal_penilaian))}</td>
                      <td className="pr-2">{String(r.kegiatan_lokasi)}</td>
                      <td className="pr-2">{fmtTanggal(String(r.periode_dari))} s.d. {fmtTanggal(String(r.periode_sampai))}</td>
                      <td className="pr-2">{String(r.penilai_nama)}</td>
                      <td className="pr-2">{h.persentase === null ? "-" : `${h.persentase.toFixed(1)}%`}</td>
                      <td className="pr-2">{h.kategori ? <Pill tone={TONE[h.kategori]}>{h.kategori}</Pill> : <span className="text-muted-foreground">Belum lengkap</span>}</td>
                      <td className="pr-2"><Pill tone={r.status === "Disahkan" ? "hijau" : r.status === "Final" ? "biru" : "netral"}>{String(r.status)}</Pill></td>
                      <td><Link className="text-primary underline-offset-2 hover:underline" href={`/penilaian/${String(r.id)}`}>Buka</Link></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={8} className="py-3 text-muted-foreground">Belum ada penilaian.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
