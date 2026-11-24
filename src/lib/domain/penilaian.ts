// Instrumen Penilaian Pelaksanaan Pengamanan Kegiatan Ketahanan Pangan Pemasyarakatan (19 indikator)
// beserta rumus skor dan kategorinya, sesuai pedoman. Logika murni agar mudah diuji.

export type IndikatorPenilaian = {
  no: number;
  judul: string;
  uraian: string;
  acuan: string;
  /** Keterangan kapan TB boleh dipakai; null bila indikator selalu berlaku. */
  tb: string | null;
};

export const INDIKATOR_PENILAIAN: IndikatorPenilaian[] = [
  { no: 1, judul: "Persetujuan kegiatan", uraian: "Kegiatan disetujui pejabat berwenang sebelum dilaksanakan.", acuan: "Persetujuan dan rencana kegiatan.", tb: null },
  { no: 2, judul: "Dasar pergerakan atau pengeluaran", uraian: "Dokumen yang dipersyaratkan tersedia dan sesuai kegiatan serta peserta.", acuan: "Dokumen pergerakan atau pengeluaran; daftar peserta.", tb: null },
  { no: 3, judul: "Penugasan petugas", uraian: "Pengawal, pengawas lokasi, dan penanggung jawab ditetapkan serta memahami tugasnya.", acuan: "Dokumen penugasan; pembagian tugas; konfirmasi petugas.", tb: null },
  { no: 4, judul: "Rencana pengamanan", uraian: "Rencana memuat peserta, kelompok, lokasi, area aktif, petugas, rute, komunikasi, dan pengembalian.", acuan: "Rencana pengamanan.", tb: null },
  { no: 5, judul: "Pemeriksaan kesiapan", uraian: "Aspek kesiapan yang berlaku diperiksa dan kekurangan diselesaikan sebelum kegiatan dimulai.", acuan: "Daftar periksa kesiapan; bukti perbaikan.", tb: null },
  { no: 6, judul: "Pengendalian lokasi", uraian: "Batas area aktif, akses, dan penempatan pengawas sesuai rencana serta kondisi lapangan.", acuan: "Denah; catatan pemeriksaan; pengamatan lapangan.", tb: null },
  { no: 7, judul: "Pengeluaran dan serah terima", uraian: "Identitas dan jumlah WB diperiksa serta dicatat pada setiap penyerahan tanggung jawab.", acuan: "Catatan blok; ekspedisi; catatan serah terima.", tb: null },
  { no: 8, judul: "Pemeriksaan akses", uraian: "P2U atau petugas pada titik pemeriksaan yang ditetapkan memeriksa dokumen, peserta, barang, dan alat sebelum memberikan akses.", acuan: "Catatan pemeriksaan keluar-masuk.", tb: null },
  { no: 9, judul: "Pengawalan", uraian: "Perjalanan dilaksanakan sesuai penugasan, rute, dan pengaturan pengamanan.", acuan: "Catatan pengawalan; konfirmasi petugas.", tb: null },
  { no: 10, judul: "Pengawasan di lokasi", uraian: "Keberadaan seluruh WB dipastikan melalui pengawasan dan pemeriksaan berkala sesuai rencana.", acuan: "Catatan penghitungan; pemeriksaan; serah terima pengawas.", tb: null },
  { no: 11, judul: "Alat dan sarana", uraian: "Alat kerja, sarana pengamanan, komunikasi, dan perlengkapan keselamatan diperiksa serta penggunaannya dikendalikan.", acuan: "Daftar alat; catatan pemeriksaan; pengamatan lapangan.", tb: null },
  { no: 12, judul: "Gelang monitor", uraian: "Jika ditetapkan, kesesuaian perangkat dengan pemakai, keberfungsian, dan tindak lanjut gangguan diperiksa serta dicatat.", acuan: "Daftar perangkat dan pemakai; catatan pemeriksaan dan gangguan.", tb: "TB jika tidak ditetapkan." },
  { no: 13, judul: "Penanganan gangguan", uraian: "Temuan atau gangguan segera dilaporkan dan ditangani sesuai kewenangan.", acuan: "Catatan kejadian; waktu laporan; tindakan; hasil verifikasi.", tb: "TB jika tidak ada kejadian atau temuan." },
  { no: 14, judul: "Pengembalian", uraian: "Identitas, jumlah WB, dan alat diperiksa serta dilakukan serah terima kepada petugas penerima.", acuan: "Catatan pengembalian; pemeriksaan masuk; penerimaan blok.", tb: null },
  { no: 15, judul: "Pencocokan akhir", uraian: "Catatan pengeluaran, keberadaan di lokasi, pengembalian, dan alat dicocokkan; setiap selisih ditindaklanjuti.", acuan: "Hasil pencocokan; bukti penyelesaian temuan.", tb: null },
  { no: 16, judul: "Pencatatan aplikasi", uraian: "Data PAS-SIAGA Pangan sesuai dokumen sumber serta mencantumkan waktu kejadian atau pemeriksaan dan waktu pembaruan.", acuan: "Catatan sumber; riwayat pembaruan aplikasi.", tb: null },
  { no: 17, judul: "Pencatatan saat gangguan jaringan", uraian: "Pencatatan manual tetap berjalan; data dimasukkan setelah layanan pulih dengan mempertahankan waktu kejadian asli.", acuan: "Log manual; hasil pemasukan kembali data.", tb: "TB jika tidak ada gangguan jaringan." },
  { no: 18, judul: "Pelaporan dan penutupan", uraian: "Laporan diperiksa dan pelaksanaan harian ditutup setelah persyaratan terpenuhi.", acuan: "Laporan akhir; catatan penutupan. WB yang belum ditemukan tidak dicatat selesai.", tb: null },
  { no: 19, judul: "Tindak lanjut evaluasi", uraian: "Temuan memiliki tindakan perbaikan, penanggung jawab, batas waktu, dan hasil pemeriksaan penyelesaian.", acuan: "Daftar tindak lanjut; bukti perbaikan.", tb: "TB jika tidak ada temuan yang perlu ditindaklanjuti." },
];

