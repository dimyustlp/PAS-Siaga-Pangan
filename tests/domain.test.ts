import { test } from "node:test";
import assert from "node:assert/strict";
import { isEscalation, periodicCheckState } from "../src/lib/domain/status.ts";
import { parseRekonsiliasi } from "../src/lib/domain/reconciliation.ts";
import { mapDbError, isUniqueViolation, PESAN_UMUM, PESAN_DITOLAK } from "../src/lib/errors.ts";
import { isSafeStoragePath } from "../src/lib/validations/storage.ts";

const SID = "11111111-1111-4111-8111-111111111111";
const t0 = new Date("2026-11-10T08:00:00Z");
const min = (n: number) => new Date(t0.getTime() + n * 60_000);

test("status keamanan hanya boleh naik", () => {
  assert.equal(isEscalation("HIJAU", "KUNING"), true);
  assert.equal(isEscalation("KUNING", "KRITIS"), true);
  assert.equal(isEscalation("MERAH", "KUNING"), false);
  assert.equal(isEscalation("MERAH", "MERAH"), false);
  assert.equal(isEscalation("KUNING", "HIJAU"), false);
});

test("jadwal pemeriksaan: aman, segera, terlambat", () => {
  const base = { intervalMinutes: 60, lastCheckAt: t0, startedAt: null };
  assert.equal(periodicCheckState({ ...base, now: min(10) }).state, "aman");
  assert.equal(periodicCheckState({ ...base, now: min(49) }).state, "aman");
  assert.equal(periodicCheckState({ ...base, now: min(50) }).state, "segera"); // jendela 10 menit
  assert.equal(periodicCheckState({ ...base, now: min(60) }).state, "segera"); // tepat di batas belum terlambat
  const late = periodicCheckState({ ...base, now: min(61) });
  assert.equal(late.state, "terlambat");
  assert.ok((late.minutesLeft ?? 0) < 0);
});

test("jadwal pemeriksaan: jendela peringatan 20% untuk interval pendek", () => {
  const base = { intervalMinutes: 15, lastCheckAt: t0, startedAt: null }; // 20% = 3 menit
  assert.equal(periodicCheckState({ ...base, now: min(11) }).state, "aman");
  assert.equal(periodicCheckState({ ...base, now: min(12) }).state, "segera");
});

test("jadwal pemeriksaan: acuan memakai waktu tiba bila belum ada pemeriksaan", () => {
  const r = periodicCheckState({ intervalMinutes: 30, lastCheckAt: null, startedAt: t0, now: min(40) });
  assert.equal(r.state, "terlambat");
  assert.equal(r.dueAt?.toISOString(), min(30).toISOString());
});

test("jadwal pemeriksaan: tanpa acuan waktu maka belum mulai", () => {
  assert.equal(periodicCheckState({ intervalMinutes: 60, lastCheckAt: null, startedAt: null, now: t0 }).state, "belum_mulai");
  assert.equal(periodicCheckState({ intervalMinutes: 0, lastCheckAt: t0, startedAt: null, now: t0 }).state, "belum_mulai");
});

test("pemeriksaan terakhir mengalahkan waktu tiba", () => {
  const r = periodicCheckState({ intervalMinutes: 60, lastCheckAt: min(50), startedAt: t0, now: min(70) });
  assert.equal(r.state, "aman");
});

test("parseRekonsiliasi membaca keluaran database", () => {
  const r = parseRekonsiliasi({
    siap_tutup: false,
    alasan: ["jumlah WBP kembali tidak sama dengan jumlah saat keluar", "1 gangguan belum diverifikasi"],
    wbp_keluar: "10",
    wbp_kembali: "9",
    alat_keluar: "5",
    alat_kembali: "5",
    penggeledahan: "true",
    gangguan_belum_diverifikasi: 1,
  });
  assert.ok(r);
  assert.equal(r.siapTutup, false);
  assert.equal(r.wbpKeluar, 10);
  assert.equal(r.wbpKembali, 9);
  assert.equal(r.penggeledahan, true);
  assert.equal(r.alasan.length, 2);
  assert.equal(parseRekonsiliasi(null), null);
  assert.equal(parseRekonsiliasi({ siap_tutup: "ya" }), null);
  assert.equal(parseRekonsiliasi({ siap_tutup: true, alasan: [], wbp_keluar: null })?.wbpKeluar, null);
});

test("pesan error: aturan alur diteruskan, RLS dan error teknis disamarkan", () => {
  assert.equal(mapDbError({ code: "22023", message: "Foto bukti pemulihan keadaan wajib diunggah." }), "Foto bukti pemulihan keadaan wajib diunggah.");
  assert.equal(mapDbError({ code: "42501", message: "Hanya Kepala Pengamanan yang boleh membuat keputusan." }), "Hanya Kepala Pengamanan yang boleh membuat keputusan.");
  assert.equal(mapDbError({ code: "42501", message: 'new row violates row-level security policy for table "field_logs"' }), PESAN_DITOLAK);
  assert.equal(mapDbError({ code: "42501", message: "permission denied for table decisions" }, "kustom"), "kustom");
  assert.equal(mapDbError({ code: "XX000", message: "relation foo does not exist" }), PESAN_UMUM);
  assert.equal(mapDbError(null), PESAN_UMUM);
  assert.match(mapDbError({ code: "23505", message: "dup" }), /sudah ada/);
});

test("deteksi pelanggaran kunci unik", () => {
  const e = { code: "23505", message: 'duplicate key value violates unique constraint "field_logs_client_id_key"' };
  assert.equal(isUniqueViolation(e), true);
  assert.equal(isUniqueViolation(e, "field_logs_client_id_key"), true);
  assert.equal(isUniqueViolation(e, "daily_sessions_unik"), false);
  assert.equal(isUniqueViolation({ code: "22023", message: "x" }), false);
});

test("alamat berkas harus di folder sesi dan aman", () => {
  assert.equal(isSafeStoragePath(`${SID}/foto-1.jpg`, SID), true);
  assert.equal(isSafeStoragePath(`${SID}/sub/foto (2).png`, SID), true);
  assert.equal(isSafeStoragePath(`22222222-2222-4222-8222-222222222222/foto.jpg`, SID), false);
  assert.equal(isSafeStoragePath(`${SID}/../lain/foto.jpg`, SID), false);
  assert.equal(isSafeStoragePath(`/${SID}/foto.jpg`, SID), false);
  assert.equal(isSafeStoragePath(`${SID}/`, SID), false);
  assert.equal(isSafeStoragePath(`${SID}foto.jpg`, SID), false);
  assert.equal(isSafeStoragePath(`${SID}/a\\b.jpg`, SID), false);
  assert.equal(isSafeStoragePath("", SID), false);
});
