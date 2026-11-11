import { z } from "zod";

export const konfirmasiAlarmSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Dikonfirmasi", "Bukan gangguan"], { errorMap: () => ({ message: "Pilih hasil konfirmasi." }) }),
  tindakan: z.string().trim().min(3, "Tindakan atau keterangan wajib diisi (minimal 3 karakter).").max(1000),
});

export const unitSchema = z.object({
  kode_upt: z.string().trim().min(2, "UPT wajib dipilih.").max(40),
  teks: z.string().trim().min(3, "Isi daftar unit gelang.").max(20000),
});

export const hapusUnitSchema = z.object({ id: z.string().uuid() });

export type BarisUnit = { kode: string; nama: string | null; nomor: string | null };

/** Satu baris per unit: kode unit, nama (opsional), nomor registrasi WB (opsional). Pemisah koma, titik koma, atau tab. */
export function bacaDaftarUnit(teks: string): { baris: BarisUnit[]; salah: string[] } {
  const baris: BarisUnit[] = [];
  const salah: string[] = [];
  const lihat = new Set<string>();
  for (const mentah of teks.split(/\r?\n/)) {
    const b = mentah.trim();
    if (!b) continue;
    const [kode, nama, nomor] = b.split(/[,;\t]/).map((x) => x.trim());
    if (!/^[A-Za-z0-9-]{1,30}$/.test(kode ?? "")) {
      salah.push(b);
      continue;
    }
    if (lihat.has(kode)) continue;
    lihat.add(kode);
    baris.push({ kode, nama: nama || null, nomor: nomor || null });
  }
  return { baris, salah };
}

/** Mengubah teks waktu dari sistem pelacak (ISO, "YYYY-MM-DD HH:MM:SS" tanpa zona, atau detik Unix) menjadi ISO UTC. Tanpa zona dianggap WIB. */
export function bacaWaktuAlarm(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  let d: Date;
  if (/^\d{9,13}$/.test(t)) d = new Date(t.length > 10 ? Number(t) : Number(t) * 1000);
  else if (/(Z|[+-]\d{2}:?\d{2})$/i.test(t)) d = new Date(t.replace(" ", "T"));
  else {
    const m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    d = new Date(`${m[1]}T${m[2]}:${m[3] ?? "00"}+07:00`);
  }
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const zonaUnitSchema = z.object({
  id: z.string().uuid("Pilih unit gelang."),
  zona_nama: z.string().trim().max(150).optional().transform((v) => (v ? v : undefined)),
  zona_radius_m: z.number().int("Radius berupa bilangan bulat.").min(10, "Radius minimal 10 meter.").max(100000, "Radius maksimal 100.000 meter.").optional(),
  ambang_baterai: z.number().int("Ambang berupa bilangan bulat.").min(1, "Ambang minimal 1%.").max(90, "Ambang maksimal 90%."),
});
