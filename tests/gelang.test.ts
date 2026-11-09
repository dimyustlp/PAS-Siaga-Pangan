import { test } from "node:test";
import assert from "node:assert/strict";
import { bacaDaftarUnit, bacaWaktuAlarm, konfirmasiAlarmSchema } from "../src/lib/validations/gelang.ts";
import { canAccess, ALL_ROLES } from "../src/lib/rbac.ts";

test("daftar unit dibaca per baris dengan pemisah koma, titik koma, atau tab", () => {
  const { baris, salah } = bacaDaftarUnit("0834, M Hendi F, AII-123\n0835;Budi\n0836\t\tX-9\n\n");
  assert.equal(salah.length, 0);
  assert.deepEqual(baris.map((b) => b.kode), ["0834", "0835", "0836"]);
  assert.equal(baris[0].nomor, "AII-123");
  assert.equal(baris[1].nomor, null);
  assert.equal(baris[2].nama, null);
});

test("kode unit tidak valid dilaporkan dan kode ganda dibuang", () => {
  const { baris, salah } = bacaDaftarUnit("08 34, A\n0834, A\n0834, B\nabc/def");
  assert.equal(baris.length, 1);
  assert.deepEqual(salah, ["08 34, A", "abc/def"]);
});

test("waktu alarm tanpa zona dianggap WIB, berzona dihormati, sampah jadi null", () => {
  assert.equal(bacaWaktuAlarm("2026-11-09 10:30:00"), "2026-11-09T03:30:00.000Z");
  assert.equal(bacaWaktuAlarm("2026-11-09T10:30:00Z"), "2026-11-09T10:30:00.000Z");
  assert.equal(bacaWaktuAlarm("1794220200"), new Date(1794220200 * 1000).toISOString());
  assert.equal(bacaWaktuAlarm("bukan waktu"), null);
  assert.equal(bacaWaktuAlarm(""), null);
});

test("konfirmasi alarm wajib berisi tindakan", () => {
  const id = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
  assert.ok(konfirmasiAlarmSchema.safeParse({ id, status: "Dikonfirmasi", tindakan: "Petugas Pos 2 sudah dihubungi" }).success);
  assert.ok(!konfirmasiAlarmSchema.safeParse({ id, status: "Dikonfirmasi", tindakan: "ok" }).success);
  assert.ok(!konfirmasiAlarmSchema.safeParse({ id, status: "Menunggu", tindakan: "sudah dicek" }).success);
});

test("halaman gelang terbuka untuk semua peran", () => {
  for (const r of ALL_ROLES) assert.ok(canAccess(r, "/gelang"));
  assert.ok(!canAccess("operator", "/admin/gelang"));
});
