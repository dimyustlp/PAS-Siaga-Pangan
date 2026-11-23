import Link from "next/link";
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Hourglass, Play } from "lucide-react";
import { AksiTindakLanjut } from "@/components/shared/followup-forms";
import { Card } from "@/components/ui/card";
import { Alert, Pill } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { FasePill } from "@/components/shared/session-panels";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtTanggalPendek, fmtWaktu, hariIniWib } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tugas saya" };
export const dynamic = "force-dynamic";

function Ringkas({ ikon: Ikon, nilai, label, nada }: { ikon: typeof Play; nilai: number; label: string; nada: string }) {
  return (
    <div className="kaca flex items-center gap-3 rounded-2xl p-4">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", nada)}><Ikon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-none">{nilai}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default async function LapanganPage() {
  const user = await requireUser();
  const supabase = await createClient();
  // RLS memastikan pengawal hanya melihat sesi tempat ia ditugaskan.
  const [sesi, tl] = await Promise.all([
    supabase.from("v_session_overview").select("*").is("ditutup_at", null).order("tanggal_sesi", { ascending: true }),
    supabase.from("follow_ups").select("*").eq("penanggung_jawab_id", user.id).in("status", ["Terbuka", "Dikerjakan", "Selesai"]).order("tenggat"),
  ]);
  const daftar = sesi.data ?? [];
  const tugas = tl.data ?? [];
  const ids = daftar.map((s) => s.session_id!).filter(Boolean);
  const [{ data: tahap }, { data: petugas }] = ids.length
    ? await Promise.all([
        supabase.from("tahap_pengawalan").select("session_id").in("session_id", ids),
        supabase.from("petugas_sesi").select("session_id").in("session_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const nTahap = new Map<string, number>();
  (tahap ?? []).forEach((t) => nTahap.set(t.session_id, (nTahap.get(t.session_id) ?? 0) + 1));
  const nPetugas = new Map<string, number>();
  (petugas ?? []).forEach((t) => nPetugas.set(t.session_id, (nPetugas.get(t.session_id) ?? 0) + 1));

  const hari = hariIniWib();
  const siapList = daftar.filter((s) => s.status_kesiapan === "Dapat Dimulai");
  const menunggu = daftar.filter((s) => s.status_kesiapan !== "Dapat Dimulai");
  const hariIni = daftar.filter((s) => s.tanggal_sesi === hari).length;
  const jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()));
  const sapa = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{sapa}, {user.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Tugas pengawalan yang diberikan kepada akun ini. Sebelum mengisi berkas, catat dulu nama petugas yang bertugas. <Link href="/panduan" className="font-semibold text-primary hover:underline">Lihat panduan</Link>.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan tugas">
        <Ringkas ikon={ClipboardList} nilai={daftar.length} label="tugas aktif" nada="bg-primary/10 text-primary" />
        <Ringkas ikon={Play} nilai={siapList.length} label="siap dikerjakan" nada="bg-status-hijau/15 text-[hsl(152_70%_24%)]" />
        <Ringkas ikon={Hourglass} nilai={menunggu.length} label="menunggu izin mulai" nada="bg-status-kuning/20 text-[hsl(34_92%_30%)]" />
        <Ringkas ikon={CalendarClock} nilai={hariIni} label="dijadwalkan hari ini" nada="bg-[hsl(44_90%_60%/0.2)] text-[hsl(34_70%_28%)]" />
      </section>

      {sesi.error && <Alert tone="bahaya">Data belum bisa dibaca. Coba muat ulang halaman.</Alert>}
      {daftar.length === 0 && !sesi.error && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada tugas untuk akun ini. Operator UPT akan menugaskan Anda pada sesi kegiatan; tugas muncul di sini begitu ditugaskan.</p>
      )}

      {daftar.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {daftar.map((s) => {
            const siap = s.status_kesiapan === "Dapat Dimulai";
            const n = nTahap.get(s.session_id!) ?? 0;
            const np = nPetugas.get(s.session_id!) ?? 0;
            const isi = (
              <Card className={cn("lift flex h-full items-start gap-3 p-4", siap ? "border-l-4 border-l-gold" : "border-l-4 border-l-border opacity-90")}>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate font-semibold">{s.jenis_kegiatan} · {s.lokasi_nama}</p>
                  <p className="text-xs text-muted-foreground">{s.kode_kegiatan}{s.latihan ? " · LATIHAN" : ""} · {fmtTanggalPendek(s.tanggal_sesi)} · {s.jumlah_narapidana} WB</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {s.status_keamanan && <StatusBadge status={s.status_keamanan} />}
                    <FasePill fase={s.fase} />
                  </div>
                  {siap ? (
                    <>
                      <div className="flex items-center gap-1 pt-1" aria-label="Kemajuan tahap">
                        {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 w-8 rounded-full", i <= n ? "bg-status-hijau" : "bg-ink/10")} />)}
                        <span className="ml-1 text-[0.6875rem] text-muted-foreground">{n}/4 tahap</span>
                      </div>
                      <p className={cn("text-xs font-medium", np === 0 ? "text-[hsl(34_92%_30%)]" : "text-[hsl(152_70%_24%)]")}>
                        {np === 0 ? "Isi nama petugas dulu sebelum mengunggah berkas" : `${np} petugas tercatat`}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Menunggu izin mulai dari Kepala Pengamanan.</p>
                  )}
                </div>
                {siap ? <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden /> : <CheckCircle2 className="hidden" aria-hidden />}
              </Card>
            );
            return <li key={s.session_id}>{siap ? <Link href={`/lapangan/${s.session_id}/entri`} className="block h-full">{isi}</Link> : isi}</li>;
          })}
        </ul>
      )}

      {tugas.length > 0 && (
        <section className="space-y-3" aria-label="Tindak lanjut untuk Anda">
          <h2 className="text-lg font-semibold">Tindak lanjut untuk Anda</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {tugas.map((f) => (
              <div key={f.id} className="space-y-2 rounded-xl border bg-card p-3">
                <p className="text-sm"><Pill tone={f.status === "Terbuka" ? "kuning" : f.status === "Dikerjakan" ? "biru" : "hijau"}>{f.status}</Pill> <span className="font-medium">{f.uraian}</span></p>
                <p className="text-xs text-muted-foreground">Tenggat {fmtWaktu(f.tenggat)}</p>
                <AksiTindakLanjut f={f} peran="pelaksana" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
