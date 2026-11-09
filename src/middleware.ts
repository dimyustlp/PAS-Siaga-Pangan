import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { HOME, canAccess } from "@/lib/rbac";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

export async function middleware(request: NextRequest) {
  // Bila variabel lingkungan belum diisi, jangan crash: arahkan ke halaman login yang menjelaskan masalahnya.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new NextResponse(
      "Konfigurasi Supabase belum diisi (NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
      { status: 503 }
    );
  }

  const { pathname } = request.nextUrl;
  const { supabase, user, profile, getResponse } = await updateSession(request, pathname === "/login");

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = NextResponse.redirect(url);
    // Bawa serta cookie sesi yang baru disegarkan.
    getResponse()
      .cookies.getAll()
      .forEach((c) => res.cookies.set(c));
    return res;
  };

  if (pathname === "/login") {
    if (user && profile?.is_active) return redirectTo(HOME[profile.role]);
    return getResponse();
  }

  if (!user) return redirectTo("/login", { next: pathname });

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return redirectTo("/login", { error: profile ? "nonaktif" : "profil" });
  }

  if (!canAccess(profile.role, pathname)) return redirectTo(HOME[profile.role]);

  return getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
