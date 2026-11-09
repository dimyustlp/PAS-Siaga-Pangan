import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Role } from "@/lib/rbac";
import type { Database } from "@/lib/supabase/database.types";

export type SessionProfile = { role: Role; is_active: boolean } | null;

/** Menyegarkan sesi login, lalu membaca peran pengguna dari tabel profiles. */
export async function updateSession(request: NextRequest, wajibDariDb = false) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() memeriksa tanda tangan token secara lokal (tanpa bolak-balik ke server login),
  // dan menyegarkan sesi bila hampir habis.
  const { data: tokenData } = await supabase.auth.getClaims();
  const claims = tokenData?.claims;
  const user = claims?.sub ? { id: claims.sub } : null;

  // Peran dan status aktif disalin ke token oleh database (app_metadata), jadi biasanya tanpa tanya database.
  // Untuk token lama yang belum membawa klaim itu, atau bila diminta (halaman masuk), baca dari tabel profiles.
  let profile: SessionProfile = null;
  if (user) {
    const meta = (claims?.app_metadata ?? {}) as { pas_role?: string; pas_aktif?: boolean };
    if (!wajibDariDb && meta.pas_role && typeof meta.pas_aktif === "boolean") {
      profile = { role: meta.pas_role as Role, is_active: meta.pas_aktif };
    } else {
      const { data } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
      profile = (data as SessionProfile) ?? null;
    }
  }

  return { supabase, user, profile, getResponse: () => response };
}
