// Penyusun data peta kegiatan pangan. Murni (tanpa impor alias) supaya bisa diuji langsung.
//
// Aturan visual yang dijaga di sini:
// - BENTUK penanda membedakan letak: lingkaran = kegiatan di dalam UPT, belah ketupat = di luar UPT.
// - WARNA penanda hanya untuk kondisi lapangan, memakai warna status yang sudah ditetapkan
//   (hijau, kuning, merah, kritis). Kegiatan yang belum berjalan tidak diberi warna status:
//   "menunggu" = garis putih, "tanpa sesi" = garis abu-abu.

export type Kondisi = "KRITIS" | "MERAH" | "KUNING" | "HIJAU" | "MENUNGGU" | "TANPA_SESI";
export type Letak = "Dalam UPT" | "Luar UPT";

export const URUTAN_KONDISI: Kondisi[] = ["KRITIS", "MERAH", "KUNING", "HIJAU", "MENUNGGU", "TANPA_SESI"];

export const LABEL_KONDISI: Record<Kondisi, string> = {
  KRITIS: "Kritis",
  MERAH: "Merah",
  KUNING: "Kuning",
  HIJAU: "Hijau",
  MENUNGGU: "Menunggu izin mulai",
  TANPA_SESI: "Belum ada sesi hari ini",
};

export type UptMasuk = {
  kode: string;
  nama: string;
  jenis: string | null;
  kelas: string | null;
  kab_kota: string | null;
  kanwil_id: string | null;
  latitude: number | null;
  longitude: number | null;
  titik_perkiraan: boolean;
};

export type KegiatanMasuk = {
  id: string;
  kode_kegiatan: string;
  jenis_kegiatan: string;
  kode_upt: string | null;
  tanggal_mulai: string;
  rencana_berakhir: string | null;
  luas_lahan_ha: number | null;
  lokasi_id: string;
};

export type LokasiMasuk = { id: string; nama: string; posisi: string; latitude: number | null; longitude: number | null };

export type SesiMasuk = {
  session_id: string | null;
  activity_id: string | null;
  tanggal_sesi: string | null;
  status_kesiapan: string | null;
  status_keamanan: string | null;
  fase: string | null;
  jumlah_narapidana: number | null;
  gangguan_terbuka: number | null;
};

export type KegiatanPeta = {
  id: string;
  kode: string;
  jenis: string;
  letak: Letak;
  lokasi: string;
  luas: number | null;
  kondisi: Kondisi;
  fase: string | null;
  wb: number | null;
  gangguan: number;
  sesiId: string | null;
  tanggalSesi: string | null;
};

export type Penanda = {
  id: string;
  kodeUpt: string;
  letak: Letak;
  lat: number;
  lng: number;
  /** Titik lokasi sendiri (bukan menumpang titik UPT). */
  titikSendiri: boolean;
  kondisi: Kondisi;
  kegiatan: KegiatanPeta[];
};

export type UptPeta = {
  kode: string;
  nama: string;
  jenis: string | null;
  kelas: string | null;
  kab: string | null;
  kanwilId: string | null;
  lat: number;
  lng: number;
  perkiraan: boolean;
  kondisi: Kondisi | null;
  jumlahDalam: number;
  jumlahLuar: number;
  alarm: number;
};

export function kondisiTerburuk(daftar: Kondisi[]): Kondisi {
  let terbaik = URUTAN_KONDISI.length - 1;
  for (const k of daftar) terbaik = Math.min(terbaik, URUTAN_KONDISI.indexOf(k));
  return URUTAN_KONDISI[terbaik];
}

const STATUS = new Set(["HIJAU", "KUNING", "MERAH", "KRITIS"]);

/** Sesi aktif terbaik untuk satu kegiatan: yang sudah boleh berjalan lebih dulu, lalu yang terbaru. */
function pilihSesi(sesi: SesiMasuk[]): SesiMasuk | null {
  if (sesi.length === 0) return null;
  return [...sesi].sort((a, b) => {
    const ja = a.status_kesiapan === "Dapat Dimulai" ? 0 : 1;
    const jb = b.status_kesiapan === "Dapat Dimulai" ? 0 : 1;
    return ja - jb || (b.tanggal_sesi ?? "").localeCompare(a.tanggal_sesi ?? "");
  })[0];
}

export function kondisiSesi(s: SesiMasuk | null): Kondisi {
  if (!s) return "TANPA_SESI";
  if (s.status_kesiapan === "Dapat Dimulai" && s.status_keamanan && STATUS.has(s.status_keamanan)) return s.status_keamanan as Kondisi;
  return "MENUNGGU";
}

