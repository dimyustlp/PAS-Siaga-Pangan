import { CheckCircle2, ExternalLink, FileText, FolderOpen, Link2, MinusCircle } from "lucide-react";
import { ActionButton } from "@/components/shared/action-form";
import { FormBerkas } from "@/components/shared/form-berkas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { deleteBerkas } from "@/lib/actions/berkas";
import { requireUser } from "@/lib/auth";
import { KATEGORI_BERKAS, KATEGORI_POKOK, fmtUkuran, ringkasPerUpt } from "@/lib/domain/berkas";
import { fmtTanggalPendek, hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Berkas" };
export const dynamic = "force-dynamic";

type Q = { kanwil?: string; upt?: string; kategori?: string; q?: string };

export default async function BerkasPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const supabase = await createClient();
  const [user, kanwilRes, uptRes, berkasRes] = await Promise.all([
    requireUser(),
    supabase.from("master_kanwil").select("*").order("nama"),
    supabase.from("master_upt").select("*").order("nama"),
    supabase.from("v_berkas").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
  ]);
  const semuaKanwil = kanwilRes.data ?? [];
  const semuaUpt = uptRes.data ?? [];
  const semuaBerkas = berkasRes.data ?? [];

  // UPT yang masuk cakupan pengguna (data berkas sendiri sudah dibatasi RLS).
  const luas = user.role === "administrator" || user.role === "pemantau_pusat";
  const uptCakupan = semuaUpt.filter((u) =>
    luas ? true : user.role === "pemantau_kanwil" ? u.kanwil_id === user.kanwilId : u.kode === user.kodeUpt
  );
  const bisaUnggah = ["administrator", "operator", "kepala_pengamanan"].includes(user.role);
  const bisaHapus = user.role === "administrator" || user.role === "operator";
  const uptUnggah = user.role === "administrator" ? semuaUpt : uptCakupan;

  // Saring
  const kata = (q.q ?? "").trim().toLowerCase();
  const tersaring = semuaBerkas.filter(
    (b) =>
      (!q.kanwil || b.kanwil_id === q.kanwil) &&
      (!q.upt || b.kode_upt === q.upt) &&
      (!q.kategori || b.kategori === q.kategori) &&
      (!kata || `${b.judul} ${b.keterangan ?? ""} ${b.nama_berkas ?? ""} ${b.upt_nama ?? ""}`.toLowerCase().includes(kata))
  );

  const ringkas = ringkasPerUpt(uptCakupan, semuaBerkas);
  const kanwilCakupan = semuaKanwil.filter((k) => uptCakupan.some((u) => u.kanwil_id === k.id));
  const tanpaKanwil = uptCakupan.filter((u) => !u.kanwil_id);
  const kanwilSaya = semuaKanwil.find((k) => k.id === (user.kanwilId ?? semuaUpt.find((u) => u.kode === user.kodeUpt)?.kanwil_id));

  const kelompok = [
    ...kanwilCakupan.map((k) => ({ id: k.id as string | null, nama: k.nama, form: k.tautan_form, folder: k.tautan_folder })),
    ...(tanpaKanwil.length || tersaring.some((b) => !b.kanwil_id) ? [{ id: null, nama: "Tanpa Kanwil", form: null, folder: null }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Berkas"
        description="Penampungan berkas kegiatan per Kanwil dan UPT. Semua peran bisa melihat berkas sesuai cakupannya."
        actions={
          bisaUnggah ? <Button asChild size="sm"><a href="#unggah">Tambah berkas</a></Button> : undefined
        }
      />

      {berkasRes.error && <Alert tone="bahaya">Berkas belum bisa dibaca. Muat ulang halaman.</Alert>}

      {kanwilSaya?.tautan_form && (
        <Card className="border-brand/40 bg-brand-soft/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">Penampungan lewat Google Form · {kanwilSaya.nama}</p>
              <p className="text-sm text-muted-foreground">Berkas yang dikirim lewat Google Form tersimpan di Drive Kanwil. Daftarkan tautan foldernya di sini agar ikut terpantau.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><a href={kanwilSaya.tautan_form} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Buka Google Form</a></Button>
              {kanwilSaya.tautan_folder && <Button asChild size="sm" variant="outline"><a href={kanwilSaya.tautan_folder} target="_blank" rel="noopener noreferrer"><FolderOpen className="h-4 w-4" aria-hidden />Folder Drive</a></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kelengkapan berkas pokok</CardTitle>
          <CardDescription>Jumlah berkas per UPT pada kategori pokok. Tanda kuning berarti belum ada berkas.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {uptCakupan.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada UPT pada cakupan Anda.</p>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">UPT</th>
                  {KATEGORI_POKOK.map((k) => <th key={k} className="px-2 py-2 text-center">{k}</th>)}
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="py-2 pl-3">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {kelompok.map((g) => {
                  const baris = uptCakupan.filter((u) => (u.kanwil_id ?? null) === g.id);
                  if (baris.length === 0) return null;
                  return [
                    <tr key={`h-${g.id}`} className="bg-secondary/50"><td colSpan={KATEGORI_POKOK.length + 3} className="px-2 py-1.5 text-xs font-semibold">{g.nama}</td></tr>,
                    ...baris.map((u) => {
                      const r = ringkas.get(u.kode)!;
                      return (
                        <tr key={u.kode}>
                          <td className="py-2 pr-3 font-medium">{u.nama}</td>
                          {KATEGORI_POKOK.map((k) => {
                            const n = r.perKategori[k] ?? 0;
                            return (
                              <td key={k} className="px-2 py-2 text-center">
                                {n > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-status-hijau"><CheckCircle2 className="h-4 w-4" aria-hidden />{n}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[hsl(34_92%_30%)]"><MinusCircle className="h-4 w-4" aria-hidden /><span className="sr-only">belum ada</span>0</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-right tabular-nums">{r.total}</td>
                          <td className="py-2 pl-3 text-xs text-muted-foreground">{r.terakhir ? fmtTanggalPendek(r.terakhir) : "-"}</td>
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <form className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-5" aria-label="Saring berkas">
        <Field label="Kanwil" htmlFor="f-kanwil">
          <Select id="f-kanwil" name="kanwil" defaultValue={q.kanwil ?? ""}><option value="">Semua</option>{kanwilCakupan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select>
        </Field>
        <Field label="UPT" htmlFor="f-upt">
          <Select id="f-upt" name="upt" defaultValue={q.upt ?? ""}><option value="">Semua</option>{uptCakupan.map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select>
        </Field>
        <Field label="Kategori" htmlFor="f-kat">
          <Select id="f-kat" name="kategori" defaultValue={q.kategori ?? ""}><option value="">Semua</option>{KATEGORI_BERKAS.map((k) => <option key={k}>{k}</option>)}</Select>
        </Field>
        <Field label="Kata kunci" htmlFor="f-q"><Input id="f-q" name="q" defaultValue={q.q ?? ""} placeholder="Judul atau nama berkas" /></Field>
        <div className="flex items-end"><Button type="submit" variant="outline" className="w-full">Terapkan</Button></div>
      </form>

      <section className="space-y-4" aria-label="Daftar berkas per Kanwil">
        <p className="text-sm text-muted-foreground">{tersaring.length} berkas{tersaring.length !== semuaBerkas.length ? ` dari ${semuaBerkas.length}` : ""}.</p>
        {tersaring.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada berkas pada saringan ini.</p>}
        {kelompok.map((g) => {
          const isi = tersaring.filter((b) => (b.kanwil_id ?? null) === g.id);
          if (isi.length === 0) return null;
          return (
            <details key={g.id ?? "none"} open className="group rounded-xl border border-border/70 bg-card shadow-soft">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><FolderOpen className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block font-bold">{g.nama}</span><span className="block text-xs text-muted-foreground">{isi.length} berkas</span></span>
                {g.form && <a href={g.form} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft">Google Form</a>}
                {g.folder && <a href={g.folder} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft">Folder Drive</a>}
              </summary>
              <ul className="divide-y border-t">
                {isi.map((b) => (
                  <li key={b.id ?? ""} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      {b.sumber === "tautan" ? <Link2 className="h-4 w-4" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.judul}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.upt_nama} · {fmtTanggalPendek(b.tanggal)} · {b.sumber === "tautan" ? "Tautan" : fmtUkuran(b.ukuran_byte)}{b.pengunggah ? ` · ${b.pengunggah}` : ""}
                      </p>
                      {b.keterangan && <p className="text-xs text-muted-foreground">{b.keterangan}</p>}
                    </div>
                    <Pill tone="biru">{b.kategori}</Pill>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={`/berkas/${b.id}/unduh`} target={b.sumber === "tautan" ? "_blank" : undefined} rel="noopener noreferrer">{b.sumber === "tautan" ? "Buka" : "Unduh"}</a>
                      </Button>
                      {bisaHapus && b.id && <ActionButton action={deleteBerkas} input={{ id: b.id }} label="Hapus" variant="destructive" confirm="Hapus berkas ini? Tindakan ini tidak bisa dibatalkan." />}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>

      {bisaUnggah && (
        <Card id="unggah">
          <CardHeader><CardTitle>Tambah berkas</CardTitle><CardDescription>Unggah langsung, atau catat tautan folder Drive bila berkas masuk lewat Google Form.</CardDescription></CardHeader>
          <CardContent><FormBerkas upt={uptUnggah.map((u) => ({ kode: u.kode, nama: u.nama }))} hariIni={hariIniWib()} /></CardContent>
        </Card>
      )}
    </div>
  );
}
