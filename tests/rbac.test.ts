import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccess, HOME, safeNext, type Role } from "../src/lib/rbac.ts";

const roles: Role[] = ["administrator", "operator", "pengawal", "kepala_pengamanan"];

test("Administrator hanya membuka dasbor, bukan halaman kerja Operator, Kepala, atau Pengawal", () => {
  assert.equal(canAccess("administrator", "/"), true);
  assert.equal(canAccess("administrator", "/kegiatan"), false);
  assert.equal(canAccess("administrator", "/keputusan"), false);
  assert.equal(canAccess("administrator", "/lapangan"), false);
  assert.equal(canAccess("administrator", "/lapangan/x/entri"), false);
});

test("peran lain tidak berubah", () => {
  assert.equal(canAccess("operator", "/kegiatan"), true);
  assert.equal(canAccess("operator", "/keputusan"), false);
  assert.equal(canAccess("kepala_pengamanan", "/keputusan"), true);
  assert.equal(canAccess("kepala_pengamanan", "/kegiatan"), false);
  assert.equal(canAccess("pengawal", "/lapangan/abc/entri"), true);
  assert.equal(canAccess("pengawal", "/"), false);
});

test("halaman tak dikenal ditolak untuk semua peran, dan halaman awal setiap peran boleh dibuka", () => {
  for (const r of roles) {
    assert.equal(canAccess(r, "/rahasia"), false);
    assert.equal(canAccess(r, HOME[r]), true);
  }
});

test("safeNext menolak alamat luar", () => {
  assert.equal(safeNext("/kegiatan"), "/kegiatan");
  assert.equal(safeNext("//evil.com"), null);
  assert.equal(safeNext("https://evil.com"), null);
  assert.equal(safeNext("/\\evil.com"), null);
});
