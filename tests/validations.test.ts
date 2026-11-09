import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldLogSchema } from "../src/lib/validations/field-log.ts";
import { activitySchema, sessionSchema, locationSchema } from "../src/lib/validations/planning.ts";
import { closeSessionSchema, directiveSchema, lowerStatusSchema, readinessDecisionSchema, verifyIncidentSchema } from "../src/lib/validations/decision.ts";

const SID = "11111111-1111-4111-8111-111111111111";
const CID = "33333333-3333-4333-8333-333333333333";
const now = () => new Date().toISOString();
const entry = (jenis_entri: string, payload: unknown, extra: Record<string, unknown> = {}) => ({
  client_id: CID,
  session_id: SID,
  waktu_kejadian: now(),
  jenis_entri,
  payload,
  ...extra,
});
const ok = (input: unknown) => fieldLogSchema.safeParse(input);
const pesan = (input: unknown) => {
  const r = fieldLogSchema.safeParse(input);
  return r.success ? "" : r.error.issues.map((i) => i.message).join(" | ");
};

test("serah terima keluar valid, penggeledahan tidak wajib", () => {
  const r = ok(entry("Serah terima di blok", { tahap: "keluar", jumlah_wbp: 10, jumlah_alat: 5 }));
  assert.equal(r.success, true);
});

test("serah terima kembali wajib menyertakan penggeledahan", () => {
  assert.match(pesan(entry("Serah terima di blok", { tahap: "kembali", jumlah_wbp: 10, jumlah_alat: 5 })), /penggeledahan wajib/i);
  assert.equal(ok(entry("Serah terima di blok", { tahap: "kembali", jumlah_wbp: 10, jumlah_alat: 5, penggeledahan: true })).success, true);
  assert.equal(ok(entry("Serah terima di blok", { tahap: "kembali", jumlah_wbp: 10, jumlah_alat: 5, penggeledahan: false })).success, true);
});

test("jumlah harus bilangan bulat tidak negatif dan berupa angka", () => {
  assert.equal(ok(entry("Serah terima di blok", { tahap: "keluar", jumlah_wbp: -1, jumlah_alat: 5 })).success, false);
  assert.equal(ok(entry("Serah terima di blok", { tahap: "keluar", jumlah_wbp: 2.5, jumlah_alat: 5 })).success, false);
  assert.equal(ok(entry("Serah terima di blok", { tahap: "keluar", jumlah_wbp: "10", jumlah_alat: 5 })).success, false);
  assert.equal(ok(entry("Serah terima di blok", { tahap: "keluar", jumlah_wbp: 1_000_000, jumlah_alat: 5 })).success, false);
});

test("naikkan status: hanya KUNING, MERAH, KRITIS dan wajib beralasan", () => {
  assert.equal(ok(entry("Naikkan status", { status_baru: "MERAH", alasan: "Ada cekcok antarwarga binaan" })).success, true);
  assert.equal(ok(entry("Naikkan status", { status_baru: "HIJAU", alasan: "Sudah aman" })).success, false);
  assert.equal(ok(entry("Naikkan status", { status_baru: "MERAH", alasan: "" })).success, false);
  assert.equal(ok(entry("Naikkan status", { status_baru: "MERAH", alasan: "ab" })).success, false);
  assert.equal(ok(entry("Naikkan status", { status_baru: "MERAH" })).success, false);
});

test("gangguan: kategori wajib, status baru opsional dan tidak boleh HIJAU", () => {
  assert.equal(ok(entry("Gangguan", { kategori: "Cekcok" })).success, true);
  assert.equal(ok(entry("Gangguan", { kategori: "Cekcok", status_baru: "KRITIS", tindakan_awal: "Dipisahkan" })).success, true);
  assert.equal(ok(entry("Gangguan", { kategori: "   " })).success, false);
  assert.equal(ok(entry("Gangguan", { kategori: "Cekcok", status_baru: "HIJAU" })).success, false);
});

test("jenis entri tidak dikenal ditolak", () => {
  assert.equal(ok(entry("Turunkan status", { status_baru: "HIJAU" })).success, false);
});

