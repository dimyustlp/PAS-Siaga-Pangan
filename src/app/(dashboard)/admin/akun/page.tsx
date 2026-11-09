import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createAccount, resetPassword, updateAccount } from "@/lib/actions/admin";
import { ALL_ROLES, ROLE_LABEL } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Akun" };
export const dynamic = "force-dynamic";

export default async function AkunPage() {
  const supabase = await createClient();
  const [akun, upt, kanwil] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("master_upt").select("kode,nama").order("nama"),
    supabase.from("master_kanwil").select("id,nama").order("nama"),
  ]);
  const daftarUpt = upt.data ?? [];
  const daftarKanwil = kanwil.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Akun pengguna" description="Buat akun, atur peran dan unit kerja, nonaktifkan akun, atau setel ulang kata sandi. Setiap perubahan tercatat di jejak audit." />

      <Card>
        <CardHeader><CardTitle>Buat akun baru</CardTitle><CardDescription>Berikan kata sandi awal secara langsung kepada pemilik akun, lalu minta diganti.</CardDescription></CardHeader>
        <CardContent>
          <ActionForm action={createAccount} submit="Buat akun" fields={{ nama: { s: "nama" }, email: { s: "email" }, password: { s: "password" }, nip: { s: "nip" }, role: { s: "role" }, kode_upt: { s: "upt" }, kanwil_id: { s: "kanwil" } }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="a-nama"><Input id="a-nama" name="nama" required /></Field>
              <Field label="Email" htmlFor="a-email"><Input id="a-email" name="email" type="email" required autoComplete="off" /></Field>
              <Field label="Kata sandi awal" htmlFor="a-pw" hint="Minimal 8 karakter."><Input id="a-pw" name="password" type="text" minLength={8} required autoComplete="off" /></Field>
              <Field label="NIP (opsional)" htmlFor="a-nip"><Input id="a-nip" name="nip" /></Field>
              <Field label="Peran" htmlFor="a-role">
                <Select id="a-role" name="role" defaultValue="operator">{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
              </Field>
              <Field label="UPT" htmlFor="a-upt" hint="Wajib untuk Operator, Pengawal, dan Kepala Pengamanan.">
                <Select id="a-upt" name="upt" defaultValue=""><option value="">— tanpa UPT —</option>{daftarUpt.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select>
              </Field>
              <Field label="Kanwil" htmlFor="a-kanwil" hint="Untuk Pemantau Kanwil.">
                <Select id="a-kanwil" name="kanwil" defaultValue=""><option value="">— tanpa Kanwil —</option>{daftarKanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select>
              </Field>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {akun.error && <Alert tone="bahaya">Daftar akun belum bisa dibaca. Muat ulang halaman.</Alert>}
      <ul className="space-y-4">
        {(akun.data ?? []).map((a) => (
          <li key={a.id}>
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{a.full_name}{a.nip ? <span className="ml-2 text-xs text-muted-foreground">NIP {a.nip}</span> : null}</p>
                  <div className="flex gap-2"><Pill tone="biru">{ROLE_LABEL[a.role]}</Pill>{!a.is_active && <Pill tone="merah">Nonaktif</Pill>}</div>
                </div>
                <ActionForm action={updateAccount} submit="Simpan perubahan" resetOnSuccess={false} className="space-y-3" fields={{ id: { v: a.id }, role: { s: "role" }, kode_upt: { s: "upt" }, nip: { s: "nip" }, kanwil_id: { s: "kanwil" }, is_active: { b: "aktif" } }}>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Select name="role" defaultValue={a.role} aria-label="Peran">{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
                    <Select name="upt" defaultValue={a.kode_upt ?? ""} aria-label="UPT"><option value="">— tanpa UPT —</option>{daftarUpt.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select>
                    <Select name="kanwil" defaultValue={a.kanwil_id ?? ""} aria-label="Kanwil"><option value="">— tanpa Kanwil —</option>{daftarKanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select>
                    <Input name="nip" defaultValue={a.nip ?? ""} placeholder="NIP" aria-label="NIP" />
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={a.is_active} className="h-4 w-4" />Akun aktif</label>
                </ActionForm>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Setel ulang kata sandi</summary>
                  <ActionForm action={resetPassword} submit="Setel ulang" success="Kata sandi diganti." className="mt-3 flex flex-wrap items-end gap-2 space-y-0" fields={{ id: { v: a.id }, password: { s: "pw" } }} confirm="Ganti kata sandi akun ini?">
                    <Input name="pw" type="text" minLength={8} required placeholder="Kata sandi baru (min. 8 karakter)" autoComplete="off" className="w-72" aria-label="Kata sandi baru" />
                  </ActionForm>
                </details>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
