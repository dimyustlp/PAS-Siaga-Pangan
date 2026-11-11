import { Bell, FlaskConical, Send } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  aturPengaturan, hapusGrupTelegram, kirimRekapSekarang, simpanGrupTelegram, simpanTokenTelegram, tesGrupTelegram, ubahAktifGrup,
} from "@/lib/actions/telegram";
import { fmtTanggal, fmtWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifikasi dan mode latihan" };
export const dynamic = "force-dynamic";

type Status = { token_ada: boolean; token_diatur_at: string | null; telegram_aktif: boolean; rekap_jam_wib: number; rekap_terakhir: string | null };

export default async function NotifikasiPage() {
  const supabase = await createClient();
  const [st, set, grup, log, kanwil, upt] = await Promise.all([
    supabase.rpc("admin_status_telegram"),
    supabase.from("pengaturan_aplikasi").select("mode_latihan,telegram_aktif,rekap_jam_wib").maybeSingle(),
    supabase.from("grup_telegram").select("*").order("tingkat").order("nama").limit(300),
    supabase.rpc("admin_daftar_notif", { p_limit: 40 }),
    supabase.from("master_kanwil").select("id,nama").order("urutan", { nullsFirst: false }),
    supabase.from("master_upt").select("kode,nama").order("nama").limit(1000),
  ]);
  const status = (st.data ?? null) as Status | null;
  const latihan = set.data?.mode_latihan ?? false;
  const aktif = set.data?.telegram_aktif ?? false;
  const jam = set.data?.rekap_jam_wib ?? 17;
  const daftarGrup = grup.data ?? [];
  const namaKanwil = (id: string | null) => (kanwil.data ?? []).find((k) => k.id === id)?.nama;
  const namaUpt = (kode: string | null) => (upt.data ?? []).find((u) => u.kode === kode)?.nama;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Notifikasi dan mode latihan" description="Telegram menyampaikan perubahan status, gangguan, alarm gelang, dan rekap harian ke grup UPT, Kanwil, dan Direktorat." />

      {(st.error || set.error) && <Alert tone="bahaya">Pengaturan belum bisa dibaca. Muat ulang halaman.</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-4 w-4" aria-hidden />Pengaturan umum</CardTitle>
            <CardDescription>Mode Latihan menandai kegiatan baru sebagai latihan: tidak dihitung pada evaluasi, dan pesan Telegram diberi label LATIHAN.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={aturPengaturan} submit="Simpan pengaturan" resetOnSuccess={false} fields={{ latihan: { b: "latihan" }, telegram: { b: "telegram" }, rekap_jam: { n: "jam" } }}>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="latihan" defaultChecked={latihan} className="mt-0.5 h-4 w-4" /><span><b>Mode Latihan</b><br /><span className="text-muted-foreground">Kegiatan yang dibuat selama mode ini aktif ditandai latihan. Rekap harian dihentikan.</span></span></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="telegram" defaultChecked={aktif} className="mt-0.5 h-4 w-4" /><span><b>Kirim notifikasi Telegram</b><br /><span className="text-muted-foreground">Butuh token bot dan minimal satu grup aktif.</span></span></label>
              <Field label="Jam rekap harian (WIB)" htmlFor="jam"><Input id="jam" name="jam" type="number" min={0} max={23} required defaultValue={jam} className="w-28" /></Field>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" aria-hidden />Token bot Telegram</CardTitle>
            <CardDescription>
              {status?.token_ada ? `Token tersimpan sejak ${fmtTanggal(status.token_diatur_at)}. Isi ulang hanya bila ingin mengganti.` : "Belum ada token."} Token disimpan terenkripsi di Vault database dan tidak bisa dibaca kembali.
            </CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={simpanTokenTelegram} submit="Simpan token" success="Token tersimpan." fields={{ token: { s: "token" } }}>
              <Field label="Token dari BotFather" htmlFor="token" hint="Buat bot lewat @BotFather di Telegram, lalu tempel tokennya di sini. Jangan dibagikan kepada siapa pun.">
                <Input id="token" name="token" type="password" autoComplete="off" required placeholder="123456789:AA…" />
              </Field>
            </ActionForm>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Pill tone={status?.token_ada ? "hijau" : "kuning"}>{status?.token_ada ? "Token terpasang" : "Token belum diisi"}</Pill>
              <Pill tone={aktif ? "hijau" : "netral"}>{aktif ? "Notifikasi aktif" : "Notifikasi mati"}</Pill>
              {latihan && <Pill tone="kuning">Mode Latihan menyala</Pill>}
            </div>
            <div className="mt-4"><ActionButton action={kirimRekapSekarang} input={{}} label="Kirim rekap hari ini sekarang" confirm="Kirim rekap hari ini ke semua grup yang aktif?" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tambah grup tujuan</CardTitle>
          <CardDescription>Tambahkan bot ke grup Telegram, kirim satu pesan di grup, lalu ambil ID obrolannya (mis. lewat @RawDataBot atau @userinfobot). ID grup biasanya diawali tanda minus.</CardDescription></CardHeader>
        <CardContent>
          <ActionForm action={simpanGrupTelegram} submit="Simpan grup" fields={{ nama: { s: "g-nama" }, chat_id: { s: "g-chat" }, tingkat: { s: "g-tingkat" }, kode_upt: { s: "g-upt" }, kanwil_id: { s: "g-kanwil" }, minimal_status: { s: "g-min" }, kirim_rekap: { b: "g-rekap" }, ikut_latihan: { b: "g-latihan" } }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama grup" htmlFor="g-nama"><Input id="g-nama" name="g-nama" required maxLength={120} placeholder="Mis. Pengamanan Lapas Terbuka Ciangir" /></Field>
              <Field label="ID obrolan" htmlFor="g-chat"><Input id="g-chat" name="g-chat" required placeholder="-1001234567890" /></Field>
              <Field label="Tingkat" htmlFor="g-tingkat" hint="UPT menerima kabar UPT itu saja, Kanwil seluruh UPT di wilayahnya, Direktorat semuanya.">
                <Select id="g-tingkat" name="g-tingkat" defaultValue="UPT"><option>UPT</option><option>Kanwil</option><option>Direktorat</option></Select>
              </Field>
              <Field label="Status terendah yang dikirim" htmlFor="g-min" hint="Perubahan status di bawah ini tidak dikirim. Alarm gelang dan gangguan mengikuti tingkat kepentingannya.">
                <Select id="g-min" name="g-min" defaultValue="KUNING"><option>HIJAU</option><option>KUNING</option><option>MERAH</option><option>KRITIS</option></Select>
              </Field>
              <Field label="UPT (untuk tingkat UPT)" htmlFor="g-upt">
                <Select id="g-upt" name="g-upt" defaultValue=""><option value="">Tidak dipilih</option>{(upt.data ?? []).map((u) => <option key={u.kode} value={u.kode}>{u.nama}</option>)}</Select>
              </Field>
              <Field label="Kanwil (untuk tingkat Kanwil)" htmlFor="g-kanwil">
                <Select id="g-kanwil" name="g-kanwil" defaultValue=""><option value="">Tidak dipilih</option>{(kanwil.data ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</Select>
              </Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="g-rekap" defaultChecked className="h-4 w-4" />Terima rekap harian</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="g-latihan" defaultChecked className="h-4 w-4" />Ikut menerima pesan saat latihan</label>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grup tujuan</CardTitle><CardDescription>{daftarGrup.length} grup terdaftar.</CardDescription></CardHeader>
        <CardContent>
          {daftarGrup.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada grup.</p> : (
            <ul className="divide-y">
              {daftarGrup.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">{g.nama} <span className="font-mono text-xs text-muted-foreground">{g.chat_id}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {g.tingkat === "UPT" ? namaUpt(g.kode_upt) : g.tingkat === "Kanwil" ? namaKanwil(g.kanwil_id) : "Seluruh Indonesia"} · mulai status {g.minimal_status}
                      {g.kirim_rekap ? " · rekap harian" : ""}{g.ikut_latihan ? " · ikut latihan" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={g.aktif ? "hijau" : "netral"}>{g.aktif ? "Aktif" : "Dijeda"}</Pill>
                    <ActionButton action={tesGrupTelegram} input={{ id: g.id }} label="Kirim pesan uji" />
                    <ActionButton action={ubahAktifGrup} input={{ id: g.id, aktif: !g.aktif }} label={g.aktif ? "Jeda" : "Aktifkan"} />
                    <ActionButton action={hapusGrupTelegram} input={{ id: g.id }} label="Hapus" confirm={`Hapus grup ${g.nama}?`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" aria-hidden />Riwayat pengiriman</CardTitle><CardDescription>40 pesan terakhir. Hasil dari Telegram tersedia beberapa jam setelah pengiriman.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {(log.data ?? []).length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada pesan.</p> : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-2 pr-3">Waktu</th><th className="py-2 pr-3">Grup</th><th className="py-2 pr-3">Jenis</th><th className="py-2">Hasil</th></tr></thead>
              <tbody className="divide-y">
                {(log.data ?? []).map((n) => {
                  const ok = n.kode_http === 200;
                  return (
                    <tr key={n.id} className="align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtWaktu(n.waktu)}</td>
                      <td className="py-2 pr-3">{n.grup_nama ?? "-"}</td>
                      <td className="py-2 pr-3">{n.jenis}</td>
                      <td className="py-2">
                        {n.hasil === "Dilewati" ? <Pill tone="kuning">Dilewati: notifikasi mati atau token kosong</Pill>
                          : ok ? <Pill tone="hijau">Terkirim</Pill>
                          : n.kode_http ? <Pill tone="merah">Gagal ({n.kode_http})</Pill>
                          : n.galat ? <Pill tone="merah">Gagal</Pill> : <Pill tone="netral">Dalam antrean</Pill>}
                        {n.galat && <span className="mt-1 block max-w-md break-words text-xs text-muted-foreground">{n.galat}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
