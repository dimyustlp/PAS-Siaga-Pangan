// Format tanggal dan jam untuk tampilan. Semua dalam WIB (Asia/Jakarta).

const TZ = "Asia/Jakarta";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: TZ, ...opts });
const toDate = (v: string | Date | null | undefined) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function fmtWaktu(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d ? fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(".", ":") + " WIB" : "-";
}
export function fmtJam(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d ? fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(".", ":") : "-";
}
export function fmtTanggal(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d ? fmt({ day: "numeric", month: "long", year: "numeric" }).format(d) : "-";
}
export function fmtTanggalPendek(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d ? fmt({ day: "numeric", month: "short" }).format(d) : "-";
}

/** "5 menit lalu", "2 jam lalu", "3 hari lalu". */
export function sejak(v: string | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(v);
  if (!d) return "-";
  const menit = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  if (menit < 60 * 48) return `${Math.floor(menit / 60)} jam lalu`;
  return `${Math.floor(menit / 1440)} hari lalu`;
}

/** Sisa waktu, mis. "12 menit lagi" atau "terlambat 8 menit". */
export function sisaWaktu(menit: number | null): string {
  if (menit === null) return "-";
  if (menit >= 0) return menit >= 120 ? `${Math.floor(menit / 60)} jam lagi` : `${menit} menit lagi`;
  const t = Math.abs(menit);
  return t >= 120 ? `terlambat ${Math.floor(t / 60)} jam` : `terlambat ${t} menit`;
}

/** Tanggal hari ini menurut WIB, format TTTT-BB-HH. */
export function hariIniWib(now: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p;
}

/** Senin pada minggu dari tanggal TTTT-BB-HH. */
export function awalMinggu(tanggal: string): string {
  const d = new Date(tanggal + "T00:00:00Z");
  const hari = (d.getUTCDay() + 6) % 7; // Senin = 0
  d.setUTCDate(d.getUTCDate() - hari);
  return d.toISOString().slice(0, 10);
}

export function tambahHari(tanggal: string, n: number): string {
  const d = new Date(tanggal + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
