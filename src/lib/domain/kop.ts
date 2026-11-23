// Kop surat UPT. Semua baris dapat diisi sendiri; bila dikosongkan dipakai susunan baku.

export type KopUpt = {
  /** Baris judul buatan UPT. null = pakai susunan baku. */
  baris: string[] | null;
  kanwil: string | null;
  upt: string;
  alamat: string | null;
  kodePos: string | null;
  telepon: string | null;
  faks: string | null;
  email: string | null;
  website: string | null;
  kota: string | null;
};

export const BARIS_KOP_MAKS = 8;

/** Susunan baku kop: kementerian, negara, direktorat jenderal, Kanwil (bila ada), lalu nama UPT. */
export function barisBaku(kanwil: string | null, upt: string): string[] {
  return [
    "KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN",
    "REPUBLIK INDONESIA",
    "DIREKTORAT JENDERAL PEMASYARAKATAN",
    ...(kanwil ? [kanwil.toUpperCase()] : []),
    upt.toUpperCase(),
  ];
}

export function barisKop(k: Pick<KopUpt, "baris" | "kanwil" | "upt">): string[] {
  const sendiri = (k.baris ?? []).map((b) => b.trim()).filter(Boolean);
  return sendiri.length > 0 ? sendiri : barisBaku(k.kanwil, k.upt);
}

/** Satu baris kecil di bawah judul kop: alamat, telepon, faksimile, pos-el, dan laman. */
export function alamatKop(k: Pick<KopUpt, "alamat" | "kodePos" | "telepon" | "faks" | "email" | "website">): string {
  const alamat = [k.alamat, k.kodePos ? `Kode Pos ${k.kodePos}` : null].filter(Boolean).join(" ");
  return [
    alamat || null,
    k.telepon ? `Telepon ${k.telepon}` : null,
    k.faks ? `Faksimile ${k.faks}` : null,
    k.email ? `Pos-el ${k.email}` : null,
    k.website ? `Laman ${k.website}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
