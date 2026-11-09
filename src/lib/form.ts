// Pembaca isian formulir: mengubah FormData menjadi nilai yang dipahami validasi (Zod).

export const str = (fd: FormData, name: string): string | undefined => {
  const v = fd.get(name);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
};

export const num = (fd: FormData, name: string): number | undefined => {
  const t = str(fd, name);
  if (t === undefined) return undefined;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
};

/** Kotak centang: true bila dicentang. */
export const cek = (fd: FormData, name: string): boolean => fd.get(name) === "on" || fd.get(name) === "true";

/** Pilihan Ya/Tidak (radio atau select dengan nilai "ya" / "tidak"). Kosong = belum diisi. */
export const yaTidak = (fd: FormData, name: string): boolean | undefined => {
  const v = str(fd, name);
  return v === "ya" ? true : v === "tidak" ? false : undefined;
};

/** Input datetime-local (tanpa zona) diperlakukan sebagai WIB (+07:00), lalu dijadikan ISO. */
export function waktuWib(local: string | undefined): string | undefined {
  if (!local) return undefined;
  const m = local.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) return undefined;
  const d = new Date(`${m[1]}T${m[2]}:00+07:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Nilai awal input datetime-local (WIB) dari sebuah waktu. */
export function keInputWib(d: Date): string {
  const wib = new Date(d.getTime() + 7 * 3600_000);
  return wib.toISOString().slice(0, 16);
}
