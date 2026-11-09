import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Pill } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeLog } from "@/lib/domain/describe";
import { perhatianSesi, type Overview } from "@/lib/domain/attention";
import type { Rekonsiliasi } from "@/lib/domain/reconciliation";
import { fmtJam, fmtTanggal, fmtTanggalPendek, fmtWaktu, sejak, sisaWaktu } from "@/lib/format";
import { INDIKATOR_KESIAPAN } from "@/lib/validations/planning";
import type { SesiLengkap } from "@/lib/data/session-full";
import { cn } from "@/lib/utils";

const FASE_NADA: Record<string, "netral" | "biru" | "hijau" | "kuning" | "merah"> = {
  "Menunggu keputusan kesiapan": "kuning",
  "Perlu diperbaiki": "merah",
  Ditunda: "netral",
  "Siap, belum berangkat": "biru",
  "Dalam perjalanan": "biru",
  "Di lokasi": "hijau",
  "Sudah kembali ke blok": "biru",
  Selesai: "netral",
};

export function FasePill({ fase }: { fase: string | null }) {
  return <Pill tone={FASE_NADA[fase ?? ""] ?? "netral"}>{fase ?? "-"}</Pill>;
}

/** Tabel ringkasan semua sesi pada dasbor. Setiap baris menautkan ke detail sesi. */
export function SesiTabel({ rows, now, tampilkanUpt }: { rows: Overview[]; now: Date; tampilkanUpt: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada sesi pada cakupan ini.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-soft">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-secondary/70 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Kegiatan</th>
            {tampilkanUpt && <th className="px-3 py-2">UPT</th>}
            <th className="px-3 py-2">Tahap</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">WB keluar / dihitung / kembali</th>
            <th className="px-3 py-2">Periksa berikut</th>
            <th className="px-3 py-2">Data terakhir</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((o) => {
            const p = perhatianSesi(o, now);
            const menit = o.batas_periksa_berikut ? Math.ceil((Date.parse(o.batas_periksa_berikut) - now.getTime()) / 60_000) : null;
            const berjalan = !o.ditutup_at && (o.fase === "Di lokasi" || o.fase === "Dalam perjalanan");
            return (
              <tr key={o.session_id ?? ""} className={cn("align-top transition-colors hover:bg-brand-soft/40", p.some((x) => x.tingkat === "kritis") && "bg-status-merah/5")}>
                <td className="px-3 py-2.5">
                  <Link href={`/sesi/${o.session_id}`} className="font-medium text-primary hover:underline">
                    {o.jenis_kegiatan} · {o.lokasi_nama}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {o.kode_kegiatan} · {fmtTanggalPendek(o.tanggal_sesi)}
                  </p>
                  {p.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {p.map((x) => (
                        <li key={x.teks} className={cn("flex items-start gap-1 text-xs", x.tingkat === "kritis" ? "text-status-merah" : "text-status-kuning")}>
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                          {x.teks}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                {tampilkanUpt && <td className="px-3 py-2.5 text-xs">{o.upt_nama ?? o.kode_upt}</td>}
                <td className="px-3 py-2.5">
                  <FasePill fase={o.fase} />
                </td>
                <td className="px-3 py-2.5">{o.status_keamanan && <StatusBadge status={o.status_keamanan} />}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {o.wbp_keluar ?? "-"} / {o.wbp_terakhir_dihitung ?? "-"} / {o.wbp_kembali ?? "-"}
                  <p className="text-xs text-muted-foreground">rencana {o.jumlah_narapidana}</p>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {berjalan && o.batas_periksa_berikut ? (
                    <span className={cn("inline-flex items-center gap-1", o.terlambat_periksa && "font-semibold text-status-merah")}>
                      <Clock className="h-3 w-3" aria-hidden />
                      {fmtJam(o.batas_periksa_berikut)} ({sisaWaktu(menit)})
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{sejak(o.diperbarui_at, now)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PanelRekonsiliasi({ rek }: { rek: Rekonsiliasi | null }) {
  if (!rek) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rekonsiliasi penutupan</CardTitle>
        <CardDescription>Syarat menutup kegiatan: jumlah WB dan alat kembali sama, penggeledahan dilakukan, gangguan terverifikasi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">WB keluar</dt><dd className="text-lg font-semibold tabular-nums">{rek.wbpKeluar ?? "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">WB kembali</dt><dd className="text-lg font-semibold tabular-nums">{rek.wbpKembali ?? "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Alat keluar / kembali</dt><dd className="text-lg font-semibold tabular-nums">{rek.alatKeluar ?? "-"} / {rek.alatKembali ?? "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Penggeledahan</dt><dd className="text-lg font-semibold">{rek.penggeledahan === null ? "-" : rek.penggeledahan ? "Sudah" : "Belum"}</dd></div>
        </dl>
        {rek.siapTutup ? (
          <Alert tone="sukses">Semua syarat penutupan terpenuhi.</Alert>
        ) : (
          <Alert tone="waspada">
            <p className="font-medium">Belum bisa ditutup:</p>
            <ul className="mt-1 list-disc pl-5">
              {rek.alasan.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function PanelKesiapan({ data }: { data: SesiLengkap }) {
  const { sesi, kesiapan } = data;
  const peta = new Map(kesiapan.map((k) => [k.kode, k]));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Indikator kesiapan</CardTitle>
        <CardDescription>Enam indikator yang harus terpenuhi sebelum Kepala Pengamanan memberi izin mulai.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {INDIKATOR_KESIAPAN.map((i) => {
          const k = peta.get(i.kode);
          const berlaku = i.kode !== "f" || sesi.pakai_gelang_monitor;
          return (
            <div key={i.kode} className="flex items-start gap-3 text-sm">
              <Pill tone={!berlaku ? "netral" : k?.terpenuhi ? "hijau" : "kuning"} className="mt-0.5 shrink-0">
                {!berlaku ? "Tidak berlaku" : k?.terpenuhi ? "Terpenuhi" : "Belum"}
              </Pill>
              <div className="min-w-0">
                <p className="font-medium">{i.kode.toUpperCase()}. {i.judul}</p>
                {k?.catatan && <p className="text-xs text-muted-foreground">{k.catatan}</p>}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2 border-t pt-3 text-xs">
          <Pill tone={sesi.dokumen_surat_perintah ? "hijau" : "kuning"}>Surat perintah {sesi.dokumen_surat_perintah ? "terunggah" : "belum"}</Pill>
          <Pill tone={sesi.dokumen_rencana_pengamanan ? "hijau" : "kuning"}>Rencana pengamanan {sesi.dokumen_rencana_pengamanan ? "terunggah" : "belum"}</Pill>
          <Pill tone={data.nominatif && data.nominatif.length === sesi.jumlah_narapidana && sesi.jumlah_narapidana > 0 ? "hijau" : "kuning"}>
            Nominatif {data.nominatif ? data.nominatif.length : "?"} dari {sesi.jumlah_narapidana} WB
          </Pill>
        </div>
      </CardContent>
    </Card>
  );
}

export function LiniMasa({ data, batas = 60 }: { data: SesiLengkap; batas?: number }) {
  const { logs, nama } = data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lini masa lapangan</CardTitle>
        <CardDescription>Menurut jam kejadian sebenarnya. Entri “susulan” ditulis belakangan, mis. saat tanpa sinyal.</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada entri dari lapangan.</p>
        ) : (
          <ol className="space-y-3">
            {logs.slice(0, batas).map((l) => (
              <li key={l.id} className="flex gap-3 text-sm">
                <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtWaktu(l.waktu_kejadian).replace(" WIB", "")}</span>
                <div className="min-w-0">
                  <p>{describeLog(l.jenis_entri, l.payload)}</p>
                  <p className="text-xs text-muted-foreground">
                    {nama.get(l.pengawal_id) ?? "Pengawal"}
                    {l.susulan && <Pill tone="kuning" className="ml-2">susulan · terkirim {fmtJam(l.dikirim_at)}</Pill>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {logs.length > batas && <p className="mt-3 text-xs text-muted-foreground">Menampilkan {batas} entri terbaru dari {logs.length}.</p>}
      </CardContent>
    </Card>
  );
}

export function RiwayatStatusPanel({ data }: { data: SesiLengkap }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat status keamanan</CardTitle>
        <CardDescription>Setiap perubahan tercatat dengan sumber dan alasan. Tidak bisa dihapus.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.riwayatStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">Status masih HIJAU sejak awal.</p>
        ) : (
          <ol className="space-y-3">
            {data.riwayatStatus.map((r) => (
              <li key={r.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.dari} /> → <StatusBadge status={r.ke} />
                  <span className="text-xs text-muted-foreground">{fmtWaktu(r.waktu)} · {r.sumber}</span>
                </p>
                <p className="mt-0.5 text-muted-foreground">{r.alasan}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function DaftarKeputusan({ data }: { data: SesiLengkap }) {
  if (data.keputusan.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Keputusan Kepala Pengamanan</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {data.keputusan.map((d) => (
            <li key={d.id} className="text-sm">
              <p className="font-medium">
                {d.jenis_keputusan}{d.status_baru ? ` → ${d.status_baru}` : ""}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{fmtWaktu(d.created_at)} · {data.nama.get(d.pejabat_id) ?? "Kepala Pengamanan"}</span>
              </p>
              {d.catatan_keputusan && <p className="text-muted-foreground">{d.catatan_keputusan}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

const TL_NADA = { Terbuka: "kuning", Dikerjakan: "biru", Selesai: "hijau", Terverifikasi: "hijau" } as const;

export function DaftarTindakLanjut({ data, now }: { data: SesiLengkap; now: Date }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tindak lanjut</CardTitle>
        <CardDescription>Setiap tindak lanjut punya penanggung jawab dan tenggat.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.tindakLanjut.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tindak lanjut.</p>
        ) : (
          <ul className="space-y-3">
            {data.tindakLanjut.map((f) => {
              const lewat = (f.status === "Terbuka" || f.status === "Dikerjakan") && Date.parse(f.tenggat) < now.getTime();
              return (
                <li key={f.id} className="text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill tone={TL_NADA[f.status as keyof typeof TL_NADA] ?? "netral"}>{f.status}</Pill>
                    <span className="font-medium">{f.uraian}</span>
                  </p>
                  <p className={cn("text-xs text-muted-foreground", lewat && "font-medium text-status-merah")}>
                    PJ {f.penanggung_jawab_nama} · tenggat {fmtWaktu(f.tenggat)}{lewat ? " (terlambat)" : ""} · {f.sumber}
                  </p>
                  {f.catatan_selesai && <p className="text-xs text-muted-foreground">Catatan: {f.catatan_selesai}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DaftarGangguan({ data }: { data: SesiLengkap }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gangguan</CardTitle>
        <CardDescription>Gangguan dari pengawal dan selisih hitungan otomatis. HIJAU baru bisa dipulihkan setelah semuanya terverifikasi.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.gangguan.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada gangguan tercatat.</p>
        ) : (
          <ul className="space-y-2">
            {data.gangguan.map((g) => (
              <li key={g.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <Pill tone={g.status_penyelesaian ? "hijau" : "merah"}>{g.status_penyelesaian ? "Terverifikasi" : "Belum terverifikasi"}</Pill>
                  <span className="font-medium">{g.kategori_gangguan}</span>
                </p>
                {g.tindakan_awal && <p className="text-xs text-muted-foreground">{g.tindakan_awal}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function KepalaSesi({ data }: { data: SesiLengkap }) {
  const { ringkas: o, sesi, kegiatan, lokasi, nama } = data;
  const petugas = sesi.petugas_ids.map((id) => nama.get(id) ?? "Pengawal").join(", ");
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Kegiatan</p>
          <p className="font-semibold">{kegiatan.jenis_kegiatan} · {lokasi?.nama ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{kegiatan.kode_kegiatan} · {o.upt_nama ?? o.kode_upt}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Tanggal sesi</p>
          <p className="font-semibold">{fmtTanggal(sesi.tanggal_sesi)}</p>
          <p className="text-xs text-muted-foreground">Interval pemeriksaan {sesi.interval_pemeriksaan} menit{sesi.pakai_gelang_monitor ? " · pakai gelang monitor" : ""}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {o.status_keamanan && <StatusBadge status={o.status_keamanan} />}
          <FasePill fase={o.fase} />
          <Pill>{sesi.status_kesiapan}</Pill>
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3 text-sm">
          <p><span className="text-muted-foreground">Pengawal:</span> {petugas || "-"}</p>
          {(sesi.bimker_penanggung_jawab || sesi.petugas_blok || sesi.petugas_p2u) && (
            <p className="text-muted-foreground">
              {sesi.bimker_penanggung_jawab && <>Bimker: {sesi.bimker_penanggung_jawab}. </>}
              {sesi.petugas_blok && <>Petugas blok: {sesi.petugas_blok}. </>}
              {sesi.petugas_p2u && <>Petugas P2U: {sesi.petugas_p2u}.</>}
            </p>
          )}
          <p><span className="text-muted-foreground">Alat kerja:</span> {sesi.jumlah_alat_kerja}{sesi.rincian_alat ? ` (${sesi.rincian_alat})` : ""}</p>
        </div>
      </CardContent>
    </Card>
  );
}
