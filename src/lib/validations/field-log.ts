import { z } from "zod";

// Bentuk isi (payload) tiap jenis entri lapangan. Nama kolom HARUS sama dengan kesepakatan
// di skrip skema (01-skema-pas-siaga-pangan.sql), karena aturan penutupan dan kenaikan status
// di database membaca nama-nama ini.

const count = z.number({ invalid_type_error: "Isi dengan angka." }).int("Isi dengan bilangan bulat.").min(0, "Tidak boleh negatif.").max(999_999);
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v ? v : undefined));
const wajib = (max: number, pesan: string) => z.string().trim().min(1, pesan).max(max, `Maksimal ${max} karakter.`);
const statusNaik = z.enum(["KUNING", "MERAH", "KRITIS"], { errorMap: () => ({ message: "Status harus KUNING, MERAH, atau KRITIS." }) });

export const serahTerimaPayload = z
  .object({
    tahap: z.enum(["keluar", "kembali"]),
    jumlah_wbp: count,
    jumlah_alat: count,
    penggeledahan: z.boolean().optional(),
    penerima: opt(120),
  })
  .superRefine((v, ctx) => {
    if (v.tahap === "kembali" && v.penggeledahan === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["penggeledahan"],
        message: "Status penggeledahan wajib diisi saat serah terima kembali ke blok.",
      });
    }
  });

export const p2uPayload = z.object({
  arah: z.enum(["keluar", "masuk"]),
  jumlah: count.optional(),
  catatan: opt(500),
});

export const tibaPayload = z.object({ jumlah_wbp: count.optional(), catatan: opt(500) });

export const berkalaPayload = z.object({
  jumlah_wbp: count,
  jumlah_alat: count.optional(),
  catatan: opt(500),
});

export const pindahPayload = z
  .object({ area_baru: opt(120), pengawal_baru: opt(120), catatan: opt(500) })
  .superRefine((v, ctx) => {
    if (!v.area_baru && !v.pengawal_baru) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["area_baru"], message: "Isi area baru atau pengawal pengganti." });
    }
  });

export const pihakLuarPayload = z.object({
  jenis: z.enum(["Pihak luar", "Kendaraan"]),
  keterangan: wajib(300, "Keterangan wajib diisi."),
  jumlah: count.optional(),
  nomor_kendaraan: opt(20),
});

export const pengembalianSebagianPayload = z.object({
  jumlah_wbp: count,
  jumlah_alat: count.optional(),
  penggeledahan: z.boolean().optional(),
  catatan: opt(500),
});

export const alarmGelangPayload = z.object({
  jenis_alarm: wajib(120, "Jenis alarm wajib diisi."),
  nomor_registrasi: opt(40),
  tindakan: opt(500),
});

export const gangguanPayload = z.object({
  kategori: wajib(120, "Kategori gangguan wajib diisi."),
  tindakan_awal: opt(1000),
  penanggung_jawab: opt(120),
  status_baru: statusNaik.optional(),
});

export const naikkanStatusPayload = z.object({
  status_baru: statusNaik,
  alasan: wajib(500, "Alasan kenaikan status wajib diisi.").pipe(z.string().min(3, "Alasan terlalu singkat.")),
});

const WAKTU_TOLERANSI_MASA_DEPAN_MS = 5 * 60_000;
const WAKTU_BATAS_LAMPAU_MS = 7 * 24 * 3600_000;

const base = z.object({
  /** Dibuat oleh perangkat pengawal. Mencegah entri ganda bila pengiriman diulang setelah sinyal pulih. */
  client_id: z.string().uuid("client_id harus berupa UUID."),
  session_id: z.string().uuid("session_id harus berupa UUID."),
  /** Jam kejadian sebenarnya (bukan jam kirim). Boleh mundur untuk entri susulan setelah offline. */
  waktu_kejadian: z
    .string()
    .datetime({ offset: true, message: "Format waktu tidak valid." })
    .refine((v) => Date.parse(v) <= Date.now() + WAKTU_TOLERANSI_MASA_DEPAN_MS, "Waktu kejadian tidak boleh di masa depan.")
    .refine((v) => Date.parse(v) >= Date.now() - WAKTU_BATAS_LAMPAU_MS, "Waktu kejadian lebih dari 7 hari lalu. Periksa tanggalnya."),
  /** Alamat berkas foto di bucket pas-siaga-evidence, pola: {session_id}/{nama_berkas}. */
  bukti_path: z.string().max(300).optional(),
});

const v = <J extends string, P extends z.ZodTypeAny>(jenis: J, payload: P) =>
  base.extend({ jenis_entri: z.literal(jenis), payload });

export const fieldLogSchema = z.discriminatedUnion("jenis_entri", [
  v("Serah terima di blok", serahTerimaPayload),
  v("P2U keluar atau masuk", p2uPayload),
  v("Tiba di lokasi", tibaPayload),
  v("Pemeriksaan berkala", berkalaPayload),
  v("Pindah area atau ganti pengawal", pindahPayload),
  v("Pihak luar dan kendaraan", pihakLuarPayload),
  v("Pengembalian sebagian", pengembalianSebagianPayload),
  v("Alarm gelang", alarmGelangPayload),
  v("Gangguan", gangguanPayload),
  v("Naikkan status", naikkanStatusPayload),
]);

export type FieldLogInput = z.input<typeof fieldLogSchema>;
export type FieldLogEntry = z.output<typeof fieldLogSchema>;

export const fieldLogBatchSchema = z
  .array(z.unknown())
  .min(1, "Tidak ada entri untuk dikirim.")
  .max(100, "Maksimal 100 entri per pengiriman.");
