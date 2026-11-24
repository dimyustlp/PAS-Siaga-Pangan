// Klien tanpa pengetikan ketat, dipakai untuk tabel dan fungsi yang ditambahkan oleh migrasi 21
// (dokumen wajib, status variabel, kontrol alat, penilaian) dan belum ada di database.types.ts.
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KlienLonggar = SupabaseClient<any, "public", any>;

export function longgar(client: unknown): KlienLonggar {
  return client as KlienLonggar;
}
