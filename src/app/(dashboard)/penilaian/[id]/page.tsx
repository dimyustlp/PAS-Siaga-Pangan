import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { z } from "zod";
import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, PageHeader, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  hapusPenilaian, isiSaran, kunciPenilaian, sahkanPenilaian, simpanSkor, simpanTindakanSegera, tambahTindakLanjutPenilaian, ubahTindakLanjutPenilaian,
} from "@/lib/actions/penilaian";
import { requireUser } from "@/lib/auth";
import { CATATAN_KATEGORI, hitungPenilaian, INDIKATOR_PENILAIAN, PETUNJUK_PENILAIAN, type BarisSkor } from "@/lib/domain/penilaian";
import { fmtTanggal, fmtWaktu } from "@/lib/format";
import { longgar } from "@/lib/supabase/longgar";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Penilaian pelaksanaan" };
export const dynamic = "force-dynamic";

type Baris = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const TONE = { Kurang: "merah", Cukup: "kuning", Baik: "biru", "Sangat Baik": "hijau" } as const;

export default async function PenilaianDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const db = longgar(await createClient());
  const [p, sk, tl] = await Promise.all([
    db.from("penilaian_evaluasi").select("*").eq("id", id).maybeSingle(),
    db.from("penilaian_skor").select("*").eq("penilaian_id", id).order("no"),
    db.from("penilaian_tindak_lanjut").select("*").eq("penilaian_id", id).order("created_at"),
  ]);
  const pen = p.data as Baris | null;
  if (!pen) notFound();
  const skor = (sk.data ?? []) as Baris[];
  const tindak = (tl.data ?? []) as Baris[];
  const peta = new Map(skor.map((x) => [Number(x.no), x]));
  const h = hitungPenilaian(skor.map((x) => ({ no: Number(x.no), skor: x.skor as BarisSkor["skor"], tb: !!x.tb })));

  const draf = pen.status === "Draf";
  const final = pen.status === "Final";
  const penilai = ["administrator", "operator", "kepala_pengamanan"].includes(user.role);
  const pejabatTL = user.role === "kepala_pengamanan" || user.role === "ka_upt";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link href="/penilaian" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Daftar penilaian</Link>
      <PageHeader
        title={s(pen.kegiatan_lokasi)}
        description={`Periode ${fmtTanggal(s(pen.periode_dari))} s.d. ${fmtTanggal(s(pen.periode_sampai))} · Penilai ${s(pen.penilai_nama)} (${s(pen.penilai_jabatan)}) · ${s(pen.jumlah_sesi_diperiksa)} pelaksanaan harian diperiksa`}
        actions={<><Pill tone={pen.status === "Disahkan" ? "hijau" : final ? "biru" : "netral"}>{s(pen.status)}</Pill><Button asChild size="sm" variant="outline"><Link href={`/penilaian/${id}/cetak`}><Printer className="h-4 w-4" aria-hidden />Lembar penilaian (Formulir 8)</Link></Button></>}
      />

      <Card>
        <CardHeader><CardTitle>Hasil perhitungan</CardTitle><CardDescription>Indikator berlaku = 19 dikurangi TB. Total skor = (jumlah skor 2 × 2) + jumlah skor 1. Skor maksimal = indikator berlaku × 2. Persentase = total skor ÷ skor maksimal × 100.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Ukuran judul="Indikator berlaku" nilai={`${h.berlaku} dari ${h.jumlahIndikator}`} />
            <Ukuran judul="Skor 2 / 1 / 0" nilai={`${h.skor2} / ${h.skor1} / ${h.skor0}`} />
            <Ukuran judul="TB" nilai={String(h.jumlahTB)} />
            <Ukuran judul="Total skor" nilai={`${h.totalSkor} dari ${h.skorMaksimal}`} />
            <Ukuran judul="Persentase" nilai={h.persentase === null ? "-" : `${h.persentase.toFixed(1)}%`} />
            <div className="rounded-lg border border-border/70 bg-white/70 p-3"><p className="text-xs text-muted-foreground">Kategori</p><p className="mt-1">{h.kategori ? <Pill tone={TONE[h.kategori]}>{h.kategori}</Pill> : "-"}</p></div>
          </div>
          {h.catatan && <Alert tone="waspada">{h.catatan}</Alert>}
          <p className="text-xs text-muted-foreground">Kategori: Kurang 0–50%, Cukup di atas 50–70%, Baik di atas 70–90%, Sangat Baik di atas 90–100%. {CATATAN_KATEGORI}</p>
        </CardContent>
      </Card>

      {draf && penilai && (
        <Card>
          <CardHeader><CardTitle>Isian otomatis dari data aplikasi</CardTitle><CardDescription>Aplikasi menghitung saran skor dari pelaksanaan harian pada periode ini. Saran tidak mengikat; skor akhir ditentukan penilai.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ActionButton action={isiSaran} input={{ id, terapkan: true }} label="Terapkan saran pada indikator yang belum diisi" variant="default" />
            <ActionButton action={isiSaran} input={{ id, terapkan: false }} label="Perbarui saran saja" />
          </CardContent>
        </Card>
      )}

      <details className="kaca rounded-[14px] p-4 text-sm">
        <summary className="cursor-pointer font-medium">Petunjuk penilaian</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{PETUNJUK_PENILAIAN.map((t) => <li key={t}>{t}</li>)}</ul>
      </details>

      <div className="space-y-3">
        {INDIKATOR_PENILAIAN.map((ind) => {
          const r = peta.get(ind.no);
          const nilai = r?.tb ? "TB" : r?.skor === null || r?.skor === undefined ? "" : String(r.skor);
          return (
            <Card key={ind.no}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{ind.no}. {ind.judul}</p>
                    <p className="text-sm text-muted-foreground">{ind.uraian}</p>
                    <p className="text-xs text-muted-foreground">Bukti acuan: {ind.acuan}{ind.tb && <> · {ind.tb}</>}</p>
                  </div>
                  <Pill tone={nilai === "2" ? "hijau" : nilai === "1" ? "kuning" : nilai === "0" ? "merah" : nilai === "TB" ? "netral" : "kuning"}>{nilai === "" ? "Belum dinilai" : nilai === "TB" ? "TB" : `Skor ${nilai}`}</Pill>
                </div>
                {r && (r.saran_skor !== null || !!r.saran_tb) && (
                  <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs">Saran aplikasi: <b>{r.saran_skor !== null ? `skor ${s(r.saran_skor)}` : "TB"}</b>. {s(r.saran_dasar)}</p>
                )}
                {r && !(r.saran_skor !== null || !!r.saran_tb) && s(r.saran_dasar) && <p className="text-xs text-muted-foreground">{s(r.saran_dasar)}</p>}
                {draf && penilai ? (
                  <ActionForm action={simpanSkor} submit="Simpan skor" resetOnSuccess={false} className="grid gap-2 sm:grid-cols-4" fields={{ id: { v: id }, no: { v: ind.no }, nilai: { s: "nilai" }, alasan_tb: { s: "alasan_tb" }, bukti: { s: "bukti" } }}>
                    <Field label="Skor" htmlFor={`n${ind.no}`}>
                      <Select id={`n${ind.no}`} name="nilai" defaultValue={nilai}><option value="">Belum dinilai</option><option value="2">2 · Terpenuhi dan terbukti</option><option value="1">1 · Terpenuhi sebagian</option><option value="0">0 · Tidak terpenuhi atau tidak terbukti</option>{ind.tb && <option value="TB">TB · Tidak berlaku</option>}</Select>
                    </Field>
                    <Field label="Bukti dan kekurangan" htmlFor={`b${ind.no}`} className="sm:col-span-2"><Input id={`b${ind.no}`} name="bukti" defaultValue={s(r?.bukti)} /></Field>
                    {ind.tb && <Field label="Alasan bila TB" htmlFor={`t${ind.no}`}><Input id={`t${ind.no}`} name="alasan_tb" defaultValue={s(r?.alasan_tb)} /></Field>}
                  </ActionForm>
                ) : (
                  <p className="text-sm">{s(r?.bukti) ? <>Bukti: {s(r?.bukti)}</> : <span className="text-muted-foreground">Tanpa catatan bukti.</span>}{!!r?.tb && s(r?.alasan_tb) && <> · Alasan TB: {s(r?.alasan_tb)}</>}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Tindakan segera</CardTitle><CardDescription>Temuan yang menyangkut dasar pengeluaran, keberadaan WB, penguasaan pengamanan, atau keselamatan ditangani tanpa menunggu penilaian selesai.</CardDescription></CardHeader>
        <CardContent>
          {draf && penilai ? (
            <ActionForm action={simpanTindakanSegera} submit="Simpan" resetOnSuccess={false} fields={{ id: { v: id }, tindakan_segera: { s: "tindakan_segera" }, tindakan_dilaksanakan: { s: "tindakan_dilaksanakan" }, penanggung_jawab: { s: "penanggung_jawab" } }}>
              <Field label="Temuan yang perlu penanganan segera" htmlFor="ts"><Textarea id="ts" name="tindakan_segera" rows={2} defaultValue={s(pen.tindakan_segera)} /></Field>
              <Field label="Tindakan yang sudah dilaksanakan" htmlFor="td"><Textarea id="td" name="tindakan_dilaksanakan" rows={2} defaultValue={s(pen.tindakan_dilaksanakan)} /></Field>
              <Field label="Penanggung jawab" htmlFor="pjw"><Input id="pjw" name="penanggung_jawab" defaultValue={s(pen.penanggung_jawab)} /></Field>
            </ActionForm>
          ) : (
            <div className="space-y-1 text-sm"><p>Temuan: {s(pen.tindakan_segera) || "-"}</p><p>Tindakan dilaksanakan: {s(pen.tindakan_dilaksanakan) || "-"}</p><p>Penanggung jawab: {s(pen.penanggung_jawab) || "-"}</p></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tindak lanjut hasil penilaian</CardTitle><CardDescription>Setiap skor 0 atau 1 ditindaklanjuti dengan tindakan, penanggung jawab, batas waktu, dan hasil pemeriksaan penyelesaian. Dinyatakan selesai oleh Kepala Pengamanan atau Ka.UPT setelah bukti dan hasil verifikasi terisi.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {tindak.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tindak lanjut. Baris tindak lanjut dibuat otomatis untuk indikator berskor 0 atau 1 saat penilaian dikunci.</p>}
          {tindak.map((t) => (
            <div key={s(t.id)} className="space-y-2 rounded-xl border border-border/70 bg-white/70 p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{t.no_indikator ? `Indikator ${s(t.no_indikator)}` : "Temuan umum"} {t.selesai ? <Pill tone="hijau">Selesai {fmtTanggal(s(t.tanggal_verifikasi))}</Pill> : <Pill tone="kuning">Belum selesai</Pill>}</p>
              <p className="text-sm">{s(t.temuan)}</p>
              {(final || pen.status === "Disahkan") && (penilai || pejabatTL) ? (
                <ActionForm action={ubahTindakLanjutPenilaian} submit="Simpan" resetOnSuccess={false} className="grid gap-2 sm:grid-cols-2" fields={{ id: { v: id }, tl_id: { v: s(t.id) }, tindakan: { s: "tindakan" }, penanggung_jawab: { s: "penanggung_jawab" }, batas_waktu: { s: "batas_waktu" }, bukti_penyelesaian: { s: "bukti" }, hasil_verifikasi: { s: "hasil" }, selesai: { b: "selesai" } }}>
                  {user.role !== "ka_upt" && <Field label="Tindakan perbaikan" htmlFor={`ti${s(t.id)}`}><Input id={`ti${s(t.id)}`} name="tindakan" defaultValue={s(t.tindakan)} /></Field>}
                  {user.role !== "ka_upt" && <Field label="Penanggung jawab" htmlFor={`pg${s(t.id)}`}><Input id={`pg${s(t.id)}`} name="penanggung_jawab" defaultValue={s(t.penanggung_jawab)} /></Field>}
                  {user.role !== "ka_upt" && <Field label="Batas waktu" htmlFor={`bw${s(t.id)}`}><Input id={`bw${s(t.id)}`} name="batas_waktu" type="date" defaultValue={s(t.batas_waktu)} /></Field>}
                  <Field label="Bukti penyelesaian" htmlFor={`bk${s(t.id)}`}><Input id={`bk${s(t.id)}`} name="bukti" defaultValue={s(t.bukti_penyelesaian)} /></Field>
                  <Field label="Hasil pemeriksaan penyelesaian" htmlFor={`hs${s(t.id)}`} className="sm:col-span-2"><Input id={`hs${s(t.id)}`} name="hasil" defaultValue={s(t.hasil_verifikasi)} /></Field>
                  {pejabatTL && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="selesai" defaultChecked={!!t.selesai} className="h-4 w-4" /> Nyatakan selesai</label>}
                </ActionForm>
              ) : (
                <p className="text-sm text-muted-foreground">Tindakan: {s(t.tindakan) || "-"} · PJ: {s(t.penanggung_jawab) || "-"} · Batas waktu: {t.batas_waktu ? fmtTanggal(s(t.batas_waktu)) : "-"}{s(t.bukti_penyelesaian) !== "" && <> · Bukti: {s(t.bukti_penyelesaian)}</>}</p>
              )}
            </div>
          ))}
          {penilai && pen.status !== "Disahkan" && (
            <ActionForm action={tambahTindakLanjutPenilaian} submit="Tambah tindak lanjut" className="grid gap-2 sm:grid-cols-2" fields={{ id: { v: id }, no_indikator: { n: "no_indikator" }, temuan: { s: "temuan" }, tindakan: { s: "tindakan" }, penanggung_jawab: { s: "penanggung_jawab" }, batas_waktu: { s: "batas_waktu" } }}>
              <Field label="Indikator terkait (1–19, boleh kosong)" htmlFor="ni"><Input id="ni" name="no_indikator" inputMode="numeric" /></Field>
              <Field label="Temuan" htmlFor="tm"><Input id="tm" name="temuan" /></Field>
              <Field label="Tindakan perbaikan" htmlFor="tn"><Input id="tn" name="tindakan" /></Field>
              <Field label="Penanggung jawab" htmlFor="pgj"><Input id="pgj" name="penanggung_jawab" /></Field>
              <Field label="Batas waktu" htmlFor="bwt"><Input id="bwt" name="batas_waktu" type="date" /></Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {draf && penilai && (
        <Card>
          <CardHeader><CardTitle>Kunci penilaian</CardTitle><CardDescription>Setelah dikunci, skor tidak dapat diubah dan baris tindak lanjut dibuat untuk indikator berskor 0 atau 1. Semua indikator harus sudah bernilai, dan setiap TB harus beralasan.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ActionButton action={kunciPenilaian} input={{ id }} label="Kunci penilaian" variant="default" confirm="Kunci penilaian ini? Skor tidak dapat diubah setelah dikunci." />
            <ActionButton action={hapusPenilaian} input={{ id }} label="Hapus draf" variant="destructive" confirm="Hapus draf penilaian ini?" />
          </CardContent>
        </Card>
      )}

      {final && user.role === "ka_upt" && (
        <Card>
          <CardHeader><CardTitle>Pengesahan Ka.UPT</CardTitle><CardDescription>Periksa hasil penilaian dan tindak lanjutnya sebelum mengesahkan.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={sahkanPenilaian} submit="Sahkan penilaian" confirm="Sahkan penilaian ini?" fields={{ id: { v: id }, catatan: { s: "catatan" } }}>
              <Field label="Catatan pengesahan (opsional)" htmlFor="cp"><Textarea id="cp" name="catatan" rows={2} /></Field>
            </ActionForm>
          </CardContent>
        </Card>
      )}
      {pen.status === "Disahkan" && <Alert tone="sukses">Disahkan {fmtWaktu(s(pen.disahkan_at))}.{s(pen.catatan_pengesahan) && <> Catatan: {s(pen.catatan_pengesahan)}</>}</Alert>}
    </div>
  );
}

function Ukuran({ judul, nilai }: { judul: string; nilai: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white/70 p-3"><p className="text-xs text-muted-foreground">{judul}</p><p className="mt-1 font-semibold">{nilai}</p></div>
  );
}
