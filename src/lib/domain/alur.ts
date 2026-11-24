import type { Role } from "@/lib/rbac";

export type PelakuAlur = "Administrator" | "Operator" | "Kepala Pengamanan" | "Pengawal" | "Sistem" | "Pemantau" | "Ka.UPT";

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
    pelaku: ["Administrator", "Pemantau"],
    peran: ["administrator", "pemantau_pusat", "pemantau_kanwil"],
    isi: [
      "Pusat membuat akun Kanwil dan UPT; Kanwil membuat akun UPT di wilayahnya (Ka.UPT, Kepala Pengamanan, Operator, Pengawal).",
      "Isi data lokasi kegiatan, daftar warga binaan, dan kop surat UPT.",
    ],
    tautan: { href: "/akun", label: "Kelola akun" },
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
    isi: ["Unggah dokumen yang diwajibkan.", "Isi daftar nominatif WB dan enam aspek kesiapan (A sampai F).", "Setelah lengkap, sesi masuk antrean keputusan."],
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
    judul: "Isi 4 tahap pengawalan di lapangan",
    pelaku: ["Pengawal"],
    peran: ["pengawal"],
    isi: [
      "Tahap 1 pengeluaran melalui P2U, tahap 2 pengawalan menuju lokasi, tahap 3 pelaksanaan kegiatan pangan, tahap 4 kembali ke UPT.",
      "Setiap tahap wajib foto dan berkas; waktunya dicatat otomatis oleh sistem dan berkas tersimpan di Google Drive.",
      "Kejadian di tengah jalan (pihak luar, alarm gelang, gangguan) dicatat lewat Catatan cepat, tetap bisa tanpa sinyal.",
    ],
    tautan: { href: "/lapangan", label: "Buka tugas lapangan" },
  },
  {
    no: 6,
    judul: "Pantau status dan tangani gangguan",
    pelaku: ["Sistem", "Kepala Pengamanan"],
    peran: ["kepala_pengamanan"],
    isi: [
      "Sistem menaikkan status ke MERAH otomatis bila jumlah WB tidak cocok; setiap perubahan status (hijau, kuning, merah, kritis) dikirim ke grup Telegram.",
      "Kepala Pengamanan memverifikasi gangguan, mengubah status dengan catatan, dan memberi arahan.",
      "Setiap temuan punya tindak lanjut dengan penanggung jawab dan tenggat.",
    ],
    tautan: { href: "/tindak-lanjut", label: "Buka tindak lanjut" },
  },
  {
    no: 7,
    judul: "Sahkan laporan dan tutup kegiatan",
    pelaku: ["Kepala Pengamanan", "Ka.UPT"],
    peran: ["kepala_pengamanan", "ka_upt"],
    isi: [
      "Setelah 4 tahap lengkap, Ka.UPT memeriksa lampiran lalu mengesahkan berkas.",
      "Laporan resmi berkop UPT diunduh sebagai PDF; penandatangan diisi manual.",
      "Penutupan hanya bisa bila WB keluar sama dengan WB kembali dan gangguan sudah diverifikasi.",
    ],
    tautan: { href: "/laporan", label: "Buka laporan" },
  },
  {
    no: 8,
    judul: "Evaluasi dan perbaikan",
    pelaku: ["Pemantau", "Ka.UPT", "Kepala Pengamanan", "Administrator"],
    peran: ["pemantau_kanwil", "pemantau_pusat", "administrator", "kepala_pengamanan", "ka_upt"],
    isi: ["Lihat capaian indikator, tren mingguan, serta risiko dan mitigasi.", "Catatan kendala mingguan menjadi dasar memperbaiki pedoman dan SOP."],
    tautan: { href: "/evaluasi", label: "Buka Evaluasi" },
  },
];
