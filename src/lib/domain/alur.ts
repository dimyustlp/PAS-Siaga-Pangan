import type { Role } from "@/lib/rbac";

export type PelakuAlur = "Administrator" | "Operator" | "Kepala Pengamanan" | "Pengawal" | "Sistem" | "Pemantau";

export type TahapAlur = {
  no: number;
  judul: string;
  pelaku: PelakuAlur[];
  /** Peran akun yang mengerjakan tahap ini (untuk menandai "tugas Anda"). */
  peran: Role[];
  isi: string[];
  tautan?: { href: string; label: string };
};

export const ALUR_KERJA: TahapAlur[] = [
  {
    no: 1,
    judul: "Siapkan akun dan data induk",
    pelaku: ["Administrator"],
    peran: ["administrator"],
    isi: ["Buat akun dan tentukan peran serta UPT-nya.", "Isi data lokasi kegiatan dan daftar warga binaan."],
    tautan: { href: "/admin/akun", label: "Kelola akun" },
  },
  {
    no: 2,
    judul: "Rencanakan kegiatan dan sesi harian",
    pelaku: ["Operator"],
    peran: ["operator"],
    isi: ["Buat rencana kegiatan: jenis, lokasi, dan tanggal.", "Buat sesi harian: pengawal, jumlah WB rencana, jadwal, interval pemeriksaan, dan pemakaian gelang."],
    tautan: { href: "/kegiatan", label: "Buka Kegiatan" },
  },
  {
    no: 3,
    judul: "Lengkapi syarat kesiapan",
    pelaku: ["Operator"],
    peran: ["operator"],
    isi: ["Unggah dokumen yang diwajibkan.", "Isi daftar nominatif WB dan enam indikator kesiapan.", "Setelah lengkap, sesi masuk antrean keputusan."],
    tautan: { href: "/kegiatan", label: "Buka Kegiatan" },
  },
  {
    no: 4,
    judul: "Putuskan kesiapan",
    pelaku: ["Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: ["Pilih: Dapat Dimulai, Perlu Diperbaiki, atau Ditunda, lengkap dengan alasan.", "Bila perlu diperbaiki, Operator memperbaiki lalu mengajukan ulang."],
    tautan: { href: "/keputusan", label: "Buka antrean keputusan" },
  },
  {
    no: 5,
    judul: "Catat pelaksanaan di lapangan",
    pelaku: ["Pengawal"],
    peran: ["pengawal"],
    isi: [
      "Urutan umum: serah terima keluar dari blok, tiba di lokasi, pemeriksaan berkala, lalu pengembalian dan serah terima kembali ke blok.",
      "Catat juga kejadian di tengah jalan: pindah area, pihak luar, alarm atau pemeriksaan gelang, dan gangguan.",
      "Tanpa sinyal pun bisa: catatan tersimpan di perangkat dan terkirim otomatis saat online.",
    ],
    tautan: { href: "/lapangan", label: "Buka tugas lapangan" },
  },
  {
    no: 6,
    judul: "Pantau status dan tangani gangguan",
    pelaku: ["Sistem", "Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: [
      "Sistem menaikkan status ke MERAH otomatis bila jumlah WB tidak cocok, dan memberi peringatan bila data lama tidak masuk.",
      "Kepala Pengamanan memverifikasi gangguan, mengubah status dengan catatan, dan memberi arahan.",
      "Setiap temuan punya tindak lanjut dengan penanggung jawab dan tenggat.",
    ],
    tautan: { href: "/tindak-lanjut", label: "Buka tindak lanjut" },
  },
  {
    no: 7,
    judul: "Tutup kegiatan",
    pelaku: ["Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: ["Penutupan hanya bisa bila WB keluar sama dengan WB kembali, gangguan sudah diverifikasi, dan tindak lanjut tertangani.", "Laporan sesi bisa dicetak dari halaman detail sesi."],
  },
  {
    no: 8,
    judul: "Evaluasi dan perbaikan",
    pelaku: ["Pemantau", "Kepala Pengamanan", "Administrator"],
    peran: ["pemantau_kanwil", "pemantau_pusat", "administrator", "kepala_pengamanan"],
    isi: ["Lihat capaian indikator, tren mingguan, risiko dan mitigasi, serta pembekalan petugas.", "Catatan kendala mingguan menjadi dasar memperbaiki pedoman dan SOP."],
    tautan: { href: "/evaluasi", label: "Buka Evaluasi" },
  },
];
