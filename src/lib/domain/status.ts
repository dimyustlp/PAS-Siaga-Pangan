// Logika murni (tanpa akses database) untuk status keamanan dan jadwal pemeriksaan berkala.

export type SecurityStatus = "HIJAU" | "KUNING" | "MERAH" | "KRITIS";

export const STATUS_RANK: Record<SecurityStatus, number> = { HIJAU: 0, KUNING: 1, MERAH: 2, KRITIS: 3 };

/** Pengawal hanya boleh menaikkan status. Penurunan hanya lewat keputusan Kepala Pengamanan. */
export function isEscalation(current: SecurityStatus, target: SecurityStatus): boolean {
  return STATUS_RANK[target] > STATUS_RANK[current];
}

export type CheckState = {
  /** belum_mulai: belum ada acuan waktu. segera: batas waktu dalam jendela peringatan. terlambat: batas terlewati. */
  state: "belum_mulai" | "aman" | "segera" | "terlambat";
  dueAt: Date | null;
  /** Sisa menit sampai batas (negatif bila terlambat). */
  minutesLeft: number | null;
};

const toDate = (v: string | Date | null | undefined): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Batas pemeriksaan berkala = waktu pemeriksaan terakhir + interval.
 * Bila belum pernah ada pemeriksaan, acuannya waktu tiba di lokasi (startedAt).
 * Jendela "segera" = 20% interval, paling lama 10 menit.
 */
export function periodicCheckState(input: {
  intervalMinutes: number;
  lastCheckAt: string | Date | null;
  startedAt: string | Date | null;
  now: Date;
}): CheckState {
  const baseline = toDate(input.lastCheckAt) ?? toDate(input.startedAt);
  if (!baseline || !(input.intervalMinutes > 0)) return { state: "belum_mulai", dueAt: null, minutesLeft: null };

  const dueAt = new Date(baseline.getTime() + input.intervalMinutes * 60_000);
  const diffMs = dueAt.getTime() - input.now.getTime();
  const minutesLeft = Math.ceil(diffMs / 60_000);
  const warnWindow = Math.min(10, Math.ceil(input.intervalMinutes * 0.2));

  if (diffMs < 0) return { state: "terlambat", dueAt, minutesLeft };
  if (minutesLeft <= warnWindow) return { state: "segera", dueAt, minutesLeft };
  return { state: "aman", dueAt, minutesLeft };
}
