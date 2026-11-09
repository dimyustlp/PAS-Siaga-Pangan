// Pemetaan error database menjadi pesan yang bisa dibaca pengguna.
// Tanpa import apa pun supaya bisa diuji langsung.

export type DbErrorLike = { code?: string | null; message?: string | null } | null | undefined;

export const PESAN_UMUM = "Terjadi gangguan pada server. Coba lagi sebentar lagi.";
export const PESAN_DITOLAK = "Tindakan ditolak: peran atau status sesi saat ini tidak mengizinkannya.";

/**
 * Aturan alur yang dijaga database (skrip skema) melempar error berkode 22023 atau 42501
 * dengan pesan berbahasa Indonesia yang memang ditujukan untuk pengguna, jadi diteruskan apa adanya.
 * Penolakan RLS bawaan Postgres berpesan teknis, jadi diganti pesan umum.
 */
export function mapDbError(error: DbErrorLike, konteksDitolak: string = PESAN_DITOLAK): string {
  if (!error) return PESAN_UMUM;
  const code = error.code ?? "";
  const message = (error.message ?? "").trim();

  if (/row-level security|^permission denied/i.test(message)) return konteksDitolak;

  if ((code === "22023" || code === "42501") && message) return message;

  switch (code) {
    case "23505":
      return "Data tersebut sudah ada.";
    case "23503":
      return "Data terkait tidak ditemukan atau masih dipakai data lain.";
    case "23514":
      return "Isian tidak memenuhi aturan yang berlaku.";
    case "22P02":
      return "Format isian tidak sesuai.";
    case "PGRST116":
      return "Data tidak ditemukan.";
    default:
      return PESAN_UMUM;
  }
}

/** True bila error adalah pelanggaran kunci unik pada kolom tertentu. */
export function isUniqueViolation(error: DbErrorLike, constraintFragment?: string): boolean {
  if (!error || error.code !== "23505") return false;
  return constraintFragment ? (error.message ?? "").includes(constraintFragment) : true;
}
