import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, PageHeader, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createKanwil, createUpt, updateKanwilTautan } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "UPT & Kanwil" };
export const dynamic = "force-dynamic";

export default async function WilayahPage() {
  const supabase = await createClient();
  const [kanwil, upt] = await Promise.all([
    supabase.from("master_kanwil").select("*").order("nama"),
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
        <CardHeader><CardTitle>Daftar UPT</CardTitle><CardDescription>{daftarKanwil.length} Kanwil, {daftarUpt.length} UPT.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">Kode</th><th className="py-2 pr-3">Nama</th><th className="py-2 pr-3">Jenis</th><th className="py-2">Kanwil</th></tr></thead>
            <tbody className="divide-y">
              {daftarUpt.map((u) => (
                <tr key={u.id}><td className="py-2 pr-3 font-mono text-xs">{u.kode}</td><td className="py-2 pr-3">{u.nama}</td><td className="py-2 pr-3">{u.jenis ?? "-"}</td><td className="py-2">{daftarKanwil.find((k) => k.id === u.kanwil_id)?.nama ?? "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
