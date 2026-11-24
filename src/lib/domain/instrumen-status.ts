// Instrumen Status Pengamanan Kegiatan: delapan variabel, masing-masing dengan tanda yang diamati
// dan tindakan minimum untuk HIJAU, KUNING, MERAH, dan KRITIS. Dikutip dari pedoman.

export type StatusVar = "HIJAU" | "KUNING" | "MERAH" | "KRITIS";

export type VariabelStatus = {
  no: number;
  judul: string;
  /** Hanya variabel gelang monitor yang boleh ditandai Tidak Berlaku (bila gelang tidak ditetapkan). */
  bolehTB: boolean;
  rubrik: Record<StatusVar, { tanda: string; tindakan: string }>;
};

export const VARIABEL_STATUS: VariabelStatus[] = [
  {
    no: 1,
    judul: "Dokumen, persetujuan, dan penugasan",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "Rencana, dasar kegiatan, daftar peserta, persetujuan dan penugasan sesuai serta dapat ditunjukkan.", tindakan: "Laksanakan sesuai penugasan." },
      KUNING: { tanda: "Ada kekurangan administratif yang dapat diperbaiki sebelum pergerakan dan tidak menimbulkan keraguan tentang kewenangan/identitas.", tindakan: "Lengkapi; petugas pemeriksa mencatat perbaikan dan memverifikasinya." },
      MERAH: { tanda: "Persetujuan/dasar pengeluaran atau penugasan wajib tidak tersedia; perubahan peserta/lokasi belum disetujui.", tindakan: "Tahan pengeluaran atau hentikan perubahan kegiatan; lapor pejabat berwenang." },
      KRITIS: { tanda: "Penyimpangan dokumen disertai WB tidak ditemukan atau ancaman langsung terhadap keselamatan.", tindakan: "Tangani keadaan darurat dan eskalasi komando; pemeriksaan dokumen dilanjutkan setelah pengamanan." },
    },
  },
  {
    no: 2,
    judul: "Identitas, jumlah warga binaan, dan serah terima",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "Identitas dan jumlah sesuai pada blok, P2U, lokasi dan pergantian petugas; serah terima ditandatangani.", tindakan: "Lanjutkan pemeriksaan berkala." },
      KUNING: { tanda: "Ada kekeliruan tulis/duplikasi catatan, tetapi semua WB telah terlihat dan dihitung cocok secara langsung.", tindakan: "Koreksi dokumen di hadapan petugas terkait sebelum administrasi ditutup." },
      MERAH: { tanda: "Ada selisih hitung atau identitas belum cocok; keberadaan seluruh WB masih dalam proses pemeriksaan.", tindakan: "Hentikan pergerakan, hitung ulang di lokasi, amankan yang ada, lapor prioritas." },
      KRITIS: { tanda: "Setelah pemeriksaan langsung terdapat WB tidak ditemukan, atau terjadi dugaan pelarian.", tindakan: "Aktifkan penanganan kedaruratan dan eskalasi komando sesuai prosedur." },
    },
  },
  {
    no: 3,
    judul: "Lokasi, rute, dan batas area",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "Lokasi, akses, rute dan batas kerja sesuai rencana serta diketahui petugas.", tindakan: "Awasi sesuai rencana." },
      KUNING: { tanda: "Ada perubahan kondisi lokasi yang masih dapat dikendalikan tanpa meninggalkan batas pengawasan.", tindakan: "Perkuat pengawasan; laporkan perubahan dan tentukan pemeriksaan ulang." },
      MERAH: { tanda: "Batas lokasi/rute tidak dapat dikendalikan, atau perpindahan ke lokasi lain belum disetujui.", tindakan: "Hentikan perpindahan/kegiatan dan pulihkan penguasaan lokasi." },
      KRITIS: { tanda: "Terjadi ancaman langsung di lokasi, akses terputus saat keselamatan terancam, atau penguasaan WB hilang.", tindakan: "Amankan WB/petugas dan aktifkan keputusan komando segera." },
    },
  },
  {
    no: 4,
    judul: "Pengawal, pengawas, dan penguasaan kegiatan",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "Petugas yang ditunjuk hadir, mengetahui pembagian tugas, mampu memantau WB dan berkomunikasi.", tindakan: "Laksanakan pengawasan sesuai penugasan." },
      KUNING: { tanda: "Pergantian petugas atau hambatan pengawasan sementara terjadi tetapi serah terima dan pemantauan langsung tetap terjaga.", tindakan: "Perkuat posisi pengawasan; dokumentasikan serah terima." },
      MERAH: { tanda: "Pengawasan langsung terputus atau jumlah/penempatan petugas tidak memungkinkan penguasaan kegiatan.", tindakan: "Batasi/hentikan kegiatan dan minta dukungan petugas." },
      KRITIS: { tanda: "Petugas tidak dapat menguasai kejadian yang mengancam keselamatan atau WB lepas dari pengawasan dan tidak ditemukan.", tindakan: "Lakukan tindakan kedaruratan serta eskalasi komando segera." },
    },
  },
  {
    no: 5,
    judul: "Alat, mesin, bahan, dan sarana fisik",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "Alat, mesin dan bahan sesuai daftar; pemeriksaan teknis serta penguasaan dan penyimpanan terjaga.", tindakan: "Periksa penyerahan, penggunaan, pengembalian dan sisa bahan." },
      KUNING: { tanda: "Ada gangguan alat atau kesalahan catatan; alat/bahan tetap dikuasai dan pekerjaan terdampak dihentikan sementara.", tindakan: "Pisahkan alat/bahan; perbaiki catatan atau teknis dan periksa ulang." },
      MERAH: { tanda: "Alat/bahan berbahaya belum cocok atau belum ditemukan; mesin tidak layak atau penggunaan tidak terkendali.", tindakan: "Hentikan pekerjaan terdampak; amankan dan laporkan prioritas." },
      KRITIS: { tanda: "Alat, mesin atau bahan menimbulkan ancaman langsung terhadap nyawa, kekerasan, kebakaran atau paparan berat.", tindakan: "Hentikan kegiatan terdampak; lakukan tindakan darurat dan eskalasi." },
    },
  },
  {
    no: 6,
    judul: "Komunikasi dan pencatatan",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "Komunikasi petugas dengan komando berfungsi; log dan jalur laporan tersedia.", tindakan: "Catat dan laporkan berkala." },
      KUNING: { tanda: "Sistem/jaringan elektronik terganggu namun komunikasi alternatif serta pengawasan langsung berfungsi.", tindakan: "Gunakan log manual; laporkan gangguan dan periksa ulang." },
      MERAH: { tanda: "Pengawal tidak dapat menghubungi komando atau pembaruan keberadaan WB tidak dapat diverifikasi.", tindakan: "Batasi/hentikan kegiatan; pulihkan jalur komunikasi dan penguasaan fisik." },
      KRITIS: { tanda: "Komunikasi terputus bersamaan dengan ancaman langsung atau WB tidak ditemukan.", tindakan: "Laksanakan tindakan darurat dan eskalasi melalui jalur yang tersedia." },
    },
  },
  {
    no: 7,
    judul: "Gelang monitor warga binaan",
    bolehTB: true,
    rubrik: {
      HIJAU: { tanda: "Identitas perangkat dan pemakai cocok; daya, pemasangan, dan data berfungsi; hasil pemeriksaan dicatat.", tindakan: "Pantau dan konfirmasi setiap alarm." },
      KUNING: { tanda: "Baterai lemah/sinyal terganggu tetapi WB dilihat langsung dan berada dalam penguasaan pengawal.", tindakan: "Perkuat pengawasan fisik; catat manual; pulihkan perangkat." },
      MERAH: { tanda: "Alarm belum dapat dikonfirmasi dan keberadaan WB belum dipastikan, atau perangkat lepas/rusak tanpa pengawasan langsung yang memadai.", tindakan: "Hentikan kegiatan; periksa fisik WB dan laporkan prioritas." },
      KRITIS: { tanda: "Pemeriksaan langsung memastikan WB tidak ditemukan atau alarm terkait ancaman serius terhadap keselamatan.", tindakan: "Aktifkan tindakan kedaruratan dan eskalasi komando." },
    },
  },
  {
    no: 8,
    judul: "Keselamatan dan gangguan di lokasi",
    bolehTB: false,
    rubrik: {
      HIJAU: { tanda: "APD, tata kerja dan jalur bantuan sesuai pekerjaan; tidak ada gangguan keselamatan; kegiatan dapat dilaksanakan.", tindakan: "Lanjutkan pemantauan." },
      KUNING: { tanda: "Ada perubahan kondisi kerja yang dapat dikendalikan; pekerjaan terdampak dibatasi dan semua WB dipastikan langsung.", tindakan: "Perkuat pengawasan serta tentukan titik pemeriksaan ulang." },
      MERAH: { tanda: "APD wajib atau bantuan tidak siap, terjadi kecelakaan/paparan, konflik atau kondisi yang membuat pekerjaan tidak aman diteruskan.", tindakan: "Hentikan kegiatan, berikan pertolongan awal dan laporkan prioritas." },
      KRITIS: { tanda: "Ada ancaman langsung terhadap nyawa, paparan berat, kekerasan berat, kebakaran atau keadaan darurat besar.", tindakan: "Laksanakan penyelamatan dan segera laporkan melalui jalur komando." },
    },
  },
];
