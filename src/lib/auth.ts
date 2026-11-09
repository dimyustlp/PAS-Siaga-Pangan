import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/rbac";

export type CurrentUser = {
  id: string;
  email: string | undefined;
  fullName: string;
  role: Role;
  kodeUpt: string | null;
};

/** Dipakai di halaman server. Bila belum masuk, kembali ke /login. */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,role,kode_upt,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) redirect("/login");

  return {
    id: user.id,
    email: user.email,
    fullName: profile.full_name,
    role: profile.role as Role,
    kodeUpt: profile.kode_upt,
  };
}
