export type Role =
  | "administrator"
  | "operator"
  | "pengawal"
  | "kepala_pengamanan"
  | "pemantau_kanwil"
  | "pemantau_pusat"
  | "ka_upt";

export const ALL_ROLES: Role[] = [
  "administrator",
  "pemantau_pusat",
  "pemantau_kanwil",
  "ka_upt",
  "kepala_pengamanan",
  "operator",
  "pengawal",
];
const NON_PENGAWAL: Role[] = ["administrator", "operator", "kepala_pengamanan", "pemantau_kanwil", "pemantau_pusat", "ka_upt"];
const PENGELOLA_AKUN: Role[] = ["administrator", "pemantau_pusat", "pemantau_kanwil", "operator"];
const UPT_SAJA: Role[] = ["ka_upt", "kepala_pengamanan", "operator"];

/** Peran tingkat UPT (dipakai untuk pilihan saat membuat akun dari Kanwil). */
export const ROLE_UPT: Role[] = ["ka_upt", "kepala_pengamanan", "operator", "pengawal"];

export type Tingkat = "pusat" | "kanwil" | "upt" | "lapangan";

export function tingkatPeran(role: Role): Tingkat {
  if (role === "administrator" || role === "pemantau_pusat") return "pusat";
  if (role === "pemantau_kanwil") return "kanwil";
  if (role === "pengawal") return "lapangan";
  return "upt";
}

export const LABEL_TINGKAT: Record<Tingkat, string> = {
  pusat: "Tingkat Pusat",
  kanwil: "Tingkat Kantor Wilayah",
  upt: "Tingkat UPT",
  lapangan: "Petugas Lapangan",
};

/** Peran yang boleh dibuat oleh pengelola akun tertentu (Administrator, Pusat, Kanwil). */
export function peranBolehDibuat(role: Role): Role[] {
  if (role === "administrator") return ALL_ROLES;
  if (role === "pemantau_pusat") return ALL_ROLES.filter((r) => r !== "administrator");
  if (role === "pemantau_kanwil") return ROLE_UPT;
  if (role === "operator") return ["ka_upt", "kepala_pengamanan", "pengawal"];
  return [];
}

export const ROLE_LABEL: Record<Role, string> = {
  administrator: "Administrator",
  operator: "Operator UPT",
  pengawal: "Pengawal Kegiatan Ketahanan Pangan",
  kepala_pengamanan: "Kepala Pengamanan",
  pemantau_kanwil: "Pemantau Kanwil",
  pemantau_pusat: "Pemantau Pusat",
  ka_upt: "Ka.UPT",
};

/** Halaman pertama setelah masuk, menurut peran. */
export const HOME: Record<Role, string> = {
  administrator: "/",
  operator: "/",
  kepala_pengamanan: "/",
  pengawal: "/lapangan",
  pemantau_kanwil: "/",
  pemantau_pusat: "/",
  ka_upt: "/",
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
  { prefix: "/peta", roles: NON_PENGAWAL },
  { prefix: "/kegiatan", roles: ["operator"] },
  { prefix: "/rencana", roles: NON_PENGAWAL },
  { prefix: "/dokumen", roles: NON_PENGAWAL },
  { prefix: "/keputusan", roles: ["kepala_pengamanan"] },
  { prefix: "/tindak-lanjut", roles: ["operator", "kepala_pengamanan"] },
  { prefix: "/evaluasi", roles: NON_PENGAWAL },
  { prefix: "/risiko", roles: NON_PENGAWAL },
  { prefix: "/berkas", roles: ALL_ROLES },
  { prefix: "/data-induk", roles: NON_PENGAWAL },
  { prefix: "/lalu-lintas", roles: NON_PENGAWAL },
  { prefix: "/pangan", roles: NON_PENGAWAL },
  { prefix: "/berita", roles: ALL_ROLES },
  { prefix: "/sdp", roles: NON_PENGAWAL },
  { prefix: "/gelang", roles: ALL_ROLES },
  { prefix: "/pedoman", roles: ALL_ROLES },
  { prefix: "/panduan", roles: ALL_ROLES },
  { prefix: "/laporan", roles: NON_PENGAWAL },
  { prefix: "/akun", roles: PENGELOLA_AKUN },
  { prefix: "/kop-surat", roles: ["operator", "administrator"] },
  { prefix: "/lampiran", roles: ALL_ROLES },
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
