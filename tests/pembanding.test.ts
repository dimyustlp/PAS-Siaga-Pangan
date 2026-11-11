import test from "node:test";
import assert from "node:assert/strict";
import { bandingkan, jumlahBulan, rataKondisiAwal, type KondisiAwalBaris, type Sesudah } from "../src/lib/domain/pembanding.ts";

const kosong: KondisiAwalBaris = { kegiatan_per_bulan: null, pct_catatan_lengkap: null, pct_serah_terima_cocok: null, pct_temuan_tindak_lanjut: null, pct_tindak_lanjut_selesai: null, menit_pelaporan_kejadian: null, gangguan_per_bulan: null };

test("rata-rata mengabaikan nilai kosong dan tidak mengubahnya jadi nol", () => {
  const r = rataKondisiAwal([{ ...kosong, pct_catatan_lengkap: 60 }, { ...kosong, pct_catatan_lengkap: 80, menit_pelaporan_kejadian: 45 }, kosong]);
  assert.equal(r.pct_catatan_lengkap, 70);
  assert.equal(r.menit_pelaporan_kejadian, 45);
  assert.equal(r.gangguan_per_bulan, null);
});

test("arah perbaikan mengikuti jenis indikator", () => {
  const awal = { ...kosong, pct_catatan_lengkap: 70, menit_pelaporan_kejadian: 45, gangguan_per_bulan: 4 };
  const sesudah: Sesudah = { ...kosong, pct_catatan_lengkap: 96, menit_pelaporan_kejadian: 12, gangguan_per_bulan: 6 };
  const b = Object.fromEntries(bandingkan(awal, sesudah).map((x) => [x.kunci, x]));
  assert.equal(b.pct_catatan_lengkap.membaik, true);
  assert.equal(b.pct_catatan_lengkap.selisih, 26);
  assert.equal(b.menit_pelaporan_kejadian.membaik, true);
  assert.equal(b.gangguan_per_bulan.membaik, false);
  assert.equal(b.kegiatan_per_bulan.membaik, null);
});

test("periode pendek tidak dihitung per bulan", () => {
  assert.equal(jumlahBulan("2026-11-01", "2026-11-03"), null);
  assert.ok((jumlahBulan("2026-09-01", "2026-09-30") ?? 0) > 0.9);
});
