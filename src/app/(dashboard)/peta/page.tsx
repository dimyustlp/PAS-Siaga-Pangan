import { PetaMuat } from "@/components/peta/peta-muat";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { Alert } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { susunPeta } from "@/lib/domain/peta";
import { hariIniWib } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Peta kegiatan" };
export const dynamic = "force-dynamic";

export default async function PetaPage() {
  const supabase = await createClient();
  const hariIni = hariIniWib();
  // Semua dibaca bersamaan. Kegiatan, lokasi, sesi, dan alarm sudah dibatasi RLS sesuai cakupan pengguna;
  // daftar UPT dan Kanwil dibaca utuh supaya peta tetap menampilkan seluruh UPT sebagai titik latar.
  const [user, uptRes, kanwilRes, kegRes, sesiRes, alarmRes] = await Promise.all([
    requireUser(),
    supabase.from("master_upt").select("kode,nama,jenis,kelas,kab_kota,kanwil_id,latitude,longitude,titik_perkiraan").order("nama").limit(2000),
    supabase.from("master_kanwil").select("id,kode,nama,wilayah,urutan").order("urutan", { nullsFirst: false }),
    supabase
      .from("activities")
      .select("id,kode_kegiatan,jenis_kegiatan,kode_upt,tanggal_mulai,rencana_berakhir,luas_lahan_ha,lokasi_id")
      .or(`rencana_berakhir.is.null,rencana_berakhir.gte.${hariIni}`)
      .limit(3000),
    supabase
      .from("v_session_overview")
      .select("session_id,activity_id,tanggal_sesi,status_kesiapan,status_keamanan,fase,jumlah_narapidana,gangguan_terbuka")
      .is("ditutup_at", null)
      .limit(3000),
    supabase.from("gelang_alarm").select("kode_upt").eq("status", "Menunggu").limit(3000),
  ]);

  const kegiatan = kegRes.data ?? [];
  const idLokasi = [...new Set(kegiatan.map((k) => k.lokasi_id))];
  const lokasi = idLokasi.length
    ? (await supabase.from("master_locations").select("id,nama,posisi,latitude,longitude").in("id", idLokasi)).data ?? []
    : [];

  const alarmPerUpt: Record<string, number> = {};
  for (const a of alarmRes.data ?? []) if (a.kode_upt) alarmPerUpt[a.kode_upt] = (alarmPerUpt[a.kode_upt] ?? 0) + 1;

  const { upt, penanda } = susunPeta({
    upt: uptRes.data ?? [],
    kegiatan: kegiatan.map((k) => ({ ...k, jenis_kegiatan: String(k.jenis_kegiatan) })),
    lokasi,
    sesiTerbuka: (sesiRes.data ?? []).map((s) => ({ ...s, status_kesiapan: s.status_kesiapan as string | null, status_keamanan: s.status_keamanan as string | null })),
    alarmPerUpt,
    hariIni,
  });

  const kanwil = (kanwilRes.data ?? []).map((k) => ({ id: k.id, nama: k.wilayah ?? k.nama }));
  const fokus =
    user.role === "pemantau_kanwil" ? { kanwilId: user.kanwilId } : user.role === "operator" || user.role === "kepala_pengamanan" ? { kodeUpt: user.kodeUpt } : {};
  const galat = uptRes.error || kegRes.error || sesiRes.error;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {kanwil.length} Kanwil · {upt.length} UPT
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-[1.75rem]">Peta kegiatan pangan</h1>
          <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            Bentuk penanda menunjukkan letak kegiatan, warna menunjukkan kondisi lapangan. Titik abu-abu kecil adalah UPT tanpa kegiatan aktif.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <RealtimeRefresh tabel={["daily_sessions", "status_history", "activities", "gelang_alarm"]} intervalDetik={90} />
        </span>
      </div>
      {galat && <Alert tone="bahaya">Sebagian data peta belum terbaca. Muat ulang halaman.</Alert>}
      <PetaMuat upt={upt} penanda={penanda} kanwil={kanwil} fokus={fokus} />
    </div>
  );
}
