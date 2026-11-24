// Data laporan resmi pelaksanaan kegiatan ketahanan pangan (satu sesi). Semua bisa dikirim ke browser.

import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type Role } from "@/lib/rbac";
import type { KopUpt } from "@/lib/domain/kop";

export type LampiranLaporan = {
  id: string;
  tahap: number;
  butir: string;
  jenis: string;
  nama_berkas: string;
  mime: string;
  ukuran_byte: number;
  waktu_sistem: string;
  sumber: string;
};

export type DataLaporan = {
  sessionId: string;
  kop: KopUpt;
  kegiatan: {
    kode: string;
    jenis: string;
    lokasi: string;
    lokasiAlamat: string | null;
    luasHa: number | null;
    nomorSuratPerintah: string | null;
    nomorPersetujuan: string | null;
    tanggalSesi: string;
    latihan: boolean;
  };
  keputusanMulai: { pejabat: string; waktu: string; catatan: string | null } | null;
  rencanaWb: number;
  wb: { nama: string; nomor_registrasi: string }[] | null;
  pengawal: { nama: string; nip: string | null }[];
  tahap: { tahap: number; jumlah_wb: number; jumlah_alat: number | null; isian: Record<string, unknown>; waktu_sistem: string; pengawal: string }[];
  lampiran: LampiranLaporan[];
  pengesahan: { nama: string; jabatan: string; waktu: string; catatan: string | null } | null;
  statusAkhir: string;
  ditutup: string | null;
};

export async function ambilDataLaporan(sessionId: string): Promise<DataLaporan | null> {
  const supabase = await createClient();
  const { data: sesi } = await supabase.from("daily_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!sesi) return null;
  const { data: keg } = await supabase.from("activities").select("*").eq("id", sesi.activity_id).maybeSingle();
  if (!keg) return null;

  const [lok, upt, tahap, lamp, kep, nom, ptg] = await Promise.all([
    supabase.from("master_locations").select("*").eq("id", keg.lokasi_id).maybeSingle(),
    supabase.from("master_upt").select("nama,kanwil_id,alamat,telepon,email_kantor,kota_ttd,kab_kota,kop_baris,website,faksimile,kode_pos").eq("kode", keg.kode_upt ?? "").maybeSingle(),
    supabase.from("tahap_pengawalan").select("tahap,jumlah_wb,jumlah_alat,isian,waktu_sistem,pengawal_id").eq("session_id", sessionId).order("tahap"),
    supabase.from("lampiran_tahap").select("id,tahap,butir,jenis,nama_berkas,mime,ukuran_byte,waktu_sistem,sumber").eq("session_id", sessionId).order("tahap").order("waktu_sistem"),
    supabase.from("decisions").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    supabase.rpc("daftar_nominatif", { p_session: sessionId }),
    supabase.from("petugas_sesi").select("nama,nip").eq("session_id", sessionId).order("created_at"),
  ]);
  const kanwil = upt.data?.kanwil_id
    ? (await supabase.from("master_kanwil").select("nama").eq("id", upt.data.kanwil_id).maybeSingle()).data?.nama ?? null
    : null;

  const mulai = (kep.data ?? []).find((d) => d.jenis_keputusan === "Dapat Dimulai");
  const ids = new Set<string>(sesi.petugas_ids);
  (tahap.data ?? []).forEach((t) => ids.add(t.pengawal_id));
  if (mulai) ids.add(mulai.pejabat_id);
  if (sesi.disahkan_oleh) ids.add(sesi.disahkan_oleh);
  const profil = new Map<string, { full_name: string; nip: string | null; role: string }>();
  if (ids.size > 0) {
    const { data } = await supabase.from("profiles").select("id,full_name,nip,role").in("id", [...ids]);
    (data ?? []).forEach((p) => profil.set(p.id, p));
  }
  const nama = (id: string | null | undefined) => (id ? profil.get(id)?.full_name ?? "-" : "-");

  return {
    sessionId,
    kop: {
      baris: upt.data?.kop_baris ?? null,
      kanwil,
      upt: upt.data?.nama ?? keg.kode_upt ?? "UPT",
      alamat: upt.data?.alamat ?? null,
      kodePos: upt.data?.kode_pos ?? null,
      telepon: upt.data?.telepon ?? null,
      faks: upt.data?.faksimile ?? null,
      email: upt.data?.email_kantor ?? null,
      website: upt.data?.website ?? null,
      kota: upt.data?.kota_ttd ?? upt.data?.kab_kota ?? null,
    },
    kegiatan: {
      kode: keg.kode_kegiatan,
      jenis: keg.jenis_kegiatan,
      lokasi: lok.data?.nama ?? "-",
      lokasiAlamat: keg.batas_area ?? null,
      luasHa: keg.luas_lahan_ha,
      nomorSuratPerintah: keg.nomor_surat_perintah,
      nomorPersetujuan: keg.nomor_persetujuan,
      tanggalSesi: sesi.tanggal_sesi,
      latihan: keg.latihan,
    },
    keputusanMulai: mulai ? { pejabat: nama(mulai.pejabat_id), waktu: mulai.created_at, catatan: mulai.catatan_keputusan ?? null } : null,
    rencanaWb: sesi.jumlah_narapidana,
    wb: Array.isArray(nom.data) ? nom.data.map((n) => ({ nama: n.nama, nomor_registrasi: n.nomor_registrasi })) : null,
    // Nama petugas asli yang dicatat di sesi; nama akun dipakai hanya bila belum ada yang dicatat.
    pengawal: (ptg.data ?? []).length > 0 ? (ptg.data ?? []).map((x) => ({ nama: x.nama, nip: x.nip })) : sesi.petugas_ids.map((id) => ({ nama: nama(id), nip: profil.get(id)?.nip ?? null })),
    tahap: (tahap.data ?? []).map((t) => ({
      tahap: t.tahap,
      jumlah_wb: t.jumlah_wb,
      jumlah_alat: t.jumlah_alat,
      isian: (t.isian ?? {}) as Record<string, unknown>,
      waktu_sistem: t.waktu_sistem,
      pengawal: String((t.isian as Record<string, unknown> | null)?.petugas ?? "").trim() || nama(t.pengawal_id),
    })),
    lampiran: lamp.data ?? [],
    pengesahan: sesi.disahkan_oleh && sesi.disahkan_at
      ? {
          nama: nama(sesi.disahkan_oleh),
          jabatan: ROLE_LABEL[(profil.get(sesi.disahkan_oleh)?.role ?? "kepala_pengamanan") as Role] ?? "-",
          waktu: sesi.disahkan_at,
          catatan: sesi.catatan_pengesahan,
        }
      : null,
    statusAkhir: sesi.status_keamanan,
    ditutup: sesi.ditutup_at,
  };
}
