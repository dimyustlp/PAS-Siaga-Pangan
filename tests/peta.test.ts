import { test } from "node:test";
import assert from "node:assert/strict";
import { kondisiSesi, kondisiTerburuk, susunPeta, type KegiatanMasuk } from "../src/lib/domain/peta.ts";

const upt = [
  { kode: "CIANGIR", nama: "Lapas Terbuka Ciangir", jenis: "Lapas Terbuka", kelas: "IIB", kab_kota: "Kab. Tangerang", kanwil_id: "k1", latitude: -6.3, longitude: 106.6, titik_perkiraan: true },
  { kode: "LPLAIN", nama: "Lapas Lain", jenis: "Lapas", kelas: "IIA", kab_kota: "Kota X", kanwil_id: "k2", latitude: -7, longitude: 110, titik_perkiraan: true },
];
const keg = (id: string, lokasi: string, extra: Partial<KegiatanMasuk> = {}): KegiatanMasuk => ({
  id, kode_kegiatan: `CIANGIR-${id}`, jenis_kegiatan: "Pertanian", kode_upt: "CIANGIR", tanggal_mulai: "2026-11-01", rencana_berakhir: null, luas_lahan_ha: 2, lokasi_id: lokasi, ...extra,
});
const lokasi = [
  { id: "L1", nama: "Kebun dalam", posisi: "Dalam UPT", latitude: null, longitude: null },
  { id: "L2", nama: "Sawah mitra", posisi: "Dalam UPT", latitude: null, longitude: null },
  { id: "L3", nama: "Sawah desa", posisi: "Luar UPT", latitude: -6.32, longitude: 106.62 },
];

test("kondisi terburuk mengikuti urutan kritis > merah > kuning > hijau > menunggu > tanpa sesi", () => {
  assert.equal(kondisiTerburuk(["HIJAU", "MENUNGGU", "KUNING"]), "KUNING");
  assert.equal(kondisiTerburuk(["TANPA_SESI", "MENUNGGU"]), "MENUNGGU");
  assert.equal(kondisiTerburuk(["HIJAU", "KRITIS"]), "KRITIS");
});

test("sesi yang belum diizinkan mulai tidak diberi warna status", () => {
  assert.equal(kondisiSesi({ session_id: "s", activity_id: "a", tanggal_sesi: "2026-11-09", status_kesiapan: "Menunggu", status_keamanan: "HIJAU", fase: null, jumlah_narapidana: 3, gangguan_terbuka: 0 }), "MENUNGGU");
  assert.equal(kondisiSesi(null), "TANPA_SESI");
});

test("kegiatan dalam UPT digabung di titik UPT, kegiatan luar UPT berdiri di titik lokasinya", () => {
  const { penanda, upt: hasil } = susunPeta({
    upt,
    kegiatan: [keg("1", "L1"), keg("2", "L2"), keg("3", "L3"), keg("4", "L1", { rencana_berakhir: "2026-11-05" })],
    lokasi,
    sesiTerbuka: [
      { session_id: "s1", activity_id: "1", tanggal_sesi: "2026-11-09", status_kesiapan: "Dapat Dimulai", status_keamanan: "KUNING", fase: "Di lokasi", jumlah_narapidana: 5, gangguan_terbuka: 0 },
      { session_id: "s3", activity_id: "3", tanggal_sesi: "2026-11-09", status_kesiapan: "Dapat Dimulai", status_keamanan: "MERAH", fase: "Di lokasi", jumlah_narapidana: 8, gangguan_terbuka: 1 },
    ],
    alarmPerUpt: { CIANGIR: 2 },
    hariIni: "2026-11-09",
  });
  assert.equal(penanda.length, 2, "kegiatan 4 sudah berakhir dan tanpa sesi, tidak tampil");
  const dalam = penanda.find((p) => p.letak === "Dalam UPT")!;
  const luar = penanda.find((p) => p.letak === "Luar UPT")!;
  assert.equal(dalam.kegiatan.length, 2);
  assert.equal(dalam.kondisi, "KUNING");
  assert.deepEqual([dalam.lat, dalam.lng], [-6.3, 106.6]);
  assert.equal(luar.kondisi, "MERAH");
  assert.deepEqual([luar.lat, luar.lng, luar.titikSendiri], [-6.32, 106.62, true]);
  assert.equal(penanda[0].kondisi, "MERAH", "yang paling genting di urutan pertama");
  const c = hasil.find((u) => u.kode === "CIANGIR")!;
  assert.deepEqual([c.kondisi, c.jumlahDalam, c.jumlahLuar, c.alarm], ["MERAH", 2, 1, 2]);
  assert.equal(hasil.find((u) => u.kode === "LPLAIN")!.kondisi, null);
});
