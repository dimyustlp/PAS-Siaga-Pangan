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
    ringkas: "Menyiapkan kegiatan ketahanan pangan di UPT sampai siap diputuskan, dan mengatur siapa yang bertugas.",
    tugas: [
      "Menyusun rencana kegiatan dan melengkapi rinciannya.",
      "Membuat sesi harian, satu per satu sesuai jadwal.",
      "Menugaskan Pengawal pada tiap sesi.",
      "Menyiapkan nominatif WB, dokumen, dan indikator kesiapan sebelum diputuskan Kepala Pengamanan.",
      "Membuat dan mengelola akun Ka.UPT, Kepala Pengamanan, dan Pengawal di UPT sendiri.",
    ],
    langkah: [
      { judul: "Buat rencana kegiatan", isi: "Pilih jenis kegiatan, lokasi, dan tanggal mulai. Setelah disimpan, Anda langsung dibawa ke halaman rincian rencana.", menu: { href: "/kegiatan", label: "Kegiatan" } },
      { judul: "Lengkapi rincian", isi: "Isi tiga bagian: periode dan luas, nomor surat dan persetujuan, serta pengamanan di lokasi (titik komunikasi, batas area, rute, akses warga). Tiap bagian punya tombol simpan sendiri.", menu: { href: "/rencana", label: "Rencana kegiatan" } },
      { judul: "Tambah sesi harian", isi: "Di halaman rincian, buat sesi per tanggal. Tentukan jarak waktu hitung WB dan apakah memakai gelang monitor." },
      { judul: "Tugaskan Pengawal", isi: "Pada tabel sesi, tekan Tugaskan pengawal lalu pilih orangnya. Tugas langsung muncul di dasbor Pengawal; ia baru bisa bekerja setelah Kepala Pengamanan menyatakan siap." },
      { judul: "Siapkan sesi", isi: "Buka sesi, lengkapi nominatif WB, dokumen surat perintah dan rencana pengamanan, serta indikator kesiapan. Sesi yang lengkap masuk antrean keputusan Kepala Pengamanan." },
      { judul: "Atur kop surat", isi: "Isi kop surat UPT agar dokumen persuratan memakai identitas UPT. Isinya bisa diubah sesuai kondisi di lapangan.", menu: { href: "/kop-surat", label: "Kop surat UPT" } },
      { judul: "Buat akun pegawai UPT", isi: "Buat akun Ka.UPT, Kepala Pengamanan, dan Pengawal. Berikan kata sandi awal langsung ke pemiliknya. Akun hanya bisa dibuat untuk UPT Anda sendiri.", menu: { href: "/akun", label: "Akun UPT" } },
    ],
    catatan: ["Satu akun Pengawal boleh dipakai bergantian beberapa petugas, karena nama petugas dicatat tiap kali bertugas.", "Operator tidak bisa membuat akun Operator lain dan tidak bisa melihat akun UPT lain."],
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
      { judul: "Beri keputusan", isi: "Setujui bila siap sehingga Pengawal bisa mulai mencatat. Bila belum siap, kembalikan dengan catatan." },
      { judul: "Pantau saat kegiatan berjalan", isi: "Dasbor menampilkan warna status Hijau, Kuning, Merah, dan Kritis. Perhatikan kegiatan yang tidak mengirim data atau terlambat memeriksa.", menu: { href: "/", label: "Dasbor" } },
      { judul: "Tindak lanjuti temuan", isi: "Buat dan pantau tindak lanjut sampai selesai dan diverifikasi.", menu: { href: "/tindak-lanjut", label: "Tindak lanjut" } },
      { judul: "Baca laporan", isi: "Laporan yang tahapnya sudah lengkap bisa dibaca dan diunduh. Pengesahan dilakukan Ka.UPT.", menu: { href: "/laporan", label: "Laporan kegiatan" } },
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
      { judul: "Lihat evaluasi dan risiko", isi: "Gunakan untuk menilai kinerja dan potensi gangguan kegiatan di UPT.", menu: { href: "/evaluasi", label: "Evaluasi" } },
      { judul: "Pantau peta dan data pangan", isi: "Peta menampilkan lokasi kegiatan; halaman Hasil pangan merangkum produksi.", menu: { href: "/peta", label: "Peta kegiatan" } },
    ],
  },
  {
    role: "pengawal",
    ringkas: "Mengawal kegiatan di lapangan dan mengisi berkas persyaratan tiap tahap.",
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
      { judul: "Baca alur kerja", isi: "Ringkasan alur dari penugasan sampai laporan ada di menu Alur kerja.", menu: { href: "/lapangan/alur", label: "Alur kerja" } },
    ],
    catatan: ["Waktu tahap dan lampiran dicatat otomatis oleh sistem dan tidak bisa diubah dari HP."],
  },
  {
    role: "pemantau_kanwil",
    ringkas: "Memantau seluruh UPT di wilayah dan mengelola akun UPT di wilayahnya.",
    tugas: ["Memantau dasbor wilayah dan rekap per UPT.", "Membuat dan mengelola akun UPT di wilayah.", "Membaca laporan dan evaluasi."],
    langkah: [
      { judul: "Dasbor wilayah", isi: "Lihat rekap per UPT, lalu buka UPT yang perlu perhatian.", menu: { href: "/", label: "Dasbor" } },
      { judul: "Kelola akun UPT", isi: "Buat atau nonaktifkan akun Ka.UPT, Kepala Pengamanan, Operator, dan Pengawal.", menu: { href: "/akun", label: "Akun UPT" } },
    ],
  },
  {
    role: "pemantau_pusat",
    ringkas: "Memantau seluruh Kanwil dan UPT secara nasional.",
    tugas: ["Memantau dasbor nasional.", "Mengelola akun Kanwil dan UPT.", "Membaca laporan, evaluasi, dan data SDP."],
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
