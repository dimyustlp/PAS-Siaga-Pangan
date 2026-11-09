import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Role } from "@/lib/rbac";

export type SessionProfile = { role: Role; is_active: boolean } | null;

/** Menyegarkan sesi login, lalu membaca peran pengguna dari tabel profiles. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
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

  // getUser() memeriksa token ke server Supabase, bukan sekadar membaca cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: SessionProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as SessionProfile) ?? null;
  }

  return { supabase, user, profile, getResponse: () => response };
}
