import type { Role } from "@/lib/rbac";

export type PelakuAlur = "Administrator" | "Bimker" | "Operator" | "Petugas P2U" | "Kepala Pengamanan" | "Pengawal" | "Sistem" | "Pemantau" | "Ka.UPT";

export type TahapAlur = {
  no: number;
  judul: string;
  pelaku: PelakuAlur[];
  /** Peran akun yang mengerjakan tahap ini (untuk menandai "tugas Anda"). */
  peran: Role[];
  isi: string[];
  tautan?: { href: string; label: string };
};

/** 12 tahapan Pedoman (Bab II.A), dengan peran akun di dashboard yang mengerjakannya. Tahap 13 = pendukung. */
export const ALUR_KERJA: TahapAlur[] = [
  {
    no: 1,
    judul: "Penyampaian rencana kegiatan",
    pelaku: ["Bimker", "Operator"],
    peran: ["operator"],
    isi: [
      "Bimker menyiapkan dan mengajukan jenis pekerjaan, lokasi, luas lahan aktif, jadwal, daftar peserta, kelompok kerja, alat, dan mitra bila ada.",
      "Operator mencatat rencana dan dokumen pendukungnya di dashboard, lalu membuat sesi harian dan menugaskan Pengawal.",
    ],
    tautan: { href: "/kegiatan", label: "Buka Kegiatan" },
  },
  {
    no: 2,
    judul: "Pemeriksaan dan persetujuan kegiatan",
    pelaku: ["Ka.UPT", "Operator"],
    peran: ["ka_upt", "operator"],
    isi: [
      "Kepala UPT atau pejabat berwenang memeriksa usulan, memberi persetujuan, dan menerbitkan dokumen pengeluaran dan penugasan. Dokumen ini berdiri sendiri di luar dashboard.",
      "Operator mencatat nomor persetujuan dan surat perintah serta mencentang dokumen wajib a sampai m. Dapat Dimulai tidak menggantikan persetujuan ini.",
    ],
    tautan: { href: "/rencana", label: "Buka Rencana kegiatan" },
  },
  {
    no: 3,
    judul: "Penerimaan dan pemeriksaan rencana",
    pelaku: ["Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: ["Kepala Pengamanan menelaah lokasi, luas lahan aktif, jumlah dan sebaran peserta, kelompok kerja, jadwal, alat, dan akses pihak luar sebagai bahan rencana pengamanan."],
    tautan: { href: "/rencana", label: "Buka Rencana kegiatan" },
  },
  {
    no: 4,
    judul: "Penyusunan atau pembaruan rencana pengamanan",
    pelaku: ["Kepala Pengamanan", "Operator"],
    peran: ["kepala_pengamanan", "operator"],
    isi: [
      "Kepala Pengamanan menentukan pembagian tugas, jalur pengawalan, pengawasan kelompok, pemeriksaan berkala, komunikasi, gelang monitor bila ditetapkan, serta tindakan dan jalur pelaporan gangguan.",
      "Operator mengunggah rencana pengamanan sebagai dokumen d dan mencatat perubahan rencana beserta alasan dan pejabat yang menyetujui.",
    ],
    tautan: { href: "/kegiatan", label: "Buka Kegiatan" },
  },
  {
    no: 5,
    judul: "Pemeriksaan dan penetapan kesiapan",
    pelaku: ["Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: [
      "Periksa enam aspek kesiapan A sampai F. Pilih Dapat Dimulai, Perbaiki Dulu, atau Ditunda.",
      "Dapat Dimulai butuh dokumen a sampai m lengkap. Perbaikan diperiksa ulang. Ditunda memuat alasan dan syarat pengajuan ulang.",
    ],
    tautan: { href: "/keputusan", label: "Buka antrean keputusan" },
  },
  {
    no: 6,
    judul: "Pemeriksaan di P2U untuk akses keluar",
    pelaku: ["Petugas P2U", "Pengawal"],
    peran: ["pengawal"],
    isi: [
      "Petugas P2U mencocokkan dokumen pengeluaran, identitas dan jumlah peserta, pengawal, barang, alat kerja, dan gelang, lalu mencatat waktu keluar dan serah terima.",
      "Di dashboard dicatat pada tahap 1 pengawalan melalui akun Pengawal, lengkap dengan nama petugas P2U. Berlaku bila jalur melalui P2U.",
    ],
    tautan: { href: "/lapangan", label: "Buka tugas lapangan" },
  },
  {
    no: 7,
    judul: "Pengawalan dan pengawasan kegiatan",
    pelaku: ["Pengawal", "Kepala Pengamanan"],
    peran: ["pengawal", "kepala_pengamanan"],
    isi: [
      "Pengawal mengerjakan tahap 2 dan 3: hitung saat tiba, awasi kelompok dan batas area, catat alat dan pihak luar, dan periksa berkala. Kejadian dicatat lewat Catatan cepat, tetap bisa tanpa sinyal.",
      "Gangguan: tindakan awal dan lapor lewat jalur komando lebih dulu, pencatatan menyusul. Kepala Pengamanan mengisi status per variabel dan memverifikasi gangguan.",
    ],
    tautan: { href: "/lapangan", label: "Buka tugas lapangan" },
  },
  {
    no: 8,
    judul: "Pemeriksaan P2U saat masuk dan serah terima ke blok",
    pelaku: ["Petugas P2U", "Pengawal"],
    peran: ["pengawal"],
    isi: ["Cocokkan identitas, jumlah, barang, dan alat dengan catatan keluar, catat waktu masuk dan kejadian, lalu serah terima ke petugas blok. Dicatat pada tahap 4. Gelang diperiksa dan dilepas bila masa pakai selesai."],
    tautan: { href: "/lapangan", label: "Buka tugas lapangan" },
  },
  {
    no: 9,
    judul: "Verifikasi pengembalian dan penyelesaian temuan",
    pelaku: ["Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: ["Cocokkan catatan blok, P2U, pengawal, pengawas lokasi, alat, dan gelang. Periksa selisih, gangguan, dan hasil penindakan. Temuan yang menghambat pengamanan selesai sebelum sesi ditutup."],
    tautan: { href: "/tindak-lanjut", label: "Buka tindak lanjut" },
  },
  {
    no: 10,
    judul: "Pelaporan dan penutupan pelaksanaan harian",
    pelaku: ["Kepala Pengamanan", "Ka.UPT"],
    peran: ["kepala_pengamanan", "ka_upt"],
    isi: [
      "Kepala Pengamanan menyusun laporan akhir, memeriksa kelengkapan bukti, dan menutup sesi bila WB keluar sama dengan WB kembali dan gangguan sudah diverifikasi. Tindak lanjut yang berjalan tetap dicatat dengan penanggung jawab dan tenggat.",
      "Ka.UPT memeriksa lampiran dan mengesahkan laporan. Laporan berkop UPT diunduh sebagai PDF.",
    ],
    tautan: { href: "/laporan", label: "Buka laporan" },
  },
  {
    no: 11,
    judul: "Evaluasi pelaksanaan pengamanan oleh Kepala UPT",
    pelaku: ["Kepala Pengamanan", "Ka.UPT"],
    peran: ["kepala_pengamanan", "ka_upt"],
    isi: ["Isi penilaian pelaksanaan 19 indikator (saran otomatis, penilai mengoreksi), lalu Ka.UPT mengesahkan. Skor 0 atau 1 ditindaklanjuti dengan penanggung jawab dan batas waktu."],
    tautan: { href: "/penilaian", label: "Buka Penilaian" },
  },
  {
    no: 12,
    judul: "Monitoring, evaluasi, dan pembinaan teknis",
    pelaku: ["Pemantau"],
    peran: ["pemantau_kanwil", "pemantau_pusat"],
    isi: ["Kanwil dan Direktorat Pengamanan dan Intelijen memantau data dan laporan, memverifikasi pelaksanaan, mengenali kendala berulang, dan memberi arahan sesuai kewenangan."],
    tautan: { href: "/evaluasi", label: "Buka Evaluasi" },
  },
  {
    no: 13,
    judul: "Pendukung: akun dan data induk",
    pelaku: ["Administrator", "Pemantau", "Operator"],
    peran: ["administrator", "pemantau_pusat", "pemantau_kanwil", "operator"],
    isi: ["Pusat membuat akun Kanwil dan UPT, Kanwil membuat akun UPT di wilayahnya, dan Operator membuat akun Ka.UPT, Kepala Pengamanan, dan Pengawal di UPT sendiri. Isi juga data lokasi, daftar WB, dan kop surat UPT."],
    tautan: { href: "/akun", label: "Kelola akun" },
  },
];
