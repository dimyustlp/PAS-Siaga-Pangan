// Dokumen yang harus tersedia sebelum kegiatan dilaksanakan (pedoman, huruf a sampai m).

export type DokumenWajib = {
  kode: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m";
  judul: string;
  uraian: string;
  /** Hanya untuk kegiatan di luar perimeter pengamanan utama. */
  hanyaLuar?: boolean;
  /** Dinilai otomatis dari data aplikasi (nominatif atau unggahan), tidak dicentang manual. */
  otomatis?: "nominatif" | "rencana_pengamanan" | "surat_perintah";
};

export const DOKUMEN_WAJIB: DokumenWajib[] = [
  { kode: "a", judul: "Rencana kegiatan ketahanan pangan", uraian: "Memuat komoditas, tahap pekerjaan, jadwal dan waktu kembali, lokasi, luas lahan tersedia dan aktif, batas area, kelompok kerja, pendamping teknis, kebutuhan alat, mesin, bahan, APD, serta mitra apabila ada." },
  { kode: "b", judul: "Daftar nominatif warga binaan", uraian: "Memuat identitas, jumlah peserta, dan pembagian kelompok kerja.", otomatis: "nominatif" },
  { kode: "c", judul: "Persetujuan pelaksanaan kegiatan", uraian: "Dokumen persetujuan dari Kepala UPT atau pejabat yang berwenang." },
  { kode: "d", judul: "Rencana pengamanan kegiatan", uraian: "Memuat pembagian tugas pengawalan dan pengawasan, penanggung jawab setiap kelompok, jalur pergerakan, sarana komunikasi, serta jalur pelaporan.", otomatis: "rencana_pengamanan" },
  { kode: "e", judul: "Surat perintah penugasan petugas", uraian: "Memuat nama petugas, tugas, lokasi, dan waktu penugasan. Untuk kegiatan di luar perimeter, penugasan mencakup pengawalan dan pengawasan.", otomatis: "surat_perintah" },
  { kode: "f", judul: "Dasar pengeluaran warga binaan yang sah", uraian: "Termasuk keputusan asimilasi apabila dipersyaratkan sesuai jenis kegiatan.", hanyaLuar: true },
  { kode: "g", judul: "Rencana perjalanan dan pengembalian", uraian: "Memuat rute, sarana transportasi apabila digunakan, waktu keberangkatan, dan waktu pengembalian.", hanyaLuar: true },
  { kode: "h", judul: "Daftar inventaris alat, mesin, bahan, APD, dan sarana", uraian: "Memuat jumlah atau satuan, penanggung jawab, tempat penyimpanan, komunikasi, serta gelang monitor apabila digunakan." },
  { kode: "i", judul: "Kerja sama atau izin penggunaan lahan mitra", uraian: "Diperlukan apabila kegiatan dilaksanakan pada lahan mitra." },
  { kode: "j", judul: "Perubahan rencana dan persetujuannya", uraian: "Diperlukan apabila ada perubahan peserta, petugas, lokasi, luas lahan aktif, jadwal, atau alat yang digunakan." },
  { kode: "k", judul: "Denah pengamanan lokasi", uraian: "Memuat lahan aktif, gudang, kandang, kolam, rumah produksi, tempat penyimpanan alat dan bahan, akses, titik pengawasan, serta titik serah terima." },
  { kode: "l", judul: "Daftar pihak luar dan kendaraan", uraian: "Memuat identitas atau data kendaraan, tujuan, waktu, penanggung jawab penerima, serta barang yang dibawa apabila sudah diketahui." },
  { kode: "m", judul: "Catatan kelayakan teknis, APD, dan pertolongan pertama", uraian: "Kelayakan teknis alat dan mesin, kesesuaian APD, serta kesiapan pertolongan pertama dan jalur bantuan kesehatan. Diperiksa petugas yang kompeten." },
];

export type BarisDokumen = { kode: string; berlaku: boolean; tersedia: boolean; nomor: string | null; alasan_tb: string | null };

/** Kode dokumen yang belum tersedia, setelah memperhitungkan penilaian otomatis b, d, dan e. */
export function dokumenKurang(
  baris: BarisDokumen[],
  auto: { nominatif: boolean; rencanaPengamanan: boolean; suratPerintah: boolean }
): DokumenWajib[] {
  const peta = new Map(baris.map((b) => [b.kode, b]));
  return DOKUMEN_WAJIB.filter((d) => {
    const b = peta.get(d.kode);
    if (!b?.berlaku) return false;
    if (d.otomatis === "nominatif") return !auto.nominatif;
    if (d.otomatis === "rencana_pengamanan") return !auto.rencanaPengamanan;
    if (d.otomatis === "surat_perintah") return !auto.suratPerintah;
    return !b.tersedia;
  });
}

/** Isi dasbor minimum menurut pedoman (delapan blok). */
export const BLOK_DASBOR = [
  { judul: "Ringkasan pimpinan", isi: "UPT dan kegiatan aktif; jumlah WB yang keluar, di lokasi, dan kembali; jumlah pengawal dan pengawas; lahan aktif; status serta waktu pembaruan terakhir." },
  { judul: "Lokasi dan lahan", isi: "Lokasi dan UPT (Lapas atau Rutan); internal atau eksternal; lahan tersedia dan aktif; komoditas; tahap pekerjaan; batas area; kelompok kerja." },
  { judul: "Peserta dan petugas", isi: "Daftar WB dan kelompok; petugas penanggung jawab; pergantian; hasil penghitungan dan serah terima." },
  { judul: "Status dan tindak lanjut", isi: "Temuan, sumber, status sebelum dan sesudah, alasan, pejabat pengambil keputusan, tindakan, penanggung jawab, tenggat, bukti, dan verifikasi." },
  { judul: "Gelang dan kejadian", isi: "Perangkat digunakan, alarm atau gangguan, konfirmasi fisik WB, tindakan, dan waktu." },
  { judul: "Pengembalian dan kualitas data", isi: "Rekonsiliasi jumlah dan alat, temuan terbuka, penutupan kegiatan, waktu pemeriksaan lapangan, waktu entri, sumber atau verifikator, dan gangguan jaringan." },
  { judul: "Keselamatan dan bahan", isi: "APD; hasil pemeriksaan mesin; penyerahan dan sisa bahan yang dikendalikan; kecelakaan dan tindak lanjut." },
  { judul: "Akses dan hasil produksi", isi: "Pihak luar; kendaraan; waktu akses; dokumen dan serah terima muatan atau hasil." },
] as const;