/** Kegiatan dianggap aktif bila sedang dalam rentang tanggalnya, atau masih punya sesi yang belum ditutup. */
export function kegiatanAktif(k: KegiatanMasuk, hariIni: string, punyaSesiTerbuka: boolean): boolean {
  if (punyaSesiTerbuka) return true;
  return k.tanggal_mulai <= hariIni && (!k.rencana_berakhir || k.rencana_berakhir >= hariIni);
}

export function susunPeta(input: {
  upt: UptMasuk[];
  kegiatan: KegiatanMasuk[];
  lokasi: LokasiMasuk[];
  sesiTerbuka: SesiMasuk[];
  alarmPerUpt: Record<string, number>;
  hariIni: string;
}): { upt: UptPeta[]; penanda: Penanda[] } {
  const uptMap = new Map(input.upt.filter((u) => u.latitude != null && u.longitude != null).map((u) => [u.kode, u]));
  const lokasiMap = new Map(input.lokasi.map((l) => [l.id, l]));
  const sesiPerKegiatan = new Map<string, SesiMasuk[]>();
  for (const s of input.sesiTerbuka) {
    if (!s.activity_id) continue;
    const arr = sesiPerKegiatan.get(s.activity_id) ?? [];
    arr.push(s);
    sesiPerKegiatan.set(s.activity_id, arr);
  }

  const penandaMap = new Map<string, Penanda>();
  for (const k of input.kegiatan) {
    const u = k.kode_upt ? uptMap.get(k.kode_upt) : undefined;
    if (!u) continue;
    const daftarSesi = sesiPerKegiatan.get(k.id) ?? [];
    if (!kegiatanAktif(k, input.hariIni, daftarSesi.length > 0)) continue;
    const lok = lokasiMap.get(k.lokasi_id);
    const letak: Letak = lok?.posisi === "Luar UPT" ? "Luar UPT" : "Dalam UPT";
    const punyaTitik = lok?.latitude != null && lok?.longitude != null;
    const sesi = pilihSesi(daftarSesi);
    const keg: KegiatanPeta = {
      id: k.id,
      kode: k.kode_kegiatan,
      jenis: k.jenis_kegiatan,
      letak,
      lokasi: lok?.nama ?? "-",
      luas: k.luas_lahan_ha ?? null,
      kondisi: kondisiSesi(sesi),
      fase: sesi?.fase ?? null,
      wb: sesi?.jumlah_narapidana ?? null,
      gangguan: sesi?.gangguan_terbuka ?? 0,
      sesiId: sesi?.session_id ?? null,
      tanggalSesi: sesi?.tanggal_sesi ?? null,
    };
    // Kegiatan di dalam UPT digabung pada titik UPT; kegiatan di luar UPT berdiri di titik lokasinya.
    const kunci = letak === "Dalam UPT" ? `${u.kode}|dalam` : `${u.kode}|luar|${lok?.id ?? k.id}`;
    const lat = letak === "Luar UPT" && punyaTitik ? Number(lok!.latitude) : Number(u.latitude);
    const lng = letak === "Luar UPT" && punyaTitik ? Number(lok!.longitude) : Number(u.longitude);
    const p = penandaMap.get(kunci) ?? { id: kunci, kodeUpt: u.kode, letak, lat, lng, titikSendiri: letak === "Luar UPT" && punyaTitik, kondisi: "TANPA_SESI" as Kondisi, kegiatan: [] };
    p.kegiatan.push(keg);
    p.kondisi = kondisiTerburuk(p.kegiatan.map((x) => x.kondisi));
    penandaMap.set(kunci, p);
  }
  const penanda = [...penandaMap.values()].sort(
    (a, b) => URUTAN_KONDISI.indexOf(a.kondisi) - URUTAN_KONDISI.indexOf(b.kondisi)
  );

  const upt: UptPeta[] = [...uptMap.values()].map((u) => {
    const milik = penanda.filter((p) => p.kodeUpt === u.kode);
    return {
      kode: u.kode,
      nama: u.nama,
      jenis: u.jenis,
      kelas: u.kelas,
      kab: u.kab_kota,
      kanwilId: u.kanwil_id,
      lat: Number(u.latitude),
      lng: Number(u.longitude),
      perkiraan: u.titik_perkiraan,
      kondisi: milik.length ? kondisiTerburuk(milik.map((p) => p.kondisi)) : null,
      jumlahDalam: milik.filter((p) => p.letak === "Dalam UPT").reduce((a, p) => a + p.kegiatan.length, 0),
      jumlahLuar: milik.filter((p) => p.letak === "Luar UPT").reduce((a, p) => a + p.kegiatan.length, 0),
      alarm: input.alarmPerUpt[u.kode] ?? 0,
    };
  });
  return { upt, penanda };
}
