"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { HOME, canAccess, safeNext, type Role } from "@/lib/rbac";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Email atau kata sandi salah." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Akun belum aktif atau belum terdaftar. Hubungi Operator UPT." };
  }

  const role = profile.role as Role;
  const next = safeNext(formData.get("next"));
  redirect(next && canAccess(role, next) ? next : HOME[role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