test("pemeriksaan berkala, tiba di lokasi, P2U, alarm gelang, pihak luar, pengembalian sebagian, pindah area", () => {
  assert.equal(ok(entry("Pemeriksaan berkala", { jumlah_wbp: 10 })).success, true);
  assert.equal(ok(entry("Pemeriksaan berkala", {})).success, false);
  assert.equal(ok(entry("Tiba di lokasi", { jumlah_wbp: 10 })).success, true);
  assert.equal(ok(entry("Tiba di lokasi", {})).success, false); // hitungan WB wajib sejak RPP final
  assert.equal(ok(entry("P2U keluar atau masuk", { arah: "masuk", jumlah: 3 })).success, true);
  assert.equal(ok(entry("P2U keluar atau masuk", { arah: "samping" })).success, false);
  assert.equal(ok(entry("Alarm gelang", { jenis_alarm: "Keluar zona", dikonfirmasi_langsung: false })).success, true);
  assert.equal(ok(entry("Alarm gelang", { jenis_alarm: "Keluar zona" })).success, false); // konfirmasi langsung wajib diisi
  assert.equal(ok(entry("Alarm gelang", {})).success, false);
  assert.equal(ok(entry("Pemeriksaan gelang", { jumlah_diperiksa: 10, jumlah_berfungsi: 9 })).success, true);
  assert.equal(ok(entry("Pemeriksaan gelang", { jumlah_diperiksa: 10, jumlah_berfungsi: 11 })).success, false);
  assert.equal(ok(entry("Pihak luar dan kendaraan", { jenis: "Kendaraan", keterangan: "Truk pakan", nomor_kendaraan: "B 1234 XY" })).success, true);
  assert.equal(ok(entry("Pihak luar dan kendaraan", { jenis: "Kendaraan" })).success, false);
  assert.equal(ok(entry("Pengembalian sebagian", { jumlah_wbp: 4 })).success, true);
  assert.equal(ok(entry("Pindah area atau ganti pengawal", { jumlah_wbp: 10, area_baru: "Kolam 2" })).success, true);
  assert.equal(ok(entry("Pindah area atau ganti pengawal", { jumlah_wbp: 10, catatan: "pindah" })).success, false);
  assert.equal(ok(entry("Pindah area atau ganti pengawal", { area_baru: "Kolam 2" })).success, false); // hitungan WB wajib
});

test("payload dibersihkan: kolom asing dibuang, teks dipangkas, string kosong hilang", () => {
  const r = ok(entry("Gangguan", { kategori: "  Cekcok  ", tindakan_awal: "   ", penanggung_jawab: " Budi ", sisipan: "jahat" }));
  assert.equal(r.success, true);
  if (r.success) {
    const p = JSON.parse(JSON.stringify(r.data.payload));
    assert.deepEqual(p, { kategori: "Cekcok", penanggung_jawab: "Budi" });
  }
});

test("waktu kejadian: boleh mundur (susulan offline), tidak boleh masa depan atau terlalu lampau", () => {
  const jam = (ms: number) => new Date(Date.now() + ms).toISOString();
  const body = { tahap: "keluar", jumlah_wbp: 1, jumlah_alat: 1 };
  assert.equal(ok(entry("Serah terima di blok", body, { waktu_kejadian: jam(-3 * 3600_000) })).success, true);
  assert.equal(ok(entry("Serah terima di blok", body, { waktu_kejadian: jam(2 * 60_000) })).success, true); // toleransi jam HP
  assert.match(pesan(entry("Serah terima di blok", body, { waktu_kejadian: jam(2 * 3600_000) })), /masa depan/);
  assert.match(pesan(entry("Serah terima di blok", body, { waktu_kejadian: jam(-8 * 24 * 3600_000) })), /7 hari/);
  assert.equal(ok(entry("Serah terima di blok", body, { waktu_kejadian: "kemarin sore" })).success, false);
  // Waktu berzona +07:00 (WIB) harus diterima, sama dengan jam yang sama dalam UTC.
  const wib = new Date(Date.now() - 3600_000 + 7 * 3600_000).toISOString().replace(/\.\d{3}Z$/, "+07:00");
  assert.equal(ok(entry("Serah terima di blok", body, { waktu_kejadian: wib })).success, true);
});

test("pengenal wajib UUID", () => {
  assert.equal(ok(entry("Tiba di lokasi", { jumlah_wbp: 1 }, { client_id: "bukan-uuid" })).success, false);
  assert.equal(ok(entry("Tiba di lokasi", { jumlah_wbp: 1 }, { session_id: "bukan-uuid" })).success, false);
});

