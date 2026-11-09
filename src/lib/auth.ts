import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/rbac";

export type CurrentUser = {
  id: string;
  email: string | undefined;
  fullName: string;
  role: Role;
  kodeUpt: string | null;
  kanwilId: string | null;
};

/**
 * Dipakai di halaman server. Bila belum masuk, kembali ke /login.
 * Hasilnya dibagi dalam satu permintaan (layout dan halaman tidak mengulang pemeriksaan),
 * dan tanda masuk diperiksa lokal lewat getClaims sehingga tidak perlu bolak-balik ke server login.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,role,kode_upt,kanwil_id,is_active")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile || !profile.is_active) redirect("/login");

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    fullName: profile.full_name,
    role: profile.role as Role,
    kodeUpt: profile.kode_upt,
    kanwilId: profile.kanwil_id,
  };
});
