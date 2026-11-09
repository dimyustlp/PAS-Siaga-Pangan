import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungEvaluasi, keCsv, parseIndikator } from "../src/lib/domain/evaluasi.ts";
import { PANDUAN_STATUS, POKOK_SOP } from "../src/lib/domain/pedoman.ts";
import { INDIKATOR_KESIAPAN } from "../src/lib/validations/planning.ts";

const mentah = {
  total_sesi: 25, sesi_dijalankan: 24, sesi_ditutup: 22, sesi_sesuai_sop: 21, serah_terima_lengkap: 22, serah_terima_cocok: 22,
  catatan_dinilai: 22, catatan_lengkap: 21, perubahan_status: 6, perubahan_status_beralasan: 6, temuan_total: 4, temuan_terverifikasi: 4,
  temuan_dengan_tindak_lanjut: 4, tindak_lanjut_total: 5, tindak_lanjut_selesai: 5, tindak_lanjut_terverifikasi: 4, tindak_lanjut_terlambat: 0,
  alarm_total: 3, alarm_dikonfirmasi: 3, entri_total: 300, entri_susulan: 12, status: { HIJAU: 2, KUNING: 1, MERAH: 0, KRITIS: 0 },
};

test("indikator RPP: target 20 kegiatan, kecocokan 100%, kelengkapan 95%", () => {
  const i = parseIndikator(mentah)!;
  const b = Object.fromEntries(hitungEvaluasi(i).map((x) => [x.kode, x]));
  assert.equal(b.E1.tercapai, true);
  assert.equal(b.E2.tercapai, true);
  assert.equal(b.E3.nilai, 95.5);
  assert.equal(b.E3.tercapai, true);
  const buruk = hitungEvaluasi(parseIndikator({ ...mentah, sesi_sesuai_sop: 19, serah_terima_cocok: 21, catatan_lengkap: 20 })!);
  assert.equal(buruk.find((x) => x.kode === "E1")!.tercapai, false);
  assert.equal(buruk.find((x) => x.kode === "E2")!.tercapai, false);
  assert.equal(buruk.find((x) => x.kode === "E3")!.tercapai, false); // 90,9%
});

test("tanpa data, indikator belum dinilai (bukan lulus)", () => {
  const kosong = Object.fromEntries(Object.keys(mentah).map((k) => [k, k === "status" ? {} : 0]));
  const hasil = hitungEvaluasi(parseIndikator(kosong)!);
  for (const h of hasil.filter((x) => x.kode !== "E1")) assert.equal(h.tercapai, null, h.kode);
  assert.equal(hasil[0].tercapai, false);
});

test("CSV: titik koma, kutip, dan baris baru aman", () => {
  const csv = keCsv([["a", "b;c", 'd"e'], [1, null, "x\ny"]]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes('a;"b;c";"d""e"'));
  assert.ok(csv.includes('1;;"x\ny"'));
  assert.equal(parseIndikator(null), null);
});

test("isi acuan RPP lengkap: empat status, enam indikator kesiapan, sembilan bagian SOP", () => {
  assert.deepEqual(Object.keys(PANDUAN_STATUS), ["HIJAU", "KUNING", "MERAH", "KRITIS"]);
  assert.equal(INDIKATOR_KESIAPAN.length, 6);
  assert.equal(POKOK_SOP.length, 9);
  assert.match(PANDUAN_STATUS.MERAH.minimum, /hitung WB/);
});
