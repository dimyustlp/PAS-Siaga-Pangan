export type Role =
  | "administrator"
  | "operator"
  | "pengawal"
  | "kepala_pengamanan"
  | "pemantau_kanwil"
  | "pemantau_pusat";

export const ALL_ROLES: Role[] = [
  "administrator",
  "operator",
  "pengawal",
  "kepala_pengamanan",
  "pemantau_kanwil",
  "pemantau_pusat",
];
const NON_PENGAWAL: Role[] = ["administrator", "operator", "kepala_pengamanan", "pemantau_kanwil", "pemantau_pusat"];

export const ROLE_LABEL: Record<Role, string> = {
  administrator: "Administrator",
  operator: "Operator UPT",
  pengawal: "Pengawal",
  kepala_pengamanan: "Kepala Pengamanan",
  pemantau_kanwil: "Pemantau Kanwil",
  pemantau_pusat: "Pemantau Pusat",
};

/** Halaman pertama setelah masuk, menurut peran. */
export const HOME: Record<Role, string> = {
  administrator: "/",
  operator: "/",
  kepala_pengamanan: "/",
  pengawal: "/lapangan",
  pemantau_kanwil: "/",
  pemantau_pusat: "/",
};

type Rule = { prefix: string; exact?: boolean; roles: Role[] };

/**
 * Daftar halaman dan peran yang boleh membukanya.
 * Halaman yang tidak tercantum di sini DITOLAK untuk semua peran (aman secara bawaan).
 * Ini hanya pembatas tampilan. Penjaga yang sebenarnya adalah aturan RLS di database.
 */
const RULES: Rule[] = [
  { prefix: "/", exact: true, roles: NON_PENGAWAL },
  { prefix: "/sesi", roles: NON_PENGAWAL },
  { prefix: "/kegiatan", roles: ["operator"] },
  { prefix: "/keputusan", roles: ["kepala_pengamanan"] },
  { prefix: "/tindak-lanjut", roles: ["operator", "kepala_pengamanan"] },
  { prefix: "/evaluasi", roles: NON_PENGAWAL },
  { prefix: "/risiko", roles: NON_PENGAWAL },
  { prefix: "/berkas", roles: ALL_ROLES },
  { prefix: "/pedoman", roles: ALL_ROLES },
  { prefix: "/admin", roles: ["administrator"] },
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
