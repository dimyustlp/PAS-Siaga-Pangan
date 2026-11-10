import { test } from "node:test";
import assert from "node:assert/strict";
import { KATEGORI_BERKAS as KAT_VALIDASI, createBerkasSchema, kanwilTautanSchema } from "../src/lib/validations/berkas.ts";
import { KATEGORI_BERKAS, ringkasPerUpt, ringkasPerKanwil, fmtUkuran } from "../src/lib/domain/berkas.ts";
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

test("ringkasan per Kanwil: hitung UPT lengkap, total, dan berkas terakhir", () => {
  const upt = [
    { kode: "A", kanwil_id: "k1" },
    { kode: "B", kanwil_id: "k1" },
    { kode: "C", kanwil_id: "k2" },
    { kode: "D", kanwil_id: null },
  ];
  const berkas = [
    ...["Surat Perintah", "Rencana Pengamanan", "Laporan Kegiatan", "Berita Acara"].map((kategori) => ({ kode_upt: "A", kategori, tanggal: "2026-11-02" })),
    { kode_upt: "B", kategori: "Berita Acara", tanggal: "2026-11-08" },
    { kode_upt: "D", kategori: "Dokumentasi", tanggal: "2026-11-03" },
  ];
  const r = ringkasPerKanwil([{ id: "k1", nama: "Kanwil Satu" }, { id: "k2", nama: "Kanwil Dua" }, { id: "k3", nama: "Kanwil Tiga" }], upt, ringkasPerUpt(upt, berkas));
  const satu = r.find((x) => x.id === "k1")!;
  assert.equal(satu.jumlahUpt, 2);
  assert.equal(satu.uptLengkap, 1);
  assert.equal(satu.total, 5);
  assert.equal(satu.terakhir, "2026-11-08");
  assert.equal(r.find((x) => x.id === "k2")?.total, 0);
  assert.equal(r.find((x) => x.id === "k3"), undefined, "Kanwil tanpa UPT pada cakupan disembunyikan");
  assert.equal(r.find((x) => x.id === null)?.nama, "Tanpa Kanwil");
});
