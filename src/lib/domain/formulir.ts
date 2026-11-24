// Daftar formulir pelaksanaan dan pelaporan menurut pedoman. Dokumen elektronik dapat menggantikan formulir kertas
// bila memuat unsur yang sama dan dapat dicetak.

export const FORMULIR: { no: number; judul: string; ringkas: string }[] = [
  { no: 1, judul: "Rencana Kegiatan dan Kesiapan", ringkas: "Rencana kegiatan, aspek kesiapan A sampai F, dokumen wajib, dan keputusan kesiapan." },
  { no: 2, judul: "Daftar Nominatif dan Serah Terima", ringkas: "Daftar WB peserta, kelompok kerja, dan serah terima di blok." },
  { no: 3, judul: "Ekspedisi dan Rekonsiliasi", ringkas: "Jumlah WB dan alat per tahap, pengembalian sebagian, dan hasil pencocokan akhir." },
  { no: 4, judul: "Log Pengawasan dan Keputusan", ringkas: "Catatan lapangan berurutan waktu serta keputusan Kepala Pengamanan." },
  { no: 5, judul: "Log Gelang Monitor", ringkas: "Pemeriksaan perangkat, alarm, konfirmasi fisik, dan tindakan." },
  { no: 6, judul: "Laporan Gangguan dan Tindak Lanjut", ringkas: "Gangguan, verifikasi pemulihan, dan tindak lanjut dengan penanggung jawab dan tenggat." },
  { no: 7, judul: "Lembar Status per Variabel", ringkas: "Status delapan variabel pengamanan beserta bukti dan riwayat perubahannya." },
  { no: 8, judul: "Rekap Evaluasi dan Perbaikan", ringkas: "Hasil penilaian 19 indikator dan tindak lanjutnya (dari menu Penilaian pelaksanaan)." },
  { no: 9, judul: "Pengendalian Alat, Mesin, dan Bahan", ringkas: "Penyerahan, penggunaan, sisa, pengembalian, dan selisih." },
  { no: 10, judul: "Akses Pihak Luar dan Serah Terima Hasil", ringkas: "Pihak luar, kendaraan, serta serah terima muatan atau hasil produksi." },
];
