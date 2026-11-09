// Nilai NEXT_PUBLIC_* harus ditulis persis seperti ini agar ikut tertanam saat build.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi. Lihat .env.example."
    );
  }
}
