import { test } from "node:test";
import assert from "node:assert/strict";
import { describeLog } from "../src/lib/domain/describe.ts";
import { batasTanpaData, menitTanpaData, perhatianSesi, skorUrgensi, type Overview } from "../src/lib/domain/attention.ts";
import { awalMinggu, sisaWaktu, sejak, tambahHari } from "../src/lib/format.ts";

const now = new Date("2026-11-10T05:00:00Z");
const dasar: Overview = {
  activity_id: "a", batas_periksa_berikut: null, diperbarui_at: now.toISOString(), ditutup_at: null, fase: "Di lokasi",
  gangguan_terbuka: 0, hitung_terakhir_at: null, interval_pemeriksaan: 60, jenis_kegiatan: "Pertanian", jumlah_alat_kerja: 5,
  jumlah_narapidana: 10, jumlah_petugas: 2, keluar_at: null, kembali_at: null, kode_kegiatan: "X", kode_upt: "CIANGIR",
  lokasi_id: "l", lokasi_nama: "Sawah", luas_lahan_ha: 1, pakai_gelang_monitor: false, session_id: "s",
  status_keamanan: "HIJAU", status_kesiapan: "Dapat Dimulai", tanggal_sesi: "2026-11-10", terlambat_periksa: false,
  tiba_at: null, tindak_lanjut_terbuka: 0, tindak_lanjut_terlambat: 0, upt_nama: "Lapas Ciangir", wbp_keluar: 10, wbp_kembali: null,
  wbp_terakhir_dihitung: 10,
};
const menitLalu = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

test("ringkasan entri lapangan memuat angka dan konfirmasi alarm", () => {
  assert.match(describeLog("Serah terima di blok", { tahap: "kembali", jumlah_wbp: 9, jumlah_alat: 5, penggeledahan: true }), /kembali ke blok.*9 WB.*penggeledahan: ya/);
  assert.match(describeLog("Alarm gelang", { jenis_alarm: "Keluar zona", dikonfirmasi_langsung: false }), /dikonfirmasi langsung: tidak/);
  assert.match(describeLog("Pemeriksaan gelang", { jumlah_diperiksa: 10, jumlah_berfungsi: 8 }), /8 dari 10/);
  assert.equal(describeLog("Jenis baru", null), "Jenis baru");
});

test("peringatan: tanpa data lewat batas, jangan dianggap aman", () => {
  assert.equal(batasTanpaData(60), 120);
  assert.equal(batasTanpaData(5), 30);
  assert.equal(menitTanpaData({ ...dasar, diperbarui_at: menitLalu(45) }, now), 45);
  assert.equal(menitTanpaData({ ...dasar, fase: "Menunggu keputusan kesiapan" }, now), null);
  assert.equal(perhatianSesi({ ...dasar, diperbarui_at: menitLalu(60) }, now).length, 0);
  const p = perhatianSesi({ ...dasar, diperbarui_at: menitLalu(130) }, now);
  assert.equal(p.length, 1);
  assert.match(p[0].teks, /bukan berarti aman/);
});

test("peringatan: status, keterlambatan, gangguan, selisih kembali", () => {
  const p = perhatianSesi({ ...dasar, status_keamanan: "MERAH", terlambat_periksa: true, gangguan_terbuka: 2, tindak_lanjut_terlambat: 1 }, now);
  assert.equal(p.length, 4);
  const q = perhatianSesi({ ...dasar, fase: "Sudah kembali ke blok", wbp_kembali: 9 }, now);
  assert.match(q[0].teks, /tidak sama/);
  assert.equal(perhatianSesi({ ...dasar, status_keamanan: "KRITIS", ditutup_at: now.toISOString() }, now).length, 0);
});

test("urutan: KRITIS di atas MERAH di atas HIJAU, sesi tertutup paling bawah", () => {
  const k = skorUrgensi({ ...dasar, status_keamanan: "KRITIS" }, now);
  const m = skorUrgensi({ ...dasar, status_keamanan: "MERAH" }, now);
  const h = skorUrgensi(dasar, now);
  const t = skorUrgensi({ ...dasar, ditutup_at: now.toISOString() }, now);
  assert.ok(k > m && m > h && h > t);
});

test("format waktu relatif dan minggu", () => {
  assert.equal(sisaWaktu(12), "12 menit lagi");
  assert.equal(sisaWaktu(-8), "terlambat 8 menit");
  assert.equal(sisaWaktu(null), "-");
  assert.equal(sejak(menitLalu(5), now), "5 menit lalu");
  assert.equal(sejak(menitLalu(180), now), "3 jam lalu");
  assert.equal(awalMinggu("2026-11-12"), "2026-11-09"); // Kamis -> Senin
  assert.equal(awalMinggu("2026-11-09"), "2026-11-09");
  assert.equal(awalMinggu("2026-11-15"), "2026-11-09"); // Minggu -> Senin sebelumnya
  assert.equal(tambahHari("2026-11-30", 1), "2026-12-01");
});