export type KategoriPenilaian = "Kurang" | "Cukup" | "Baik" | "Sangat Baik";

export type BarisSkor = { no: number; skor: 0 | 1 | 2 | null; tb: boolean };

export type HasilPenilaian = {
  jumlahIndikator: number;
  jumlahTB: number;
  berlaku: number;
  skor2: number;
  skor1: number;
  skor0: number;
  /** Indikator berlaku yang belum diberi skor (penilaian belum lengkap). */
  belumDinilai: number;
  totalSkor: number;
  skorMaksimal: number;
  /** null bila tidak ada indikator yang berlaku atau penilaian belum lengkap. */
  persentase: number | null;
  kategori: KategoriPenilaian | null;
  lengkap: boolean;
  /** Alasan persentase tidak dapat dihitung. */
  catatan: string | null;
};

/** Kategori menurut pedoman: Kurang 0-50%; Cukup >50-70%; Baik >70-90%; Sangat Baik >90-100%. */
export function kategoriDari(persen: number): KategoriPenilaian {
  if (persen > 90) return "Sangat Baik";
  if (persen > 70) return "Baik";
  if (persen > 50) return "Cukup";
  return "Kurang";
}

/**
 * Rumus pedoman:
 * indikator berlaku = 19 - jumlah TB; total skor = (jumlah skor 2 x 2) + jumlah skor 1;
 * skor maksimal = indikator berlaku x 2; persentase = total skor / skor maksimal x 100%.
 */
export function hitungPenilaian(baris: BarisSkor[]): HasilPenilaian {
  const jumlahIndikator = INDIKATOR_PENILAIAN.length;
  const peta = new Map(baris.map((b) => [b.no, b]));
  let jumlahTB = 0;
  let skor2 = 0;
  let skor1 = 0;
  let skor0 = 0;
  for (const i of INDIKATOR_PENILAIAN) {
    const b = peta.get(i.no);
    if (b?.tb) jumlahTB += 1;
    else if (b?.skor === 2) skor2 += 1;
    else if (b?.skor === 1) skor1 += 1;
    else if (b?.skor === 0) skor0 += 1;
  }
  const berlaku = jumlahIndikator - jumlahTB;
  const belumDinilai = berlaku - (skor2 + skor1 + skor0);
  const totalSkor = skor2 * 2 + skor1;
  const skorMaksimal = berlaku * 2;
  let persentase: number | null = null;
  let catatan: string | null = null;
  if (berlaku === 0) catatan = "Tidak ada indikator yang berlaku, sehingga persentase tidak dapat dihitung. Jelaskan alasannya pada lembar penilaian.";
  else if (belumDinilai > 0) catatan = `${belumDinilai} indikator yang berlaku belum diberi skor.`;
  else persentase = Math.round((totalSkor / skorMaksimal) * 1000) / 10;
  return {
    jumlahIndikator,
    jumlahTB,
    berlaku,
    skor2,
    skor1,
    skor0,
    belumDinilai,
    totalSkor,
    skorMaksimal,
    persentase,
    kategori: persentase === null ? null : kategoriDari(persentase),
    lengkap: belumDinilai === 0 && berlaku > 0,
    catatan,
  };
}

export const CATATAN_KATEGORI =
  "Kategori menunjukkan tingkat pemenuhan pelaksanaan pengamanan. Kategori ini tidak menggantikan status operasional HIJAU, KUNING, MERAH, atau KRITIS dan tidak menjadi dasar tunggal pemberian izin kegiatan.";

export const PETUNJUK_PENILAIAN = [
  "Periksa dokumen sumber, cocokkan catatan, lakukan pengamatan lapangan dan konfirmasi kepada petugas yang bertanggung jawab. Jika menggunakan sampel, catat kegiatan dan tanggal yang diperiksa pada kolom bukti.",
  "Berikan satu pilihan 2, 1, 0, atau TB untuk setiap indikator. Cantumkan bukti, kekurangan, dan alasan penggunaan TB.",
  "Skor 2: seluruh ketentuan pada indikator dipenuhi dan dapat dibuktikan. Skor 1: dipenuhi sebagian dan masih terdapat kekurangan. Skor 0: tidak dipenuhi atau tidak dapat dibuktikan.",
  "TB berarti Tidak Berlaku pada kegiatan yang diperiksa dan tidak dimasukkan dalam skor maksimal. TB tidak digunakan untuk menutupi kekurangan pelaksanaan.",
  "Setiap skor 0 atau 1 harus ditindaklanjuti. Temuan yang menyangkut dasar pengeluaran, keberadaan WB, penguasaan pengamanan, atau keselamatan segera ditangani tanpa menunggu penilaian selesai.",
];