test("kegiatan dan sesi", () => {
  const lok = "44444444-4444-4444-8444-444444444444";
  assert.equal(activitySchema.safeParse({ jenis_kegiatan: "Pertanian", lokasi_id: lok, tanggal_mulai: "2026-11-10" }).success, true);
  assert.equal(activitySchema.safeParse({ jenis_kegiatan: "Pertanian", lokasi_id: lok, tanggal_mulai: "2026-11-10", rencana_berakhir: "2026-11-01" }).success, false);
  assert.equal(activitySchema.safeParse({ jenis_kegiatan: "Pertambangan", lokasi_id: lok, tanggal_mulai: "2026-11-10" }).success, false);
  assert.equal(activitySchema.safeParse({ jenis_kegiatan: "Pertanian", lokasi_id: lok, tanggal_mulai: "2026-02-30" }).success, false);
  assert.equal(activitySchema.safeParse({ jenis_kegiatan: "Pertanian", lokasi_id: lok, tanggal_mulai: "10/11/2026" }).success, false);

  const s = { activity_id: lok, tanggal_sesi: "2026-11-10", petugas_ids: [SID], jumlah_narapidana: 10, jumlah_alat_kerja: 5, interval_pemeriksaan: 60, pakai_gelang_monitor: true };
  assert.equal(sessionSchema.safeParse(s).success, true);
  assert.equal(sessionSchema.safeParse({ ...s, petugas_ids: [] }).success, false);
  assert.equal(sessionSchema.safeParse({ ...s, petugas_ids: [SID, SID] }).success, false);
  assert.equal(sessionSchema.safeParse({ ...s, interval_pemeriksaan: 3 }).success, false);
  assert.equal(sessionSchema.safeParse({ ...s, interval_pemeriksaan: 600 }).success, false);
  assert.equal(sessionSchema.safeParse({ ...s, jumlah_narapidana: -1 }).success, false);
  assert.equal(locationSchema.safeParse({ nama: "Sawah A", titik: "95, 106" }).success, false);
  assert.equal(locationSchema.safeParse({ nama: "Sawah A", posisi: "Luar UPT" }).success, false, "luar UPT wajib titik");
  const ok = locationSchema.safeParse({ nama: "Sawah A", posisi: "Luar UPT", titik: "-6.2995, 106.5960" });
  assert.ok(ok.success && ok.data.latitude === -6.2995 && ok.data.longitude === 106.596);
  const dalam = locationSchema.safeParse({ nama: "Kebun dalam" });
  assert.ok(dalam.success && dalam.data.posisi === "Dalam UPT" && dalam.data.latitude === undefined);
  assert.equal(locationSchema.safeParse({ nama: "" }).success, false);
});

test("keputusan Kepala Pengamanan", () => {
  assert.equal(readinessDecisionSchema.safeParse({ session_id: SID, keputusan: "Dapat Dimulai" }).success, true);
  assert.equal(readinessDecisionSchema.safeParse({ session_id: SID, keputusan: "Perbaiki Dulu" }).success, false);
  assert.equal(readinessDecisionSchema.safeParse({ session_id: SID, keputusan: "Perbaiki Dulu", catatan: "  " }).success, false);
  assert.equal(readinessDecisionSchema.safeParse({ session_id: SID, keputusan: "Ditunda", catatan: "Cuaca buruk" }).success, true);
  assert.equal(readinessDecisionSchema.safeParse({ session_id: SID, keputusan: "Tutup Kegiatan" }).success, false);
  assert.equal(verifyIncidentSchema.safeParse({ session_id: SID, incident_id: CID, catatan: "ok" }).success, false);
  assert.equal(verifyIncidentSchema.safeParse({ session_id: SID, incident_id: CID, catatan: "Sudah kondusif" }).success, true);
  assert.equal(lowerStatusSchema.safeParse({ session_id: SID, bukti_path: "", catatan: "Sudah pulih" }).success, false);
  assert.equal(lowerStatusSchema.safeParse({ session_id: SID, bukti_path: `${SID}/pulih.jpg` }).success, false); // alasan wajib
  assert.equal(lowerStatusSchema.safeParse({ session_id: SID, bukti_path: `${SID}/pulih.jpg`, catatan: "Sudah pulih" }).success, true);
  assert.equal(lowerStatusSchema.safeParse({ session_id: SID, bukti_path: `${SID}/pulih.jpg`, catatan: "Turun satu tingkat", status_baru: "MERAH" }).success, true);
  assert.equal(lowerStatusSchema.safeParse({ session_id: SID, bukti_path: `${SID}/pulih.jpg`, catatan: "Naik?", status_baru: "KRITIS" }).success, false);
  assert.equal(directiveSchema.safeParse({ session_id: SID, catatan: "Tambah pengawal di pos 2" }).success, true);
  assert.equal(directiveSchema.safeParse({ session_id: SID, catatan: " " }).success, false);
  assert.equal(closeSessionSchema.safeParse({ session_id: "x" }).success, false);
});

test("tindak lanjut: wajib ada penanggung jawab (akun atau nama) dan tenggat", async () => {
  const { followUpCreateRefined } = await import("../src/lib/validations/followup.ts");
  const dasar = { session_id: SID, sumber: "Gangguan", uraian: "Perbaiki pagar", tenggat: "2026-11-12T09:00:00+07:00" };
  assert.equal(followUpCreateRefined.safeParse(dasar).success, false);
  assert.equal(followUpCreateRefined.safeParse({ ...dasar, penanggung_jawab_nama: "Budi" }).success, true);
  assert.equal(followUpCreateRefined.safeParse({ ...dasar, penanggung_jawab_id: CID }).success, true);
  assert.equal(followUpCreateRefined.safeParse({ ...dasar, penanggung_jawab_nama: "Budi", tenggat: "besok" }).success, false);
  assert.equal(followUpCreateRefined.safeParse({ ...dasar, penanggung_jawab_nama: "Budi", sumber: "Lain" }).success, false);
});
