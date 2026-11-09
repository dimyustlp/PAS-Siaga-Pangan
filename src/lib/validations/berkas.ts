import { z } from "zod";

// Daftar ini sengaja dicatat ulang di sini (tanpa import berkas lain) agar modul bisa diuji langsung;
// kesamaannya dengan src/lib/domain/berkas.ts dijaga oleh tests/berkas.test.ts.
export const KATEGORI_BERKAS = ["Surat Perintah", "Rencana Pengamanan", "Daftar Nominatif", "Laporan Kegiatan", "Berita Acara", "Dokumentasi", "Data Dukung", "Lainnya"] as const;

/** Alamat berkas wajib di folder UPT-nya: {kode_upt}/{nama}. Sama aturannya dengan isSafeStoragePath. */
function pathAman(path: string, folder: string): boolean {
  if (path.length === 0 || path.length > 300) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  if (!path.startsWith(folder + "/") || path.length === folder.length + 1) return false;
  return /^[\w\-./ ()]+$/.test(path);
}

const opt = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter.`).optional().transform((v) => (v ? v : undefined));

export const createBerkasSchema = z
  .object({
    kode_upt: z.string().trim().min(2, "UPT wajib dipilih.").max(40),
    kategori: z.enum(KATEGORI_BERKAS, { errorMap: () => ({ message: "Kategori wajib dipilih." }) }),
    judul: z.string().trim().min(3, "Judul minimal 3 karakter.").max(200, "Judul maksimal 200 karakter."),
    keterangan: opt(1000),
    tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
    sumber: z.enum(["unggah", "tautan"]),
    path: opt(300),
    nama_berkas: opt(200),
    ukuran_byte: z.number().int().min(0).max(21_000_000).optional(),
    mime: opt(150),
    tautan: opt(1000),
  })
  .superRefine((v, ctx) => {
    if (v.sumber === "unggah") {
      if (!v.path || !pathAman(v.path, v.kode_upt)) ctx.addIssue({ code: "custom", path: ["path"], message: "Berkas belum terunggah atau alamatnya tidak sah." });
    } else if (!v.tautan || !/^https:\/\/[^\s]+$/i.test(v.tautan)) {
      ctx.addIssue({ code: "custom", path: ["tautan"], message: "Tautan harus diawali https://" });
    }
  });

export const deleteBerkasSchema = z.object({ id: z.string().uuid() });

export const kanwilTautanSchema = z.object({
  id: z.string().uuid(),
  tautan_form: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
  tautan_folder: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
}).superRefine((v, ctx) => {
  for (const k of ["tautan_form", "tautan_folder"] as const) {
    if (v[k] && !/^https:\/\/[^\s]+$/i.test(v[k]!)) ctx.addIssue({ code: "custom", path: [k], message: "Tautan harus diawali https://" });
  }
});
