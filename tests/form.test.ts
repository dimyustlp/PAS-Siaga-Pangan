import { test } from "node:test";
import assert from "node:assert/strict";
import { buatMasukan, cek, keInputWib, num, str, waktuWib, yaTidak } from "../src/lib/form.ts";

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};

test("pembaca isian: teks kosong jadi undefined, angka koma desimal, centang, ya/tidak", () => {
  const f = fd({ a: "  halo ", b: "  ", c: "1,5", d: "x", e: "on", g: "ya", h: "tidak", i: "" });
  assert.equal(str(f, "a"), "halo");
  assert.equal(str(f, "b"), undefined);
  assert.equal(str(f, "zzz"), undefined);
  assert.equal(num(f, "c"), 1.5);
  assert.equal(num(f, "d"), undefined);
  assert.equal(cek(f, "e"), true);
  assert.equal(cek(f, "zzz"), false);
  assert.equal(yaTidak(f, "g"), true);
  assert.equal(yaTidak(f, "h"), false);
  assert.equal(yaTidak(f, "i"), undefined);
});

test("waktu lokal dianggap WIB", () => {
  assert.equal(waktuWib("2026-11-10T08:30"), "2026-11-10T01:30:00.000Z");
  assert.equal(waktuWib(""), undefined);
  assert.equal(waktuWib("bukan waktu"), undefined);
  assert.equal(keInputWib(new Date("2026-11-10T01:30:00Z")), "2026-11-10T08:30");
});

test("pemetaan deklaratif menghasilkan masukan aksi", () => {
  const f = fd({ n: "7", t: " teks ", cb: "on", ids: ["a", "b"], yt: "ya" });
  const r = buatMasukan(f, {
    tetap: { v: "X" },
    teks: { s: "t" },
    kosong: { s: "tidakada" },
    angka: { n: "n" },
    centang: { b: "cb" },
    banyak: { a: "ids" },
    yatidak: { yt: "yt" },
  });
  assert.deepEqual(r, { tetap: "X", teks: "teks", angka: 7, centang: true, banyak: ["a", "b"], yatidak: true });
});
