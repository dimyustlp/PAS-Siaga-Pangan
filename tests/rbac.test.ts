import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccess, HOME, safeNext, type Role } from "../src/lib/rbac.ts";

const roles: Role[] = ["administrator", "operator", "pengawal", "kepala_pengamanan", "pemantau_kanwil", "pemantau_pusat"];

test("Administrator tidak membuka halaman kerja Operator, Kepala, atau Pengawal", () => {
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

test("Pemantau hanya membaca: dasbor, detail sesi, evaluasi, risiko, pedoman", () => {
  for (const r of ["pemantau_kanwil", "pemantau_pusat"] as Role[]) {
    for (const ok of ["/", "/sesi/abc", "/sesi/abc/laporan", "/evaluasi", "/risiko", "/pedoman"]) {
      assert.equal(canAccess(r, ok), true, `${r} ${ok}`);
    }
    for (const no of ["/kegiatan", "/keputusan", "/tindak-lanjut", "/admin/akun", "/lapangan"]) {
      assert.equal(canAccess(r, no), false, `${r} ${no}`);
    }
  }
});

test("halaman Administrator tertutup untuk peran lain; Pedoman terbuka untuk semua termasuk Pengawal", () => {
  assert.equal(canAccess("administrator", "/admin/akun"), true);
  assert.equal(canAccess("administrator", "/admin/audit"), true);
  for (const r of roles.filter((x) => x !== "administrator")) assert.equal(canAccess(r, "/admin/akun"), false, r);
  for (const r of roles) assert.equal(canAccess(r, "/pedoman"), true, r);
  assert.equal(canAccess("pengawal", "/evaluasi"), false);
  assert.equal(canAccess("pengawal", "/sesi/abc"), false);
});

test("tindak lanjut: Kepala dan Operator di dasbor kerja, Pengawal lewat halaman lapangan", () => {
  assert.equal(canAccess("kepala_pengamanan", "/tindak-lanjut"), true);
  assert.equal(canAccess("operator", "/tindak-lanjut"), true);
  assert.equal(canAccess("administrator", "/tindak-lanjut"), false);
  assert.equal(canAccess("pengawal", "/tindak-lanjut"), false);
});
