import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createKanwil, createUpt, ubahTitikUpt, updateKanwilTautan } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "UPT & Kanwil" };
export const dynamic = "force-dynamic";

export default async function WilayahPage() {
  const supabase = await createClient();
  const [kanwil, upt] = await Promise.all([
    supabase.from("master_kanwil").select("*").order("urutan", { nullsFirst: false }),
    supabase.from("master_upt").select("*").order("nama"),
  ]);
  const daftarKanwil = kanwil.data ?? [];
  const daftarUpt = upt.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="UPT & Kanwil" description="Master unit kerja. Cakupan data pemantau Kanwil mengikuti Kanwil yang terdaftar di akunnya." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tambah Kanwil</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createKanwil} submit="Simpan Kanwil" fields={{ kode: { s: "kode" }, nama: { s: "nama" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kode" htmlFor="k-kode"><Input id="k-kode" name="kode" required placeholder="KWJKT" /></Field>
                <Field label="Nama" htmlFor="k-nama"><Input id="k-nama" name="nama" required /></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tambah UPT</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createUpt} submit="Simpan UPT" fields={{ kode: { s: "kode" }, nama: { s: "nama" }, jenis: { s: "jenis" }, kanwil_id: { s: "kanwil" } }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kode" htmlFor="u-kode"><Input id="u-kode" name="kode" required /></Field>
                <Field label="Nama" htmlFor="u-nama"><Input id="u-nama" name="nama" required /></Field>
                <Field label="Jenis" htmlFor="u-jenis"><Input id="u-jenis" name="jenis" placeholder="Lapas, Rutan, LPKA" /></Field>
                <Field label="Kanwil" htmlFor="u-kanwil"><Select id="u-kanwil" name="kanwil" defaultValue=""><option value="">— belum dipilih —</option>{daftarKanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select></Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Penampungan berkas per Kanwil</CardTitle>
          <CardDescription>Isi tautan Google Form tempat UPT mengirim berkas, dan tautan folder Drive tempat hasilnya tersimpan. Tautan tampil di halaman Berkas untuk semua peran pada Kanwil itu. Kosongkan untuk menghapus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {daftarKanwil.length === 0 && <p className="text-sm text-muted-foreground">Belum ada Kanwil.</p>}
          {daftarKanwil.map((k) => (
            <ActionForm key={k.id} action={updateKanwilTautan} submit="Simpan tautan" resetOnSuccess={false} className="space-y-3 border-b pb-5 last:border-0 last:pb-0" fields={{ id: { v: k.id }, tautan_form: { s: "form" }, tautan_folder: { s: "folder" } }}>
              <p className="font-semibold">{k.nama}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tautan Google Form" htmlFor={`f-${k.id}`}><Input id={`f-${k.id}`} name="form" type="url" defaultValue={k.tautan_form ?? ""} placeholder="https://forms.gle/…" /></Field>
                <Field label="Tautan folder Drive" htmlFor={`d-${k.id}`}><Input id={`d-${k.id}`} name="folder" type="url" defaultValue={k.tautan_folder ?? ""} placeholder="https://drive.google.com/…" /></Field>
              </div>
            </ActionForm>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Perbarui titik peta UPT</CardTitle>
          <CardDescription>Titik awal UPT masih perkiraan (pusat kabupaten/kota). Buka Google Maps, klik kanan gedung UPT, klik angka koordinatnya, lalu tempel di sini.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={ubahTitikUpt} submit="Simpan titik" success="Titik UPT diperbarui." fields={{ kode: { s: "kode" }, titik: { s: "titik" } }}>
            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <Field label="UPT" htmlFor="t-upt">
                <Select id="t-upt" name="kode" required defaultValue="">
                  <option value="" disabled>Pilih UPT</option>
                  {daftarKanwil.map((k) => (
                    <optgroup key={k.id} label={k.wilayah ?? k.nama}>
                      {daftarUpt.filter((u) => u.kanwil_id === k.id).map((u) => <option key={u.kode} value={u.kode}>{u.nama}{u.titik_perkiraan ? "" : " (sudah diverifikasi)"}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Titik koordinat" htmlFor="t-titik"><Input id="t-titik" name="titik" required placeholder="-6.2995, 106.5960" inputMode="decimal" /></Field>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Daftar UPT per Kanwil</CardTitle>
          <CardDescription>{daftarKanwil.length} Kanwil, {daftarUpt.length} UPT. {daftarUpt.filter((u) => !u.titik_perkiraan).length} titik sudah diverifikasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {daftarKanwil.map((k) => {
            const isi = daftarUpt.filter((u) => u.kanwil_id === k.id);
            return (
              <details key={k.id} className="group rounded-xl border border-ink/[0.07] bg-ink/[0.02]">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 font-medium">{k.wilayah ?? k.nama}</span>
                  {k.tipe && <Pill>Tipe {k.tipe}</Pill>}
                  <span className="font-mono text-xs text-muted-foreground">{isi.length} UPT</span>
                </summary>
                <div className="overflow-x-auto border-t border-ink/[0.06]">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2">Kode</th><th className="py-2 pr-3">Nama</th><th className="py-2 pr-3">Jenis</th><th className="py-2 pr-3">Kab/Kota</th><th className="py-2 pr-4">Titik</th></tr></thead>
                    <tbody className="divide-y divide-ink/[0.05]">
                      {isi.map((u) => (
                        <tr key={u.id}>
                          <td className="px-4 py-2 font-mono text-xs">{u.kode}</td>
                          <td className="py-2 pr-3">{u.nama}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{u.jenis ?? "-"}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{u.kab_kota ?? "-"}</td>
                          <td className="py-2 pr-4">{u.titik_perkiraan ? <Pill>Perkiraan</Pill> : <Pill tone="biru">Terverifikasi</Pill>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
