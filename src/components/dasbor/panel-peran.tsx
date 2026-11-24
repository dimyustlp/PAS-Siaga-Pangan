import Link from "next/link";
import { ArrowRight, CircleHelp, ClipboardCheck, FilePlus2, FileCheck2, Gavel, ListChecks, UserCog, Users } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { perhatianSesi, type Overview } from "@/lib/domain/attention";
import { fmtTanggalPendek } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  role: "ka_upt" | "kepala_pengamanan" | "operator";
  aktif: Overview[];
  menungguSah: Overview[];
  tanpaPengawal: Overview[];
  tlTerlambat: number;
  alarmMenunggu: number;
  now: Date;
};

function Kotak({ judul, uraian, aksi, children, nada }: { judul: string; uraian?: string; aksi?: ReactNode; children: ReactNode; nada?: "kuning" | "biru" }) {
  return (
    <section className={cn("kaca min-w-0 rounded-2xl p-4 md:p-5", nada === "kuning" && "border-l-4 border-l-gold", nada === "biru" && "border-l-4 border-l-primary")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{judul}</h2>
          {uraian && <p className="text-xs text-muted-foreground">{uraian}</p>}
        </div>
        {aksi}
      </div>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

function Daftar({ rows, kosong, href, tambahan }: { rows: Overview[]; kosong: string; href: (r: Overview) => string; tambahan?: (r: Overview) => ReactNode }) {
  if (rows.length === 0) return <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{kosong}</p>;
  return (
    <ul className="min-w-0 divide-y divide-border/60">
      {rows.slice(0, 6).map((r) => (
        <li key={r.session_id}>
          <Link href={href(r)} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{r.jenis_kegiatan} · {r.lokasi_nama}</span>
              <span className="block truncate text-xs text-muted-foreground">{r.kode_kegiatan} · {fmtTanggalPendek(r.tanggal_sesi)} · {r.jumlah_narapidana} WB{tambahan ? ` · ${tambahan(r)}` : ""}</span>
            </span>
            {r.status_keamanan && r.status_kesiapan === "Dapat Dimulai" && <StatusBadge status={r.status_keamanan} />}
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
      {rows.length > 6 && <li className="py-2 text-xs text-muted-foreground">dan {rows.length - 6} lainnya</li>}
    </ul>
  );
}

function Pintas({ href, ikon: Ikon, judul, uraian }: { href: string; ikon: typeof Gavel; judul: string; uraian: string }) {
  return (
    <Link href={href} className="kaca lift flex items-start gap-3 rounded-2xl p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Ikon className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0"><span className="block font-semibold">{judul}</span><span className="block text-xs text-muted-foreground">{uraian}</span></span>
    </Link>
  );
}

/** Isi dasbor yang khas tiap peran UPT: Ka.UPT memantau dan mengesahkan, Kepala Pengamanan memutuskan, Operator menyiapkan. */
export function PanelPeran({ role, aktif, menungguSah, tanpaPengawal, tlTerlambat, alarmMenunggu, now }: Props) {
  const menunggu = aktif.filter((r) => r.status_kesiapan === "Menunggu");
  const perlu = aktif.filter((r) => perhatianSesi(r, now).length > 0);

  if (role === "ka_upt") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Kotak judul="Menunggu pengesahan Anda" uraian="Kegiatan yang keempat tahapnya selesai dan laporannya belum disahkan." nada="kuning" aksi={<Link href="/laporan?status=menunggu" className="text-xs font-semibold text-primary hover:underline">Buka laporan</Link>}>
          <Daftar rows={menungguSah} kosong="Tidak ada laporan yang menunggu pengesahan." href={(r) => `/sesi/${r.session_id}`} />
        </Kotak>
        <Kotak judul="Perlu perhatian pimpinan" uraian="Status merah atau kritis, pemeriksaan terlambat, atau gangguan belum diverifikasi.">
          <Daftar rows={perlu} kosong="Semua kegiatan berjalan sesuai rencana." href={(r) => `/sesi/${r.session_id}`} tambahan={(r) => perhatianSesi(r, now)[0]?.teks ?? ""} />
        </Kotak>
      </div>
    );
  }

  if (role === "kepala_pengamanan") {
    return (
      <div className="space-y-4">
        <Kotak judul="Antrean keputusan kesiapan" uraian="Sesi yang menunggu izin mulai dari Anda. Pengawal belum bisa mencatat sebelum Anda menyetujui." nada="biru" aksi={<Link href="/keputusan" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Gavel className="h-3.5 w-3.5" aria-hidden />Buka antrean</Link>}>
          <Daftar rows={menunggu} kosong="Tidak ada sesi yang menunggu keputusan." href={(r) => "/keputusan"} />
        </Kotak>
        <div className="grid gap-4 lg:grid-cols-2">
          <Kotak judul="Pantauan pengamanan" uraian="Hal yang perlu ditindaklanjuti sekarang.">
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between gap-3"><span>Tindak lanjut lewat tenggat</span><b className={tlTerlambat ? "text-status-merah" : "text-muted-foreground"}>{tlTerlambat}</b></li>
              <li className="flex justify-between gap-3"><span>Alarm gelang menunggu konfirmasi</span><b className={alarmMenunggu ? "text-status-merah" : "text-muted-foreground"}>{alarmMenunggu}</b></li>
              <li className="flex justify-between gap-3"><span>Kegiatan perlu perhatian</span><b className={perlu.length ? "text-[hsl(34_92%_30%)]" : "text-muted-foreground"}>{perlu.length}</b></li>
            </ul>
          </Kotak>
          <Kotak judul="Menunggu pengesahan Ka.UPT" uraian="Empat tahap lengkap; tinggal disahkan Ka.UPT." aksi={<Link href="/laporan?status=menunggu" className="text-xs font-semibold text-primary hover:underline">Buka laporan</Link>}>
            <Daftar rows={menungguSah} kosong="Tidak ada laporan yang menunggu Ka.UPT." href={(r) => `/sesi/${r.session_id}`} />
          </Kotak>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Pintas href="/kegiatan" ikon={FilePlus2} judul="Rencana baru" uraian="Susun rencana kegiatan pangan" />
        <Pintas href="/rencana" ikon={ClipboardCheck} judul="Rincian rencana" uraian="Lengkapi data, tambah sesi, tugaskan pengawal" />
        <Pintas href="/tindak-lanjut" ikon={ListChecks} judul="Tindak lanjut" uraian="Pantau pelaksanaan" />
        <Pintas href="/kop-surat" ikon={FileCheck2} judul="Kop surat" uraian="Atur kop untuk dokumen UPT" />
        <Pintas href="/akun" ikon={Users} judul="Akun UPT" uraian="Buat akun Ka.UPT, Kepala Pengamanan, Pengawal" />
        <Pintas href="/panduan" ikon={CircleHelp} judul="Panduan peran" uraian="Tugas dan cara pakai tiap peran" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Kotak judul="Belum ada pengawal" uraian="Sesi aktif yang belum ditugaskan ke Pengawal. Tanpa penugasan, tugas belum muncul di dasbor Pengawal." nada="kuning" aksi={<UserCog className="h-4 w-4 text-muted-foreground" aria-hidden />}>
          <Daftar rows={tanpaPengawal} kosong="Semua sesi aktif sudah punya pengawal." href={(r) => `/rencana/${r.activity_id}`} />
        </Kotak>
        <Kotak judul="Menunggu keputusan Kepala Pengamanan" uraian="Sesi yang sudah disiapkan, tinggal menunggu izin mulai.">
          <Daftar rows={menunggu} kosong="Tidak ada sesi yang menunggu keputusan." href={(r) => `/sesi/${r.session_id}`} />
        </Kotak>
      </div>
    </div>
  );
}
