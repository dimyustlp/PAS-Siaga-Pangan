import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hitungPenilaian, INDIKATOR_PENILAIAN, kategoriDari, type BarisSkor } from "../src/lib/domain/penilaian.ts";
import { dokumenKurang, DOKUMEN_WAJIB } from "../src/lib/domain/dokumen-wajib.ts";
import { VARIABEL_STATUS } from "../src/lib/domain/instrumen-status.ts";

const semua = (skor: 0 | 1 | 2): BarisSkor[] => INDIKATOR_PENILAIAN.map((i) => ({ no: i.no, skor, tb: false }));

describe("rumus penilaian pedoman", () => {
  it("memuat 19 indikator", () => {
    assert.equal(INDIKATOR_PENILAIAN.length, 19);
  });

  it("semua skor 2 memberi 100% dan Sangat Baik", () => {
    const h = hitungPenilaian(semua(2));
    assert.equal(h.berlaku, 19);
    assert.equal(h.totalSkor, 38);
    assert.equal(h.skorMaksimal, 38);
    assert.equal(h.persentase, 100);
    assert.equal(h.kategori, "Sangat Baik");
  });

  it("TB mengurangi indikator berlaku dan skor maksimal", () => {
    const baris = semua(2).map((b) => (b.no === 12 || b.no === 13 ? { no: b.no, skor: null, tb: true } : b));
    const h = hitungPenilaian(baris as BarisSkor[]);
    assert.equal(h.jumlahTB, 2);
    assert.equal(h.berlaku, 17);
    assert.equal(h.skorMaksimal, 34);
    assert.equal(h.totalSkor, 34);
    assert.equal(h.persentase, 100);
  });

  it("campuran skor dihitung (2 x skor 2) + skor 1", () => {
    const baris = semua(2).map((b) => (b.no <= 4 ? { ...b, skor: 1 as const } : b.no === 5 ? { ...b, skor: 0 as const } : b));
    const h = hitungPenilaian(baris);
    assert.equal(h.skor2, 14);
    assert.equal(h.skor1, 4);
    assert.equal(h.skor0, 1);
    assert.equal(h.totalSkor, 14 * 2 + 4);
    assert.equal(h.persentase, Math.round((32 / 38) * 1000) / 10);
    assert.equal(h.kategori, "Baik");
  });

  it("batas kategori mengikuti pedoman", () => {
    assert.equal(kategoriDari(0), "Kurang");
    assert.equal(kategoriDari(50), "Kurang");
    assert.equal(kategoriDari(50.1), "Cukup");
    assert.equal(kategoriDari(70), "Cukup");
    assert.equal(kategoriDari(70.1), "Baik");
    assert.equal(kategoriDari(90), "Baik");
    assert.equal(kategoriDari(90.1), "Sangat Baik");
    assert.equal(kategoriDari(100), "Sangat Baik");
  });

  it("indikator yang belum dinilai menahan persentase", () => {
    const baris = semua(2).slice(0, 18);
    const h = hitungPenilaian(baris);
    assert.equal(h.lengkap, false);
    assert.equal(h.persentase, null);
    assert.equal(h.belumDinilai, 1);
  });
});

describe("dokumen wajib dan status variabel", () => {
  it("memuat dokumen a sampai m", () => {
    assert.equal(DOKUMEN_WAJIB.map((d) => d.kode).join(""), "abcdefghijklm");
  });

  it("dokumen yang tidak berlaku tidak dihitung kurang, b d e dinilai otomatis", () => {
    const baris = DOKUMEN_WAJIB.map((d) => ({ kode: d.kode, berlaku: d.kode !== "f" && d.kode !== "g", tersedia: false, nomor: null, alasan_tb: null }));
    const kurang = dokumenKurang(baris, { nominatif: true, rencanaPengamanan: true, suratPerintah: false }).map((d) => d.kode);
    assert.ok(!kurang.includes("f"));
    assert.ok(!kurang.includes("b"));
    assert.ok(!kurang.includes("d"));
    assert.ok(kurang.includes("e"));
    assert.ok(kurang.includes("a"));
  });

  it("delapan variabel dan hanya variabel gelang yang boleh TB", () => {
    assert.equal(VARIABEL_STATUS.length, 8);
    assert.deepEqual(VARIABEL_STATUS.filter((v) => v.bolehTB).map((v) => v.no), [7]);
  });
});
