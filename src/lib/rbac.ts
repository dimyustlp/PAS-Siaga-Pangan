export type Role = "administrator" | "operator" | "pengawal" | "kepala_pengamanan";

export const ROLE_LABEL: Record<Role, string> = {
  administrator: "Administrator",
  operator: "Operator UPT",
  pengawal: "Pengawal",
  kepala_pengamanan: "Kepala Pengamanan",
};

/** Halaman pertama setelah masuk, menurut peran. */
export const HOME: Record<Role, string> = {
  administrator: "/",
  operator: "/",
  kepala_pengamanan: "/",
  pengawal: "/lapangan",
};

type Rule = { prefix: string; exact?: boolean; roles: Role[] };

/**
 * Daftar halaman dan peran yang boleh membukanya.
 * Halaman yang tidak tercantum di sini DITOLAK untuk semua peran (aman secara bawaan).
 * Ini hanya pembatas tampilan. Penjaga yang sebenarnya adalah aturan RLS di database.
 */
const RULES: Rule[] = [
  { prefix: "/", exact: true, roles: ["administrator", "operator", "kepala_pengamanan"] },
  { prefix: "/kegiatan", roles: ["operator"] },
  { prefix: "/keputusan", roles: ["kepala_pengamanan"] },
  { prefix: "/lapangan", roles: ["pengawal"] },
];

export function canAccess(role: Role, pathname: string): boolean {
  const rule = RULES.find((r) =>
    r.exact ? pathname === r.prefix : pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
  return rule ? rule.roles.includes(role) : false;
}

/** Hanya terima alamat internal, supaya parameter ?next= tidak bisa dipakai membelokkan ke situs lain. */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}
