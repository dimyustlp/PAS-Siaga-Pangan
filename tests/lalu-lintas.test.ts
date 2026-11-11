import test from "node:test";
import assert from "node:assert/strict";
import { kembaliSah, ringkasLalin, selisihKembali } from "../src/lib/domain/lalu-lintas.ts";

const dasar = { wbp_keluar: null, wbp_kembali: null, wbp_terakhir_dihitung: null, keluar_at: null, kembali_at: null };

test("selisih kosong sebelum ada catatan kembali", () => {
  const o = { ...dasar, wbp_keluar: 20, keluar_at: "2026-11-11T01:00:00Z" };
  assert.equal(selisihKembali(o), null);
  assert.equal(kembaliSah(o), false);
});

test("kembali sebelum keluar tidak dianggap sah", () => {
  const o = { ...dasar, wbp_keluar: 20, wbp_kembali: 20, keluar_at: "2026-11-11T05:00:00Z", kembali_at: "2026-11-11T03:00:00Z" };
  assert.equal(kembaliSah(o), false);
});

test("ringkasan menghitung keluar, kembali, masih di luar, dan selisih", () => {
  const baris = [
    { ...dasar, wbp_keluar: 20, wbp_kembali: 20, keluar_at: "2026-11-11T01:00:00Z", kembali_at: "2026-11-11T08:00:00Z" },
    { ...dasar, wbp_keluar: 15, wbp_kembali: 14, keluar_at: "2026-11-11T01:00:00Z", kembali_at: "2026-11-11T08:00:00Z" },
    { ...dasar, wbp_keluar: 10, wbp_terakhir_dihitung: 9, keluar_at: "2026-11-11T01:00:00Z" },
  ];
  assert.deepEqual(ringkasLalin(baris), { sesi: 3, keluar: 45, kembali: 34, masihDiLuar: 9, selisih: 1 });
});
