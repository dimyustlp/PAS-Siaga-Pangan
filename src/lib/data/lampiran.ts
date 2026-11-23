import type { ServerClient } from "@/lib/actions/_shared";

type TiketAmbil =
  | { sumber: "supabase"; path: string; mime: string; nama: string; ukuran: number }
  | { sumber: "drive"; url: string; tiket: string; sig: string; mime: string; nama: string; ukuran: number; drive_url: string };

const POTONG = 3 * 1024 * 1024;

function dariBase64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

/** Membaca satu potongan berkas Drive lewat Apps Script (tiket ditandatangani database, berlaku 10 menit). */
async function potonganDrive(t: Extract<TiketAmbil, { sumber: "drive" }>, mulai: number) {
  const u = new URL(t.url);
  u.searchParams.set("tiket", t.tiket);
  u.searchParams.set("sig", t.sig);
  u.searchParams.set("mulai", String(mulai));
  u.searchParams.set("panjang", String(POTONG));
  const r = await fetch(u, { redirect: "follow", cache: "no-store" });
  const j = (await r.json()) as { ok: boolean; data?: string; total?: number; galat?: string };
  if (!j.ok || typeof j.data !== "string") throw new Error(j.galat ?? "Berkas Drive tidak terbaca.");
  return { bytes: dariBase64(j.data), total: Number(j.total ?? 0) };
}

export async function infoLampiran(supabase: ServerClient, id: string): Promise<TiketAmbil | null> {
  const { data, error } = await supabase.rpc("tiket_ambil", { p_lampiran: id });
  if (error || !data) return null;
  return data as unknown as TiketAmbil;
}

/** Isi utuh lampiran (dipakai laporan PDF). Hak baca diperiksa database lewat tiket_ambil. */
export async function isiLampiran(supabase: ServerClient, id: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  const t = await infoLampiran(supabase, id);
  if (!t) return null;
  try {
    if (t.sumber === "supabase") {
      const { data } = await supabase.storage.from("pas-siaga-evidence").download(t.path);
      if (!data) return null;
      return { mime: t.mime, bytes: new Uint8Array(await data.arrayBuffer()) };
    }
    const bagian: Uint8Array[] = [];
    let mulai = 0;
    let total = Infinity;
    while (mulai < total) {
      const p = await potonganDrive(t, mulai);
      total = p.total || p.bytes.length;
      if (p.bytes.length === 0) break;
      bagian.push(p.bytes);
      mulai += p.bytes.length;
    }
    const gabung = new Uint8Array(bagian.reduce((a, b) => a + b.length, 0));
    let i = 0;
    for (const b of bagian) {
      gabung.set(b, i);
      i += b.length;
    }
    return { mime: t.mime, bytes: gabung };
  } catch {
    return null;
  }
}

/** Aliran isi lampiran untuk ditampilkan di browser (dipotong per 3 MB agar tidak melampaui batas server). */
export function alirkanDrive(t: Extract<TiketAmbil, { sumber: "drive" }>): ReadableStream<Uint8Array> {
  let mulai = 0;
  let total = Infinity;
  return new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      if (mulai >= total) return ctrl.close();
      try {
        const p = await potonganDrive(t, mulai);
        total = p.total || p.bytes.length;
        if (p.bytes.length === 0) return ctrl.close();
        mulai += p.bytes.length;
        ctrl.enqueue(p.bytes);
        if (mulai >= total) ctrl.close();
      } catch (e) {
        ctrl.error(e);
      }
    },
  });
}

export type { TiketAmbil };
