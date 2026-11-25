// Isi acuan operasional dari Pedoman Penyelenggaraan Pengamanan Kegiatan Ketahanan Pangan Pemasyarakatan:
// status pengamanan, pokok pedoman, dan aturan pencatatan data. Diubah hanya mengikuti pedoman yang berlaku.

export type StatusKey = "HIJAU" | "KUNING" | "MERAH" | "KRITIS";

export const PANDUAN_STATUS: Record<StatusKey, { kondisi: string; minimum: string; ringkas: string }> = {
  HIJAU: {
    kondisi: "Seluruh kendali wajib terpenuhi; jumlah WB cocok dan kegiatan dalam penguasaan petugas.",
    minimum: "Lanjutkan sesuai persetujuan dan lakukan pemantauan rutin.",
    ringkas: "Lanjutkan, pantau rutin, catat.",
  },
  KUNING: {
    kondisi: "Ada penyimpangan yang terkendali; seluruh WB terlihat langsung, jumlah cocok, dan pengawasan tetap berjalan.",
    minimum: "Perkuat pengawasan, lakukan perbaikan, tetapkan penanggung jawab dan pemeriksaan ulang.",
    ringkas: "Perkuat pengawasan, perbaiki, tetapkan penanggung jawab dan pemeriksaan ulang.",
  },
  MERAH: {
    kondisi: "Kendali utama belum dapat dipastikan, misalnya selisih hitung, pengawasan terputus, atau alarm belum dikonfirmasi.",
    minimum: "Batasi atau hentikan kegiatan; hitung WB, pulihkan penguasaan dan laporkan prioritas.",
    ringkas: "Batasi atau hentikan kegiatan, hitung WB, pulihkan penguasaan, laporkan.",
  },
  KRITIS: {
    kondisi: "WB tidak ditemukan setelah pemeriksaan langsung, atau ada ancaman langsung terhadap keselamatan.",
    minimum: "Hentikan kegiatan; amankan WB dan petugas; aktifkan eskalasi komando dan tindakan kedaruratan.",
    ringkas: "Hentikan kegiatan, amankan WB dan petugas, eskalasi komando.",
  },
};

export const CATATAN_STATUS = [
  "Status keseluruhan mengikuti temuan terberat yang masih berlangsung: KRITIS lebih tinggi daripada MERAH, KUNING, dan HIJAU. Status tidak dijumlahkan atau dirata-ratakan.",
  "Variabel yang tidak berlaku diberi tanda tidak berlaku disertai alasan. Tindakan awal tidak menunggu pembaruan dasbor.",
  "Selisih yang belum terjelaskan sekurang-kurangnya MERAH. WB tidak ditemukan setelah pemeriksaan langsung, atau ancaman langsung terhadap keselamatan, berstatus KRITIS.",
  "Status otomatis atau pilihan yang kosong tidak boleh menurunkan status tertinggi yang masih berlaku.",
  "Penurunan status dilakukan pejabat berwenang setelah verifikasi pemulihan berdasarkan pemeriksaan langsung, dengan catatan pemeriksaan, berita acara, atau dokumentasi. Riwayat perubahan tetap disimpan.",
  "Saat jaringan atau gelang terganggu, petugas tetap mengawasi langsung dan mencatat secara manual. Ketiadaan data tidak berarti keadaan aman.",
  "Status menunjukkan kondisi pengamanan menurut temuan lapangan, bukan penilaian risiko pribadi WB. Keputusan kesiapan sebelum berangkat, tahap pelaksanaan harian, dan status pengamanan lapangan adalah tiga hal yang berbeda.",
];

