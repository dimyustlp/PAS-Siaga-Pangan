import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, assertEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  assertEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: aman diabaikan, middleware yang menyegarkan sesi.
        }
      },
    },
  });
}
