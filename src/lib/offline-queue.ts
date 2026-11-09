// Antrean entri lapangan di perangkat Pengawal. Entri disimpan lebih dulu, lalu dikirim saat ada sinyal.
// Antrean dipisah per akun supaya entri tidak terkirim atas nama orang lain bila perangkat dipakai bergantian.

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type EntriAntre = {
  client_id: string;
  session_id: string;
  waktu_kejadian: string;
  jenis_entri: string;
  payload: Record<string, unknown>;
  bukti_path?: string;
  /** Pesan penolakan dari server; entri ini tidak akan terkirim sebelum diperbaiki atau dihapus. */
  galat?: string;
};

const kunci = (userId: string) => `pas-siaga:antrean:v1:${userId}`;

export function bacaAntrean(s: StorageLike, userId: string): EntriAntre[] {
  try {
    const raw = s.getItem(kunci(userId));
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((e): e is EntriAntre => !!e && typeof e === "object" && typeof (e as EntriAntre).client_id === "string");
  } catch {
    return [];
  }
}

function tulis(s: StorageLike, userId: string, arr: EntriAntre[]) {
  if (arr.length === 0) s.removeItem(kunci(userId));
  else s.setItem(kunci(userId), JSON.stringify(arr));
}

export function tambahAntrean(s: StorageLike, userId: string, e: EntriAntre): EntriAntre[] {
  const arr = bacaAntrean(s, userId).filter((x) => x.client_id !== e.client_id);
  arr.push(e);
  tulis(s, userId, arr);
  return arr;
}

export function hapusDariAntrean(s: StorageLike, userId: string, clientIds: string[]): EntriAntre[] {
  const buang = new Set(clientIds);
  const arr = bacaAntrean(s, userId).filter((x) => !buang.has(x.client_id));
  tulis(s, userId, arr);
  return arr;
}

export function tandaiGalat(s: StorageLike, userId: string, galat: Record<string, string>): EntriAntre[] {
  const arr = bacaAntrean(s, userId).map((x) => (galat[x.client_id] ? { ...x, galat: galat[x.client_id] } : x));
  tulis(s, userId, arr);
  return arr;
}

export function bersihkanGalat(s: StorageLike, userId: string, clientId: string): EntriAntre[] {
  const arr = bacaAntrean(s, userId).map((x) => {
    if (x.client_id !== clientId) return x;
    const { galat: _g, ...sisa } = x;
    void _g;
    return sisa;
  });
  tulis(s, userId, arr);
  return arr;
}

/** Entri yang siap dikirim: belum pernah ditolak server. Diurutkan menurut jam kejadian. */
export function siapKirim(arr: EntriAntre[]): EntriAntre[] {
  return arr.filter((e) => !e.galat).sort((a, b) => Date.parse(a.waktu_kejadian) - Date.parse(b.waktu_kejadian));
}
