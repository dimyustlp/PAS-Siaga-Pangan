"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, fail, success, zodFail, type ActionResult } from "./_shared";
import { mapDbError } from "@/lib/errors";
import { TABEL_SDP, teksKeBaris, type DataSdp } from "@/lib/domain/sdp";

const teks = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter.`);

const sdpSchema = z.object({
  tahun: z.coerce.number().int().min(2024, "Tahun tidak sah.").max(2100, "Tahun tidak sah."),
  tanggal: z.string().trim().max(30).optional(),
  total_produksi: teks(60),
  nilai_produksi: teks(60),
  rata_wbp: teks(60),
  rata_luas_wilayah: teks(60),
  rata_luas_lahan: teks(60),
  komoditas: teks(400).optional(),
  produksi_atas: teks(3000),
  produksi_bawah: teks(3000),
  wbp_atas: teks(3000),
  wbp_bawah: teks(3000),
  lahan_atas: teks(3000),
  lahan_bawah: teks(3000),
});

export async function simpanSdp(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "pemantau_pusat"]);
  if (!auth.ok) return fail(auth.error);
  const parsed = sdpSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const data: DataSdp = {
    kpi: {
      total_produksi: d.total_produksi,
      nilai_produksi: d.nilai_produksi,
      rata_wbp: d.rata_wbp,
      rata_luas_wilayah: d.rata_luas_wilayah,
      rata_luas_lahan: d.rata_luas_lahan,
    },
    komoditas: (d.komoditas ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 20),
    produksi_atas: [],
    produksi_bawah: [],
    wbp_atas: [],
    wbp_bawah: [],
    lahan_atas: [],
    lahan_bawah: [],
  };
  for (const t of TABEL_SDP) data[t.kunci] = teksKeBaris(d[t.kunci], t.kolom.length);
  const tanggal = d.tanggal && !Number.isNaN(Date.parse(d.tanggal)) ? new Date(d.tanggal).toISOString() : null;
  const { error } = await auth.supabase.rpc("simpan_sdp", { p_tahun: d.tahun, p_data: data, p_tanggal: tanggal });
  if (error) return fail(mapDbError(error, "Hanya Administrator atau Pemantau Pusat yang boleh memperbarui data SDP."));
  revalidatePath("/sdp");
  revalidatePath("/");
  return success();
}

export async function sembunyikanBeritaLuar(input: unknown): Promise<ActionResult> {
  const auth = await authorize(["administrator", "pemantau_pusat"]);
  if (!auth.ok) return fail(auth.error);
  const id = z.coerce.number().int().positive().safeParse((input as { id?: unknown })?.id);
  if (!id.success) return fail("Data tidak valid.");
  const { error } = await auth.supabase.rpc("admin_sembunyikan_berita_luar", { p_id: id.data });
  if (error) return fail(mapDbError(error, "Hanya Administrator atau Pemantau Pusat."));
  revalidatePath("/berita");
  revalidatePath("/");
  return success();
}