export const POKOK_SOP: { bagian: string; isi: string }[] = [
  { bagian: "Maksud dan ruang lingkup", isi: "Pedoman berlaku bagi Lapas dan Rutan untuk kegiatan ketahanan pangan di dalam maupun di luar perimeter pengamanan utama. Pengamanan dilaksanakan secara terencana, tertib, terukur, dan dapat dipertanggungjawabkan, dengan pemeriksaan kesiapan, pengawalan, pengawasan, pengembalian, serta pencatatan dan pelaporan." },
  { bagian: "Pembagian peran", isi: "Kepala UPT menyetujui kegiatan dan penugasan serta mengesahkan tindak lanjut dan evaluasi. Kepala Pengamanan memeriksa kesiapan, merencanakan pengawasan, menetapkan penanggung jawab operasional, dan memverifikasi laporan. Bimker menyiapkan pekerjaan, komoditas, tahap produksi, peserta, alat, mesin, bahan, APD, lahan, dan koordinasi mitra. Karupam atau komandan jaga mengoordinasikan petugas blok dan pergerakan, memastikan serah terima, serta meneruskan temuan. Petugas blok dan P2U mencocokkan identitas, jumlah, dokumen, alat, dan waktu pergerakan. Pengawal dan pengawas lokasi menguasai pergerakan, memeriksa keberadaan WB, mencatat temuan, dan melapor. Petugas perangkat memeriksa gelang dan mencatat alarm. Operator memasukkan data dari petugas lapangan dan catatan P2U serta menjaga jejak pembaruan. Kanwil memantau, menyupervisi, memverifikasi laporan UPT, dan memberi arahan perbaikan. Ditjenpas menetapkan kebijakan, membina secara teknis, dan memantau secara nasional." },
  { bagian: "Dokumen sebelum kegiatan", isi: "Dokumen a sampai m: rencana kegiatan, daftar nominatif, persetujuan, rencana pengamanan, surat perintah, dasar pengeluaran dan rencana perjalanan (khusus di luar perimeter), inventaris alat dan bahan, izin lahan mitra, perubahan rencana, denah pengamanan, daftar pihak luar dan kendaraan, serta catatan kelayakan teknis, APD, dan pertolongan pertama. Keputusan Dapat Dimulai tidak menggantikan persetujuan kegiatan atau dasar pengeluaran, dan tidak menggantikan pemeriksaan P2U." },
  { bagian: "Kesiapan pengamanan (aspek A sampai F)", isi: "Sebelum setiap pelaksanaan harian diperiksa enam aspek: persetujuan dan penugasan; daftar peserta dan rencana pergerakan; lokasi dan pengawasan; alat, mesin, bahan, dan keselamatan kerja; komunikasi dan pencatatan; serta gelang monitor (tidak berlaku bila tidak ditetapkan). Kepala Pengamanan memutuskan Dapat Dimulai, Perbaiki Dulu, atau Ditunda. Keputusan Ditunda memuat alasan dan syarat pengajuan ulang." },
  { bagian: "Kebutuhan petugas dan beban pengawasan", isi: "Kebutuhan petugas ditentukan dari luas lahan aktif pada hari itu, jumlah dan sebaran kelompok, kemampuan melihat langsung keberadaan peserta, akses masyarakat, penggunaan alat, komunikasi, serta pergantian tugas. Perbandingan peserta atau luas per petugas hanya informasi beban, bukan satu-satunya dasar kecukupan. Bila petugas belum cukup, kurangi peserta atau area, bagi jadwal kelompok, tambah petugas, atau tunda." },
  { bagian: "Perubahan rencana dan koreksi data", isi: "Perubahan yang memengaruhi pengamanan diperiksa ulang kesiapannya dan disetujui pejabat berwenang sebelum dijalankan. Catat rencana awal, perubahan, alasan, waktu, pejabat, dan bukti persetujuan. Salah tulis dikoreksi sesuai dokumen sumber dengan mencatat data sebelum dan sesudah, nama petugas, dan waktu koreksi." },
  { bagian: "Status pengamanan", isi: "Delapan variabel dinilai HIJAU, KUNING, MERAH, atau KRITIS dengan bukti. Status keseluruhan mengikuti temuan terberat yang masih berlangsung. Penurunan memerlukan bukti pemulihan dan verifikasi pejabat berwenang." },
  { bagian: "Alat, mesin, bahan, dan pihak luar", isi: "Pengendalian dilakukan lewat pencatatan penerimaan, penyerahan, penggunaan, pengembalian, dan penyimpanan. Alat tajam dan bahan yang dikendalikan ditempatkan pada lokasi dengan akses terbatas; bahan kimia dan pestisida disimpan terpisah dari bahan pangan dan area hunian. Selisih diperiksa dan dilaporkan segera. Pihak luar dan kendaraan hanya mengakses lokasi sesuai persetujuan dan pemeriksaan. Pendamping atau mitra tidak memberikan izin pergerakan WB. Pengangkutan hasil produksi dicatat jenis, jumlah, asal, tujuan, kendaraan, serta petugas penyerah dan penerima." },
  { bagian: "Gelang monitor", isi: "Penggunaan ditetapkan pejabat berwenang dengan mencantumkan kegiatan, pemakai, perangkat, waktu, dan petugas pengelola. Gelang tidak digunakan sebagai hukuman disiplin dan tidak menggantikan pengawasan langsung. Alarm dikonfirmasi petugas di lokasi, lalu waktu alarm, sumber laporan, hasil pemeriksaan, keputusan, dan tindakan dicatat. Bila gelang tidak ditetapkan, variabelnya tidak berlaku, sedangkan kewajiban pengamanan lain tetap berjalan." },
  { bagian: "Pelaporan dan kualitas data", isi: "Dasbor menampilkan waktu pemeriksaan lapangan dan waktu data diterima. Entri terlambat, susulan, atau belum diverifikasi tidak ditampilkan sebagai keadaan mutakhir. Saat jaringan terputus petugas mencatat manual, lalu memasukkannya kembali dengan waktu kejadian asli. Operator tidak mengubah hasil penghitungan atau keputusan komando tanpa sumber dan kewenangan yang tercatat." },
  { bagian: "Pengembalian dan penutupan", isi: "Pejabat pengamanan memverifikasi identitas dan jumlah peserta, alat, pemeriksaan wajib, serah terima, dan gangguan. Pengembalian sebagian dicatat per penyerahan dan dijumlahkan tanpa menghitung peserta dua kali. Kepala Pengamanan menutup pelaksanaan harian setelah kecocokan dikonfirmasi, gangguan diverifikasi, dan temuan yang menghambat pengamanan diselesaikan. Tahap Sudah Kembali ke Blok belum berarti siap ditutup." },
  { bagian: "Monitoring dan evaluasi", isi: "Pelaksanaan dinilai dengan 19 indikator berskor 2, 1, 0, atau TB. Indikator berlaku = 19 dikurangi TB; total skor = (jumlah skor 2 × 2) + jumlah skor 1; skor maksimal = indikator berlaku × 2; persentase = total skor ÷ skor maksimal × 100. Kategori: Kurang 0–50%, Cukup di atas 50–70%, Baik di atas 70–90%, Sangat Baik di atas 90–100%. Kategori tidak menggantikan status operasional. Setiap skor 0 atau 1 ditindaklanjuti dengan penanggung jawab, batas waktu, dan pemeriksaan penyelesaian." },
];
