// Perhitungan lalu lintas warga binaan per sesi: berapa yang keluar, kembali, masih di luar, dan selisihnya.

export type BarisLalin = {
  wbp_keluar: number | null;
  wbp_kembali: number | null;
  wbp_terakhir_dihitung: number | null;
  keluar_at: string | null;
  kembali_at: string | null;
};

/** Kembali dianggap sah bila dicatat sesudah (atau tanpa) catatan keluar. */
export function kembaliSah(o: BarisLalin): boolean {
  if (!o.kembali_at || o.wbp_kembali === null) return false;
  if (!o.keluar_at) return true;
  return new Date(o.kembali_at).getTime() >= new Date(o.keluar_at).getTime();
}

/** Selisih keluar dikurangi kembali (positif = ada yang belum kembali). Null bila belum ada kembali. */
export function selisihKembali(o: BarisLalin): number | null {
  if (o.wbp_keluar === null || !kembaliSah(o)) return null;
  return o.wbp_keluar - (o.wbp_kembali as number);
}

export type RingkasLalin = { sesi: number; keluar: number; kembali: number; masihDiLuar: number; selisih: number };

export function ringkasLalin(baris: BarisLalin[]): RingkasLalin {
  const r: RingkasLalin = { sesi: baris.length, keluar: 0, kembali: 0, masihDiLuar: 0, selisih: 0 };
  for (const o of baris) {
    if (o.wbp_keluar !== null) r.keluar += o.wbp_keluar;
    if (kembaliSah(o)) {
      r.kembali += o.wbp_kembali as number;
      const s = selisihKembali(o);
      if (s !== null && s !== 0) r.selisih += 1;
    } else if (o.keluar_at) {
      r.masihDiLuar += o.wbp_terakhir_dihitung ?? o.wbp_keluar ?? 0;
    }
  }
  return r;
}
