import { test } from "node:test";
import assert from "node:assert/strict";
import { bacaAntrean, hapusDariAntrean, siapKirim, tambahAntrean, tandaiGalat, type EntriAntre, type StorageLike } from "../src/lib/offline-queue.ts";
import { bangunPayload, jumlahDiharapkan, JENIS_ENTRI } from "../src/lib/domain/entri-config.ts";
import { fieldLogSchema } from "../src/lib/validations/field-log.ts";

const memori = (): StorageLike & { d: Map<string, string> } => {
  const d = new Map<string, string>();
  return { d, getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v), removeItem: (k) => void d.delete(k) };
};
const e = (id: string, jam: number, extra: Partial<EntriAntre> = {}): EntriAntre => ({
  client_id: id, session_id: "s", jenis_entri: "Tiba di lokasi", payload: { jumlah_wbp: 1 }, waktu_kejadian: new Date(1_700_000_000_000 + jam * 60_000).toISOString(), ...extra,
});

test("antrean: simpan, urut menurut jam kejadian, tanpa ganda, dipisah per akun", () => {
  const s = memori();
  tambahAntrean(s, "u1", e("b", 5));
  tambahAntrean(s, "u1", e("a", 1));
  tambahAntrean(s, "u1", e("a", 1));
  tambahAntrean(s, "u2", e("z", 9));
  assert.deepEqual(siapKirim(bacaAntrean(s, "u1")).map((x) => x.client_id), ["a", "b"]);
  assert.equal(bacaAntrean(s, "u2").length, 1);
  assert.equal(bacaAntrean(s, "u3").length, 0);
});

test("antrean: entri ditolak tidak dikirim ulang terus-menerus, dan bisa dihapus", () => {
  const s = memori();
  tambahAntrean(s, "u1", e("a", 1));
  tambahAntrean(s, "u1", e("b", 2));
  tandaiGalat(s, "u1", { a: "Sesi sudah ditutup" });
  assert.deepEqual(siapKirim(bacaAntrean(s, "u1")).map((x) => x.client_id), ["b"]);
  hapusDariAntrean(s, "u1", ["a", "b"]);
  assert.equal(s.d.size, 0);
  s.setItem("pas-siaga:antrean:v1:u1", "{rusak");
  assert.deepEqual(bacaAntrean(s, "u1"), []);
});

test("setiap jenis entri membentuk payload yang lolos validasi bila diisi lengkap", () => {
  const isian: Record<string, Record<string, string>> = {
    "Serah terima di blok": { tahap: "kembali", jumlah_wbp: "10", jumlah_alat: "5", penggeledahan: "ya" },
    "P2U keluar atau masuk": { arah: "keluar" },
    "Tiba di lokasi": { jumlah_wbp: "10" },
    "Pemeriksaan berkala": { jumlah_wbp: "10" },
    "Pindah area atau ganti pengawal": { jumlah_wbp: "10", area_baru: "Kolam 2" },
    "Pihak luar dan kendaraan": { jenis: "Kendaraan", keterangan: "Truk pakan", nomor_kendaraan: "B 1 X" },
    "Pengembalian sebagian": { jumlah_wbp: "3" },
    "Alarm gelang": { jenis_alarm: "Keluar zona", dikonfirmasi_langsung: "tidak" },
    "Pemeriksaan gelang": { jumlah_diperiksa: "10", jumlah_berfungsi: "9" },
    Gangguan: { kategori: "Selisih jumlah WB", status_baru: "" },
    "Naikkan status": { status_baru: "MERAH", alasan: "Hujan deras" },
  };
  for (const j of JENIS_ENTRI) {
    const r = fieldLogSchema.safeParse({
      client_id: "11111111-1111-4111-8111-111111111111", session_id: "22222222-2222-4222-8222-222222222222",
      waktu_kejadian: new Date().toISOString(), jenis_entri: j.jenis, payload: bangunPayload(j.jenis, isian[j.jenis]),
    });
    assert.equal(r.success, true, `${j.jenis}: ${r.success ? "" : r.error.issues[0].message}`);
  }
  assert.equal(JENIS_ENTRI.length, 11);
});

test("isian bersyarat: penggeledahan hanya saat kembali; yt dan angka diubah", () => {
  const p = bangunPayload("Serah terima di blok", { tahap: "keluar", jumlah_wbp: "10", jumlah_alat: "5", penggeledahan: "ya" });
  assert.deepEqual(p, { tahap: "keluar", jumlah_wbp: 10, jumlah_alat: 5 });
  assert.equal(bangunPayload("Alarm gelang", { jenis_alarm: "x", dikonfirmasi_langsung: "ya" }).dikonfirmasi_langsung, true);
});

test("jumlah WB yang diharapkan mengikuti serah terima keluar dan pengembalian sebagian", () => {
  const t = (m: number) => new Date(1_700_000_000_000 + m * 60_000).toISOString();
  assert.equal(jumlahDiharapkan([], 12), 12);
  const logs = [
    { jenis_entri: "Serah terima di blok", payload: { tahap: "keluar", jumlah_wbp: 10 }, waktu_kejadian: t(0) },
    { jenis_entri: "Pengembalian sebagian", payload: { jumlah_wbp: 3 }, waktu_kejadian: t(30) },
  ];
  assert.equal(jumlahDiharapkan(logs, 12), 7);
});
