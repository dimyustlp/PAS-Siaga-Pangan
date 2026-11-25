import Link from "next/link";
import { TautanGelang } from "@/components/shared/tautan-gelang";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { TahapPengawalan } from "@/components/lapangan/tahap-pengawalan";
import { EntriLapangan } from "@/components/lapangan/entri-lapangan";
import { Alert } from "@/components/ui/form";
import { PetugasSesi } from "@/components/lapangan/petugas-sesi";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { labelJenis } from "@/lib/domain/jenis-kegiatan";

export const metadata = { title: "Entri lapangan" };
export const dynamic = "force-dynamic";

export default async function EntriPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { sessionId } = await params;
  const { tab } = await searchParams;
  const cepat = tab === "catatan";
  if (!z.string().uuid().safeParse(sessionId).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: o } = await supabase.from("v_session_overview").select("*").eq("session_id", sessionId).maybeSingle();
  if (!o) notFound();

  const [logs, nom, tahap, lampiran, set, ptg, riwayat] = await Promise.all([
    supabase.from("field_logs").select("id,jenis_entri,payload,waktu_kejadian,susulan").eq("session_id", sessionId).order("waktu_kejadian", { ascending: false }).limit(200),
    supabase.rpc("daftar_nominatif", { p_session: sessionId }),
    supabase.from("tahap_pengawalan").select("tahap,jumlah_wb,jumlah_alat,waktu_sistem").eq("session_id", sessionId).order("tahap"),
    supabase.from("lampiran_tahap").select("id,tahap,butir,jenis,nama_berkas,ukuran_byte,mime,waktu_sistem,sumber").eq("session_id", sessionId).order("waktu_sistem"),
    supabase.from("pengaturan_aplikasi").select("batas_foto_mb,batas_berkas_mb,drive_aktif").maybeSingle(),
    supabase.from("petugas_sesi").select("id,nama,nip,seksi").eq("session_id", sessionId).order("created_at"),
    supabase.from("petugas_sesi").select("nama").order("created_at", { ascending: false }).limit(60),
  ]);
  const petugas = ptg.data ?? [];
  const saran = [...new Set((riwayat.data ?? []).map((x) => x.nama))].filter((n) => !petugas.some((p) => p.nama === n)).slice(0, 20);

  const siap = o.status_kesiapan === "Dapat Dimulai";
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/lapangan" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali</Link>
      <div>
        <h1 className="text-lg font-semibold">{labelJenis(o.jenis_kegiatan, o.detail_kegiatan)} · {o.lokasi_nama}</h1>
        <p className="text-xs text-muted-foreground">{o.kode_kegiatan}{o.latihan ? " · LATIHAN" : ""} · {o.upt_nama ?? o.kode_upt}</p>
      </div>
      <Link href={`/lapangan/${sessionId}/kendali`} className="inline-flex rounded-full border border-border bg-white/80 px-3 py-1.5 text-sm font-medium text-primary">Kendali sesi: status variabel, alat, pihak luar</Link>
      {o.pakai_gelang_monitor && siap && <TautanGelang kecil={false} className="w-full" />}
      {!siap ? (
        <Alert tone="waspada">Sesi ini belum mendapat izin mulai dari Kepala Pengamanan ({o.status_kesiapan}). Pencatatan dibuka setelah disetujui.</Alert>
      ) : (
        <>
        <PetugasSesi sessionId={sessionId} daftar={petugas} saran={saran} terkunci={!!o.ditutup_at} />
        {petugas.length === 0 && !cepat && (
          <Alert>Berkas persyaratan dan tahap pengawalan terbuka setelah nama petugas dicatat. Untuk keadaan darurat, tab Catatan cepat tetap bisa dipakai.</Alert>
        )}
        <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-white/80 p-1 text-sm font-medium" role="tablist">
          <Link role="tab" aria-selected={!cepat} href={`/lapangan/${sessionId}/entri`} className={`rounded-full px-3 py-2 text-center ${!cepat ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Tahap pengawalan</Link>
          <Link role="tab" aria-selected={cepat} href={`/lapangan/${sessionId}/entri?tab=catatan`} className={`rounded-full px-3 py-2 text-center ${cepat ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Catatan cepat</Link>
        </div>
        {!cepat && petugas.length === 0 ? null : !cepat ? (
          <TahapPengawalan
            sessionId={sessionId}
            rencanaWb={o.jumlah_narapidana ?? 0}
            selesai={tahap.data ?? []}
            lampiran={lampiran.data ?? []}
            batasFotoMb={set.data?.batas_foto_mb ?? 5}
            batasBerkasMb={set.data?.batas_berkas_mb ?? 10}
            modeDrive={!!set.data?.drive_aktif}
            tutup={!!o.ditutup_at}
            petugas={petugas.map((p) => p.nama)}
          />
        ) : (
        <EntriLapangan
          userId={user.id}
          sessionId={sessionId}
          status={o.status_keamanan ?? "HIJAU"}
          rencanaWb={o.jumlah_narapidana ?? 0}
          pakaiGelang={!!o.pakai_gelang_monitor}
          intervalMenit={o.interval_pemeriksaan ?? 60}
          batasPeriksaBerikut={o.batas_periksa_berikut}
          nominatif={Array.isArray(nom.data) ? nom.data : []}
          logs={logs.data ?? []}
          tutup={!!o.ditutup_at}
        />
        )}
        </>
      )}
    </div>
  );
}
