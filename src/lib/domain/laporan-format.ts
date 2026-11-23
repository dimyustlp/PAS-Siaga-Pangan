// Isi laporan resmi disusun di satu tempat supaya pratinjau layar dan berkas PDF selalu sama.

import { alamatKop, barisKop } from "@/lib/domain/kop";
import type { DataLaporan } from "@/lib/data/laporan";
import { NAMA_TAHAP, judulButir } from "@/lib/domain/tahap";

const TZ = "Asia/Jakarta";

export function hariTanggal(v: string | Date): string {
  const d = typeof v === "string" ? new Date(v.length === 10 ? v + "T05:00:00Z" : v) : v;
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function tanggalPanjang(v: string | Date): string {
  const d = typeof v === "string" ? new Date(v.length === 10 ? v + "T05:00:00Z" : v) : v;
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function jamWib(v: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(v)).replace(".", ":") + " WIB";
}

export function waktuLengkap(v: string): string {
  return (
    new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .format(new Date(v))
      .replace(/\./g, ":") + " WIB"
  );
}

export type Baris = [string, string];

export type IsiLaporan = {
  kopBaris: string[];
  kopAlamat: string;
  judul: string;
  subjudul: string;
  dasar: string[];
  waktuTempat: Baris[];
  ringkasWb: string;
  wb: { no: number; nama: string; reg: string }[];
  pengawal: { no: number; nama: string; nip: string }[];
  rincian: { tahap: string; waktu: string; wb: string; ket: string }[];
  pengesahan: string;
  penutup: string;
  kotaTanggal: string;
  lampiranPerTahap: { judul: string; foto: { id: string; judul: string; waktu: string; mime: string }[]; berkas: { id: string; judul: string; nama: string; waktu: string; mime: string; ukuran: number }[] }[];
};

export function susunLaporan(d: DataLaporan): IsiLaporan {
  const t1 = d.tahap.find((t) => t.tahap === 1);
  const t3 = d.tahap.find((t) => t.tahap === 3);
  const t4 = d.tahap.find((t) => t.tahap === 4);
  const lokasi = d.kegiatan.lokasi;

  const dasar: string[] = [];
  dasar.push(
    d.kegiatan.nomorSuratPerintah
      ? `Surat Perintah Nomor ${d.kegiatan.nomorSuratPerintah} tentang pelaksanaan kegiatan ketahanan pangan ${d.kegiatan.jenis.toLowerCase()} di ${lokasi}.`
      : "Surat Perintah Nomor ........................................ tentang pelaksanaan kegiatan ketahanan pangan."
  );
  if (d.kegiatan.nomorPersetujuan) dasar.push(`Persetujuan pelaksanaan kegiatan Nomor ${d.kegiatan.nomorPersetujuan}.`);
  if (d.keputusanMulai)
    dasar.push(`Keputusan kesiapan "Dapat Dimulai" oleh ${d.keputusanMulai.pejabat} (Kepala Pengamanan) pada ${waktuLengkap(d.keputusanMulai.waktu)}.`);

  const waktu = t1 ? `${jamWib(t1.waktu_sistem)}${t4 ? ` s.d. ${jamWib(t4.waktu_sistem)}` : " s.d. selesai"}` : "-";
  const waktuTempat: Baris[] = [
    ["Hari, tanggal", hariTanggal(d.kegiatan.tanggalSesi)],
    ["Waktu", waktu],
    ["Tempat", `${lokasi}${d.kegiatan.lokasiAlamat ? `, ${d.kegiatan.lokasiAlamat}` : ""}`],
    ["Jenis kegiatan", `${d.kegiatan.jenis}${d.kegiatan.luasHa ? ` (luas lahan ${d.kegiatan.luasHa.toLocaleString("id-ID")} ha)` : ""}`],
    ["Kode kegiatan", d.kegiatan.kode + (d.kegiatan.latihan ? " (LATIHAN)" : "")],
  ];

  const jumlahWb = d.wb?.length ?? d.rencanaWb;
  const ringkasWb =
    `Jumlah warga binaan yang mengikuti kegiatan sebanyak ${jumlahWb} orang` +
    (t1 ? `; keluar melalui P2U ${t1.jumlah_wb} orang` : "") +
    (t3 ? `, tercatat di lokasi ${t3.jumlah_wb} orang` : "") +
    (t4 ? `, dan kembali ke UPT ${t4.jumlah_wb} orang` : "") +
    ".";

  const rincian = d.tahap.map((t) => {
    const i = t.isian;
    const ket: string[] = [];
    if (t.jumlah_alat !== null) ket.push(`${t.jumlah_alat} alat kerja`);
    if (i.petugas_p2u) ket.push(`petugas P2U: ${String(i.petugas_p2u)}`);
    if (i.kendaraan) ket.push(`kendaraan: ${String(i.kendaraan)}`);
    if (i.uraian) ket.push(String(i.uraian));
    if (i.hasil) ket.push(`hasil: ${String(i.hasil)}`);
    if (typeof i.penggeledahan === "boolean") ket.push(i.penggeledahan ? "penggeledahan dilakukan" : "penggeledahan belum dilakukan");
    if (i.penerima) ket.push(`diterima: ${String(i.penerima)}`);
    if (i.catatan) ket.push(String(i.catatan));
    ket.push(`pencatat: ${t.pengawal}`);
    return { tahap: `${t.tahap}. ${NAMA_TAHAP[t.tahap]}`, waktu: waktuLengkap(t.waktu_sistem), wb: `${t.jumlah_wb} orang`, ket: ket.join("; ") };
  });

  const pengesahan = d.pengesahan
    ? `Seluruh berkas dan dokumentasi kegiatan telah diperiksa dan disahkan oleh ${d.pengesahan.nama} (${d.pengesahan.jabatan}) pada ${waktuLengkap(d.pengesahan.waktu)}${d.pengesahan.catatan ? `, dengan catatan: ${d.pengesahan.catatan}` : ""}.`
    : "Berkas dan dokumentasi kegiatan belum disahkan oleh Kepala Pengamanan / Ka.UPT.";

  const lampiranPerTahap = [1, 2, 3, 4].map((no) => {
    const l = d.lampiran.filter((x) => x.tahap === no);
    return {
      judul: `Tahap ${no}: ${NAMA_TAHAP[no]}`,
      foto: l.filter((x) => x.jenis === "foto").map((x) => ({ id: x.id, judul: judulButir(x.butir), waktu: waktuLengkap(x.waktu_sistem), mime: x.mime })),
      berkas: l.filter((x) => x.jenis === "berkas").map((x) => ({ id: x.id, judul: judulButir(x.butir), nama: x.nama_berkas, waktu: waktuLengkap(x.waktu_sistem), mime: x.mime, ukuran: x.ukuran_byte })),
    };
  });

  const kopBaris = barisKop(d.kop);
  const alamat = alamatKop(d.kop);

  return {
    kopBaris,
    kopAlamat: alamat,
    judul: "LAPORAN PELAKSANAAN KEGIATAN KETAHANAN PANGAN",
    subjudul: `DI ${lokasi.toUpperCase()}`,
    dasar,
    waktuTempat,
    ringkasWb,
    wb: (d.wb ?? []).map((w, i) => ({ no: i + 1, nama: w.nama, reg: w.nomor_registrasi })),
    pengawal: d.pengawal.map((p, i) => ({ no: i + 1, nama: p.nama, nip: p.nip ?? "-" })),
    rincian,
    pengesahan,
    penutup:
      "Demikian laporan pelaksanaan kegiatan ketahanan pangan ini dibuat dengan sebenarnya. Waktu pada setiap tahap dan lampiran dicatat otomatis oleh sistem PAS-SIAGA Pangan.",
    kotaTanggal: `${d.kop.kota ?? "........................"}, ${tanggalPanjang(d.kegiatan.tanggalSesi)}`,
    lampiranPerTahap,
  };
}
