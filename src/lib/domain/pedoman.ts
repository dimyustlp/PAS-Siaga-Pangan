// Isi acuan operasional dari RPP final: status kegiatan (Tabel 3.3) dan pokok pedoman/SOP (Tabel 3.4).

export type StatusKey = "HIJAU" | "KUNING" | "MERAH" | "KRITIS";

export const PANDUAN_STATUS: Record<StatusKey, { kondisi: string; minimum: string; ringkas: string }> = {
  HIJAU: {
    kondisi: "Pelaksanaan sesuai rencana; identitas, jumlah WB, pengendalian lokasi, pengawalan, komunikasi, dan sarana pendukung sesuai.",
    minimum: "Kegiatan dilanjutkan dengan pemantauan rutin dan pencatatan.",
    ringkas: "Lanjutkan, pantau rutin, catat.",
  },
  KUNING: {
    kondisi: "Ditemukan penyimpangan yang masih dapat dikendalikan, misalnya kendala komunikasi, perubahan kondisi lokasi, atau ketidaksesuaian administrasi yang dapat diperbaiki.",
    minimum: "Perkuat pengawasan; lakukan mitigasi awal; tetapkan penanggung jawab, tenggat, dan pemeriksaan ulang.",
    ringkas: "Perkuat pengawasan, mitigasi awal, tetapkan penanggung jawab dan tenggat.",
  },
  MERAH: {
    kondisi: "Gangguan mempengaruhi pengendalian kegiatan, misalnya selisih jumlah WB, gangguan komunikasi atau perangkat, atau peringatan yang belum dapat dipastikan.",
    minimum: "Batasi atau hentikan kegiatan; lakukan pengamanan khusus sesuai SOP; hitung WB; dan laporkan segera.",
    ringkas: "Batasi atau hentikan kegiatan, hitung WB, laporkan segera.",
  },
  KRITIS: {
    kondisi: "Terdapat ancaman langsung terhadap keselamatan, WB tidak ditemukan, atau terjadi gangguan berat.",
    minimum: "Hentikan kegiatan; amankan WB dan petugas; lakukan eskalasi komando dan tindakan kedaruratan sesuai prosedur.",
    ringkas: "Hentikan kegiatan, amankan WB dan petugas, eskalasi komando.",
  },
};

export const CATATAN_STATUS = [
  "Status ditetapkan berdasarkan temuan yang dicatat bersama waktu dan sumbernya.",
  "Jika keselamatan memerlukan tindakan segera, petugas meningkatkan status dan mengambil tindakan awal tanpa menunggu dasbor diperbarui.",
  "Status hanya dapat diturunkan oleh pejabat berwenang setelah perbaikan diperiksa dan alasannya dicatat.",
  "Saat jaringan atau gelang terganggu, petugas tetap mengawasi langsung dan mencatat secara manual. Ketiadaan data tidak berarti keadaan aman.",
];

export const POKOK_SOP: { bagian: string; isi: string }[] = [
  { bagian: "Pendahuluan", isi: "Latar belakang, maksud dan tujuan, ruang lingkup kegiatan di dalam dan di luar tembok UPT, batas kewenangan Bimker, petugas pengamanan, pengawal, petugas blok, dan P2U, serta dasar hukum." },
  { bagian: "Persyaratan dan rencana kegiatan", isi: "Rencana Bimker memuat jadwal, lokasi, luas dan batas lahan, akses warga, daftar nominatif WB, jumlah serta posisi petugas pengawal/pengawas, rute dan komunikasi, daftar alat kerja, persetujuan sesuai kewenangan, serta surat perintah pengawalan. Keputusan asimilasi tetap diproses melalui kewenangan tersendiri." },
  { bagian: "Kegiatan di dalam tembok UPT", isi: "Persetujuan pergerakan dari blok, pencocokan identitas dan jumlah WB, serah terima kepada petugas pendamping, pengawasan batas area dan penggunaan alat, penghitungan akhir sebelum kembali ke blok." },
  { bagian: "Kegiatan di luar tembok UPT", isi: "Pengarahan petugas, penetapan rute, waktu, posisi petugas, dan sarana komunikasi, penghitungan pada setiap perpindahan lokasi, pengendalian perubahan lokasi atau rute, serah terima saat pergantian pengawal. Pada pengarahan ditetapkan indikator kondisi lapangan yang menyebabkan pengawasan diperkuat, kegiatan dibatasi atau dihentikan, dan eskalasi dilakukan." },
  { bagian: "Gelang pemantau", isi: "Penetapan WB dan kegiatan yang memakai gelang, pemeriksaan dan pencatatan perangkat, konfirmasi langsung atas setiap alarm, penanganan perangkat rusak, baterai lemah, atau sinyal terputus. Setiap peringatan dikonfirmasi kepada petugas di lokasi; hasil konfirmasi, tindakan, serta gangguan perangkat dicatat dan ditindaklanjuti." },
  { bagian: "Pengeluaran dan pengembalian", isi: "Pengajuan dan persetujuan kegiatan, surat perintah pengawalan, pemeriksaan di P2U, pencatatan jam keluar dan masuk pada buku lalu lintas dan ekspedisi, serah terima sampai petugas blok, pencocokan catatan sebelum administrasi ditutup." },
  { bagian: "Gangguan dan pelaporan", isi: "Kondisi yang mengharuskan kegiatan dihentikan, pengamanan dan penghitungan WB lainnya, tindakan awal atas WB yang tidak ditemukan, kecelakaan, kekerasan, kehilangan alat, atau gangguan perangkat, serta pelaporan kepada pejabat yang membidangi pengamanan dan Kepala Lapas. SOP menetapkan tindakan petugas menurut status HIJAU, KUNING, MERAH, dan KRITIS, pejabat yang menerima eskalasi, serta syarat verifikasi sebelum status diturunkan." },
  { bagian: "Pemantauan dan evaluasi", isi: "Pemeriksaan kecocokan jumlah WB di setiap serah terima, luas lahan dan jumlah petugas yang benar-benar ditugaskan, catatan waktu pembaruan, respons terhadap alarm, keputusan, dan penyelesaian gangguan. Evaluasi juga memeriksa dasar setiap keputusan, waktu perubahan status, pemilik dan tenggat mitigasi, penyelesaian tindakan, serta verifikasi penutupan kejadian." },
  { bagian: "Lampiran", isi: "SOP: pergerakan internal; pengeluaran dan pengawalan; pengawasan di lokasi; penggunaan gelang pemantau; penanganan gangguan; dan pengembalian. Format pencatatan: rencana kegiatan, daftar nominatif, ekspedisi, log pengawalan, log gelang pemantau, dan laporan kejadian." },
];
