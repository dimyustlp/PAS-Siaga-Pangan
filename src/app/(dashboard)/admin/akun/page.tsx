import { UserCheck, UserX, Users } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { createAccount, deleteAccount, resetPassword, updateAccount } from "@/lib/actions/admin";
import { requireUser } from "@/lib/auth";
import { fmtWaktu } from "@/lib/format";
import { ALL_ROLES, ROLE_LABEL, type Role } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Akun" };
export const dynamic = "force-dynamic";

type Q = { q?: string; peran?: string; status?: string };

export default async function AkunPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const supabase = await createClient();
  const [saya, akunRes, upt, kanwil] = await Promise.all([
    requireUser(),
    supabase.rpc("admin_daftar_akun"),
    supabase.from("master_upt").select("kode,nama").order("nama"),
    supabase.from("master_kanwil").select("id,nama").order("nama"),
  ]);
  const semua = akunRes.data ?? [];
  const daftarUpt = upt.data ?? [];
  const daftarKanwil = kanwil.data ?? [];
  const namaUpt = (k: string | null) => daftarUpt.find((u) => u.kode === k)?.nama ?? k ?? "-";
  const namaKanwil = (k: string | null) => daftarKanwil.find((w) => w.id === k)?.nama ?? "-";

  const kata = (q.q ?? "").trim().toLowerCase();
  const daftar = semua.filter(
    (a) =>
      (!q.peran || a.role === q.peran) &&
      (!q.status || (q.status === "aktif" ? a.is_active : !a.is_active)) &&
      (!kata || `${a.full_name} ${a.email} ${a.nip ?? ""}`.toLowerCase().includes(kata))
  );
  const aktif = semua.filter((a) => a.is_active).length;
  const perPeran = ALL_ROLES.map((r) => ({ r, n: semua.filter((a) => a.role === r).length })).filter((x) => x.n > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Akun pengguna" description="Lihat semua akun, ubah data dan peran, nonaktifkan, setel ulang kata sandi, atau hapus. Setiap perubahan tercatat di jejak audit." />

      {akunRes.error && <Alert tone="bahaya">Daftar akun belum bisa dibaca. Muat ulang halaman.</Alert>}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Ringkasan akun">
        <StatCard icon={Users} nada="biru" nilai={semua.length} label="akun terdaftar" />
        <StatCard icon={UserCheck} nada="hijau" nilai={aktif} label="akun aktif" />
        <StatCard icon={UserX} nada="merah" nilai={semua.length - aktif} label="akun nonaktif" />
      </section>
      {perPeran.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {perPeran.map(({ r, n }) => <Pill key={r} tone="biru">{ROLE_LABEL[r]}: {n}</Pill>)}
        </div>
      )}

      <details className="group rounded-xl border border-border/70 bg-card shadow-soft">
        <summary className="cursor-pointer list-none p-4 font-semibold [&::-webkit-details-marker]:hidden">+ Buat akun baru</summary>
        <div className="border-t p-4">
          <p className="mb-4 text-sm text-muted-foreground">Berikan kata sandi awal langsung kepada pemilik akun, lalu minta diganti.</p>
          <ActionForm action={createAccount} submit="Buat akun" fields={{ nama: { s: "nama" }, email: { s: "email" }, password: { s: "password" }, nip: { s: "nip" }, role: { s: "role" }, kode_upt: { s: "upt" }, kanwil_id: { s: "kanwil" } }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="a-nama"><Input id="a-nama" name="nama" required /></Field>
              <Field label="Email" htmlFor="a-email"><Input id="a-email" name="email" type="email" required autoComplete="off" /></Field>
              <Field label="Kata sandi awal" htmlFor="a-pw" hint="Minimal 8 karakter."><Input id="a-pw" name="password" type="text" minLength={8} required autoComplete="off" /></Field>
              <Field label="NIP (opsional)" htmlFor="a-nip"><Input id="a-nip" name="nip" /></Field>
              <Field label="Peran" htmlFor="a-role"><Select id="a-role" name="role" defaultValue="operator">{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
              <Field label="UPT" htmlFor="a-upt" hint="Wajib untuk Operator, Pengawal, dan Kepala Pengamanan."><Select id="a-upt" name="upt" defaultValue=""><option value="">— tanpa UPT —</option>{daftarUpt.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select></Field>
              <Field label="Kanwil" htmlFor="a-kanwil" hint="Wajib untuk Pemantau Kanwil."><Select id="a-kanwil" name="kanwil" defaultValue=""><option value="">— tanpa Kanwil —</option>{daftarKanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select></Field>
            </div>
          </ActionForm>
        </div>
      </details>

      <form className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-4" aria-label="Saring akun">
        <Field label="Cari" htmlFor="s-q"><Input id="s-q" name="q" defaultValue={q.q ?? ""} placeholder="Nama, email, atau NIP" /></Field>
        <Field label="Peran" htmlFor="s-peran"><Select id="s-peran" name="peran" defaultValue={q.peran ?? ""}><option value="">Semua</option>{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
        <Field label="Status" htmlFor="s-status"><Select id="s-status" name="status" defaultValue={q.status ?? ""}><option value="">Semua</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></Select></Field>
        <div className="flex items-end"><Button type="submit" variant="outline" className="w-full">Terapkan</Button></div>
      </form>

      <p className="text-sm text-muted-foreground">{daftar.length} akun{daftar.length !== semua.length ? ` dari ${semua.length}` : ""}.</p>
      <ul className="space-y-4">
        {daftar.map((a) => {
          const diriSendiri = a.id === saya.id;
          return (
            <li key={a.id}>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{a.full_name}{diriSendiri && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Akun Anda</span>}</p>
                      <p className="text-sm text-muted-foreground">{a.email}{a.nip ? ` · NIP ${a.nip}` : ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.kode_upt ? `${namaUpt(a.kode_upt)} · ` : ""}Kanwil: {namaKanwil(a.kanwil_id)} · Masuk terakhir: {a.last_sign_in_at ? fmtWaktu(a.last_sign_in_at) : "belum pernah"}
                      </p>
                    </div>
                    <div className="flex gap-2"><Pill tone="biru">{ROLE_LABEL[a.role as Role]}</Pill>{!a.is_active && <Pill tone="merah">Nonaktif</Pill>}</div>
                  </div>

                  <details className="text-sm">
                    <summary className="cursor-pointer font-semibold text-brand">Ubah akun</summary>
                    <ActionForm
                      action={updateAccount}
                      submit="Simpan perubahan"
                      resetOnSuccess={false}
                      className="mt-3 space-y-3"
                      fields={{ id: { v: a.id }, nama: { s: "nama" }, email: { s: "email" }, role: { s: "role" }, kode_upt: { s: "upt" }, nip: { s: "nip" }, kanwil_id: { s: "kanwil" } }}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Nama lengkap" htmlFor={`n-${a.id}`}><Input id={`n-${a.id}`} name="nama" defaultValue={a.full_name} required /></Field>
                        <Field label="Email" htmlFor={`e-${a.id}`}><Input id={`e-${a.id}`} name="email" type="email" defaultValue={a.email} required /></Field>
                        <Field label="Peran" htmlFor={`r-${a.id}`} hint={diriSendiri ? "Peran akun sendiri tidak bisa diubah." : undefined}>
                          <Select id={`r-${a.id}`} name="role" defaultValue={a.role} disabled={diriSendiri}>{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
                        </Field>
                        <Field label="NIP" htmlFor={`p-${a.id}`}><Input id={`p-${a.id}`} name="nip" defaultValue={a.nip ?? ""} /></Field>
                        <Field label="UPT" htmlFor={`u-${a.id}`}><Select id={`u-${a.id}`} name="upt" defaultValue={a.kode_upt ?? ""}><option value="">— tanpa UPT —</option>{daftarUpt.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select></Field>
                        <Field label="Kanwil" htmlFor={`k-${a.id}`}><Select id={`k-${a.id}`} name="kanwil" defaultValue={a.kanwil_id ?? ""}><option value="">— tanpa Kanwil —</option>{daftarKanwil.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select></Field>
                      </div>
                    </ActionForm>
                  </details>

                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    {!diriSendiri && (
                      <ActionButton
                        action={updateAccount}
                        input={{ id: a.id, is_active: !a.is_active }}
                        label={a.is_active ? "Nonaktifkan" : "Aktifkan"}
                        confirm={a.is_active ? "Nonaktifkan akun ini? Pemiliknya tidak bisa masuk sampai diaktifkan lagi." : undefined}
                      />
                    )}
                    <details className="text-sm">
                      <summary className="cursor-pointer rounded-lg border border-input px-3 py-1.5 font-medium hover:bg-secondary">Setel ulang kata sandi</summary>
                      <ActionForm action={resetPassword} submit="Setel ulang" success="Kata sandi diganti." className="mt-3 flex flex-wrap items-end gap-2 space-y-0" fields={{ id: { v: a.id }, password: { s: "pw" } }} confirm="Ganti kata sandi akun ini?">
                        <Input name="pw" type="text" minLength={8} required placeholder="Kata sandi baru (min. 8 karakter)" autoComplete="off" className="w-72" aria-label="Kata sandi baru" />
                      </ActionForm>
                    </details>
                    {!diriSendiri && (
                      <ActionButton action={deleteAccount} input={{ id: a.id }} label="Hapus akun" variant="destructive" confirm={`Hapus akun ${a.full_name} secara permanen? Tindakan ini tidak bisa dibatalkan. Akun yang sudah punya catatan kegiatan tidak bisa dihapus, nonaktifkan saja.`} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      {daftar.length === 0 && !akunRes.error && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada akun pada saringan ini.</p>}
    </div>
  );
}
