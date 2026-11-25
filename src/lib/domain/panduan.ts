// Isi halaman Panduan peran: tugas, urutan kerja, dan menu yang dipakai tiap peran.
import type { Role } from "@/lib/rbac";

export type Panduan = {
  role: Role;
  ringkas: string;
  tugas: string[];
  langkah: { judul: string; isi: string; menu?: { href: string; label: string } }[];
  catatan?: string[];
};

export const PANDUAN: Panduan[] = [
  {
    role: "operator",
    ringkas: "Menyiapkan kegiatan ketahanan pangan di UPT sampai siap diputuskan, dan mengatur siapa yang bertugas. Dalam Pedoman, peran ini memasukkan data dari Bimker dan petugas lapangan.",
    tugas: [
      "Menyusun rencana kegiatan dan melengkapi rinciannya.",
      "Membuat sesi harian, satu per satu sesuai jadwal.",
      "Menugaskan Pengawal pada tiap sesi.",
      "Menyiapkan nominatif WB, dokumen, dan aspek kesiapan sebelum diputuskan Kepala Pengamanan.",
      "Membuat dan mengelola akun Ka.UPT, Kepala Pengamanan, dan Pengawal di UPT sendiri.",
    ],
    langkah: [
      { judul: "Buat rencana kegiatan", isi: "Pilih jenis kegiatan, lokasi, dan tanggal mulai. Setelah disimpan, Anda langsung dibawa ke halaman rincian rencana.", menu: { href: "/kegiatan", label: "Kegiatan" } },
      { judul: "Lengkapi rincian", isi: "Isi tiga bagian: periode dan luas, nomor surat dan persetujuan, serta pengamanan di lokasi (titik komunikasi, batas area, rute, akses warga). Tiap bagian punya tombol simpan sendiri.", menu: { href: "/rencana", label: "Rencana kegiatan" } },
      { judul: "Tambah sesi harian", isi: "Di halaman rincian, buat sesi per tanggal. Tentukan jarak waktu hitung WB dan apakah memakai gelang monitor." },
      { judul: "Tugaskan Pengawal", isi: "Pada tabel sesi, tekan Tugaskan pengawal lalu pilih orangnya. Tugas langsung muncul di dasbor Pengawal; ia baru bisa bekerja setelah Kepala Pengamanan menyatakan siap." },
      { judul: "Siapkan sesi", isi: "Buka sesi, lengkapi nominatif WB, dokumen surat perintah dan rencana pengamanan, serta aspek kesiapan A sampai F. Sesi yang lengkap masuk antrean keputusan Kepala Pengamanan." },
      { judul: "Centang dokumen wajib a sampai m", isi: "Di halaman Kendali sesi, tandai dokumen yang sudah tersedia. Nominatif, rencana pengamanan, dan surat perintah terisi otomatis. Dokumen f dan g hanya untuk kegiatan di luar perimeter. Tanpa dokumen lengkap, Kepala Pengamanan belum bisa memutuskan Dapat Dimulai.", menu: { href: "/kegiatan", label: "Kegiatan" } },
      { judul: "Catat lahan aktif dan kelompok kerja", isi: "Isi lahan aktif hari itu, kelompok kerja, pengawas, pengganti, dan jalur serah terima. Perubahan rencana dicatat bersama alasan dan pejabat yang menyetujui." },
      { judul: "Cetak formulir lampiran", isi: "Sepuluh formulir pedoman tersedia di menu Formulir pada tiap sesi, lengkap dengan kop UPT dan siap dicetak." },
      { judul: "Atur kop surat", isi: "Isi kop surat UPT agar dokumen persuratan memakai identitas UPT. Isinya bisa diubah sesuai kondisi di lapangan.", menu: { href: "/kop-surat", label: "Kop surat UPT" } },
      { judul: "Buat akun pegawai UPT", isi: "Buat akun Ka.UPT, Kepala Pengamanan, dan Pengawal. Berikan kata sandi awal langsung ke pemiliknya. Akun hanya bisa dibuat untuk UPT Anda sendiri.", menu: { href: "/akun", label: "Akun UPT" } },
    ],
    catatan: ["Satu akun Pengawal boleh dipakai bergantian beberapa petugas, karena nama petugas dicatat tiap kali bertugas.", "Operator tidak bisa membuat akun Operator lain dan tidak bisa melihat akun UPT lain.", "Operator tidak mengubah hasil penghitungan atau keputusan komando tanpa sumber dan kewenangan yang tercatat.", "Rencana pengamanan disusun Kepala Pengamanan. Operator mengunggahnya sebagai dokumen d."],
  },
  {
    role: "kepala_pengamanan",
    ringkas: "Memutuskan kesiapan pengamanan, menangani gangguan dan tindak lanjut, serta memantau kegiatan berjalan.",
    tugas: [
      "Memeriksa kesiapan tiap sesi lalu memberi izin mulai.",
      "Memantau status keamanan kegiatan yang sedang berjalan.",
      "Menindaklanjuti gangguan, alarm gelang, dan tindak lanjut yang terlambat.",
    ],
    langkah: [
      { judul: "Buka antrean keputusan", isi: "Sesi yang sudah disiapkan Operator muncul di sini. Periksa nominatif, dokumen, dan indikator kesiapan.", menu: { href: "/keputusan", label: "Keputusan" } },
      { judul: "Beri keputusan", isi: "Pilih Dapat Dimulai, Perbaiki Dulu, atau Ditunda. Dapat Dimulai butuh dokumen a sampai m lengkap. Ditunda wajib memuat alasan dan syarat pengajuan ulang." },
      { judul: "Isi status per variabel", isi: "Di Kendali sesi, catat status Hijau, Kuning, Merah, atau Kritis untuk tiap dari delapan variabel, dengan temuan dan bukti. Status keseluruhan mengikuti temuan terberat. Penurunan status hanya setelah ada bukti pemulihan." },
      { judul: "Verifikasi entri lapangan", isi: "Entri yang terlambat atau susulan ditandai. Verifikasi sebelum dianggap data mutakhir." },
      { judul: "Pantau saat kegiatan berjalan", isi: "Dasbor menampilkan warna status Hijau, Kuning, Merah, dan Kritis. Perhatikan kegiatan yang tidak mengirim data atau terlambat memeriksa.", menu: { href: "/", label: "Dasbor" } },
      { judul: "Tindak lanjuti temuan", isi: "Buat dan pantau tindak lanjut sampai selesai dan diverifikasi.", menu: { href: "/tindak-lanjut", label: "Tindak lanjut" } },
      { judul: "Baca laporan", isi: "Laporan yang tahapnya sudah lengkap bisa dibaca dan diunduh. Pengesahan dilakukan Ka.UPT.", menu: { href: "/laporan", label: "Laporan kegiatan" } },
      { judul: "Isi penilaian pelaksanaan", isi: "Buat penilaian untuk kegiatan yang selesai. Sembilan belas indikator terisi saran otomatis dari data aplikasi; koreksi skornya, lampirkan bukti, lalu kunci.", menu: { href: "/penilaian", label: "Penilaian" } },
    ],
  },
  {
    role: "ka_upt",
    ringkas: "Memimpin UPT: memantau seluruh kegiatan, mengesahkan laporan, dan menilai risiko serta evaluasi.",
    tugas: [
      "Memantau ringkasan kegiatan dan kegiatan yang perlu perhatian pimpinan.",
      "Mengesahkan laporan kegiatan.",
      "Membaca evaluasi dan risiko sebagai dasar kebijakan UPT.",
    ],
    langkah: [
      { judul: "Mulai dari dasbor", isi: "Tiga angka di bagian atas menunjukkan laporan menunggu pengesahan, kegiatan perlu perhatian, dan kegiatan berjalan.", menu: { href: "/", label: "Dasbor" } },
      { judul: "Sahkan laporan", isi: "Buka laporan yang tahapnya sudah lengkap, periksa, lalu sahkan.", menu: { href: "/laporan", label: "Laporan kegiatan" } },
      { judul: "Sahkan penilaian pelaksanaan", isi: "Penilaian yang sudah dikunci diperiksa, lalu disahkan. Hanya Ka.UPT yang dapat mengesahkan. Skor di bawah 2 ditindaklanjuti dengan penanggung jawab dan batas waktu.", menu: { href: "/penilaian", label: "Penilaian" } },
      { judul: "Setujui kegiatan dan perubahan rencana", isi: "Persetujuan pelaksanaan kegiatan dan perubahan rencana yang memengaruhi pengamanan berasal dari Ka.UPT atau pejabat yang berwenang." },
      { judul: "Lihat evaluasi dan risiko", isi: "Gunakan untuk menilai kinerja dan potensi gangguan kegiatan di UPT.", menu: { href: "/evaluasi", label: "Evaluasi" } },
      { judul: "Pantau peta dan data pangan", isi: "Peta menampilkan lokasi kegiatan; halaman Hasil pangan merangkum produksi.", menu: { href: "/peta", label: "Peta kegiatan" } },
    ],
  },
  {
    role: "pengawal",
    ringkas: "Mengawal kegiatan di lapangan dan mengisi berkas persyaratan tiap tahap. Akun ini dipakai pengawal, pengawas lokasi, dan petugas yang mencatat pemeriksaan P2U dan serah terima ke blok.",
    tugas: [
      "Membuka tugas yang diberikan Operator.",
      "Mencatat nama petugas yang bertugas sebelum mengisi berkas.",
      "Mengisi empat tahap pengawalan lengkap dengan foto dan berkas wajib.",
      "Mencatat kejadian lewat Catatan cepat bila perlu.",
    ],
    langkah: [
      { judul: "Buka Tugas saya", isi: "Setelah login Anda langsung melihat tugas. Tugas yang bergaris emas sudah boleh dikerjakan; yang lain masih menunggu izin Kepala Pengamanan.", menu: { href: "/lapangan", label: "Tugas saya" } },
      { judul: "Catat nama petugas", isi: "Tulis nama petugas yang bertugas hari itu. NIP dan seksi boleh dikosongkan. Tambah nama lain bila bertugas berdua atau lebih." },
      { judul: "Kerjakan empat tahap", isi: "Urutannya: keluar melalui P2U, menuju lokasi, pelaksanaan kegiatan, lalu kembali ke UPT. Unggah foto dan berkas wajib tiap tahap, pilih petugas yang mengisi, lalu selesaikan tahap." },
      { judul: "Catatan cepat", isi: "Dipakai untuk mencatat kejadian di luar tahap, termasuk keadaan darurat. Tab ini tidak terkunci." },
      { judul: "Isi Kendali sesi", isi: "Catat status variabel, penyerahan dan pengembalian alat, pihak luar yang masuk, serta pengembalian WB bertahap. Selisih alat wajib ditindaklanjuti sebelum kegiatan ditutup." },
      { judul: "Baca alur kerja", isi: "Ringkasan alur dari penugasan sampai laporan ada di menu Alur kerja.", menu: { href: "/lapangan/alur", label: "Alur kerja" } },
    ],
    catatan: ["Waktu tahap dan lampiran dicatat otomatis oleh sistem dan tidak bisa diubah dari HP.", "Gangguan: lakukan tindakan awal dan lapor lewat jalur komando lebih dulu, tanpa menunggu pencatatan di dashboard.", "Dashboard tidak menggantikan pengawasan langsung dan pemeriksaan fisik di P2U."],
  },
  {
    role: "pemantau_kanwil",
    ringkas: "Memantau seluruh UPT di wilayah dan mengelola akun UPT di wilayahnya.",
    tugas: ["Memantau dasbor wilayah dan rekap per UPT.", "Memeriksa kesesuaian laporan dan data UPT, memantau penyelesaian temuan, dan mengenali kendala berulang.", "Membuat dan mengelola akun UPT di wilayah.", "Membaca laporan, evaluasi, dan penilaian pelaksanaan sebagai bahan arahan perbaikan dan laporan ke Pusat."],
    langkah: [
      { judul: "Dasbor wilayah", isi: "Lihat rekap per UPT, lalu buka UPT yang perlu perhatian.", menu: { href: "/", label: "Dasbor" } },
      { judul: "Kelola akun UPT", isi: "Buat atau nonaktifkan akun Ka.UPT, Kepala Pengamanan, Operator, dan Pengawal.", menu: { href: "/akun", label: "Akun UPT" } },
      { judul: "Baca penilaian pelaksanaan", isi: "Lihat skor, persentase, dan kategori penilaian tiap UPT. Kategori tidak menggantikan status operasional.", menu: { href: "/penilaian", label: "Penilaian" } },
    ],
  },
  {
    role: "pemantau_pusat",
    ringkas: "Memantau seluruh Kanwil dan UPT secara nasional.",
    tugas: ["Memantau dasbor nasional.", "Menganalisis laporan, status operasional, pola gangguan, dan hasil tindak lanjut dari wilayah.", "Mengelola akun Kanwil dan UPT.", "Membaca laporan, evaluasi, penilaian pelaksanaan, dan data SDP sebagai bahan pembinaan teknis dan penyempurnaan pedoman."],
    langkah: [
      { judul: "Dasbor nasional", isi: "Rekap per Kanwil; buka Kanwil lalu UPT untuk rincian.", menu: { href: "/", label: "Dasbor" } },
      { judul: "Kelola akun", isi: "Buat atau nonaktifkan akun Kanwil dan UPT.", menu: { href: "/akun", label: "Akun" } },
    ],
  },
  {
    role: "administrator",
    ringkas: "Mengelola akun, data induk, dan pengaturan aplikasi.",
    tugas: ["Mengelola semua akun.", "Memelihara data induk dan pengaturan aplikasi.", "Memeriksa jejak audit."],
    langkah: [
      { judul: "Akun", isi: "Buat, ubah, nonaktifkan, atau hapus akun.", menu: { href: "/akun", label: "Akun" } },
      { judul: "Pengaturan", isi: "Atur penyimpanan berkas, notifikasi, dan data induk.", menu: { href: "/admin", label: "Admin" } },
    ],
  },
];
