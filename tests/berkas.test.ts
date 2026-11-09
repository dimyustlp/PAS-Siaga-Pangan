import { test } from "node:test";
import assert from "node:assert/strict";
import { KATEGORI_BERKAS as KAT_VALIDASI, createBerkasSchema, kanwilTautanSchema } from "../src/lib/validations/berkas.ts";
import { KATEGORI_BERKAS, ringkasPerUpt, fmtUkuran } from "../src/lib/domain/berkas.ts";
import { canAccess, ALL_ROLES } from "../src/lib/rbac.ts";

const dasar = { kode_upt: "LPTB", kategori: "Laporan Kegiatan", judul: "Laporan panen", tanggal: "2026-11-09" };

test("berkas unggahan wajib berada di folder UPT-nya", () => {
  assert.ok(createBerkasSchema.safeParse({ ...dasar, sumber: "unggah", path: "LPTB/1-laporan.pdf" }).success);
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, sumber: "unggah", path: "LAIN/1-laporan.pdf" }).success);
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, sumber: "unggah", path: "LPTB/../x.pdf" }).success);
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, sumber: "unggah" }).success);
});

test("tautan berkas harus https", () => {
  assert.ok(createBerkasSchema.safeParse({ ...dasar, sumber: "tautan", tautan: "https://drive.google.com/x" }).success);
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, sumber: "tautan", tautan: "http://drive.google.com/x" }).success);
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, sumber: "tautan", tautan: "javascript:alert(1)" }).success);
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, sumber: "tautan" }).success);
});

test("kategori di luar daftar ditolak", () => {
  assert.ok(!createBerkasSchema.safeParse({ ...dasar, kategori: "Rahasia", sumber: "tautan", tautan: "https://x.id" }).success);
});

test("tautan Kanwil boleh kosong, bila diisi harus https", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const kosong = kanwilTautanSchema.parse({ id });
  assert.equal(kosong.tautan_form, null);
  assert.ok(!kanwilTautanSchema.safeParse({ id, tautan_form: "ftp://x" }).success);
  assert.ok(kanwilTautanSchema.safeParse({ id, tautan_form: "https://forms.gle/abc" }).success);
});

test("ringkasan per UPT: UPT tanpa berkas tetap muncul dengan nol", () => {
  const r = ringkasPerUpt([{ kode: "A" }, { kode: "B" }], [
    { kode_upt: "A", kategori: "Berita Acara", tanggal: "2026-11-01" },
    { kode_upt: "A", kategori: "Berita Acara", tanggal: "2026-11-05" },
  ]);
  assert.equal(r.get("A")?.total, 2);
  assert.equal(r.get("A")?.perKategori["Berita Acara"], 2);
  assert.equal(r.get("A")?.terakhir, "2026-11-05");
  assert.equal(r.get("B")?.total, 0);
});

test("ukuran berkas dibaca manusia", () => {
  assert.equal(fmtUkuran(500), "500 B");
  assert.equal(fmtUkuran(2048), "2 KB");
  assert.equal(fmtUkuran(5 * 1024 * 1024), "5.0 MB");
});

test("semua peran boleh membuka halaman Berkas", () => {
  for (const r of ALL_ROLES) assert.ok(canAccess(r, "/berkas"), r);
});

test("daftar kategori di validasi sama dengan di domain", () => {
  assert.deepEqual([...KAT_VALIDASI], [...KATEGORI_BERKAS]);
});
