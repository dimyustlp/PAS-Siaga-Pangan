// Indikator keberhasilan uji coba (RPP Tabel 2.5) dihitung dari hasil fungsi database indikator_evaluasi.

export type Indikator = Record<string, unknown> & {
  total_sesi: number;
  sesi_dijalankan: number;
  sesi_ditutup: number;
  sesi_sesuai_sop: number;
  serah_terima_lengkap: number;
  serah_terima_cocok: number;
  catatan_dinilai: number;
  catatan_lengkap: number;
  perubahan_status: number;
  perubahan_status_beralasan: number;
  temuan_total: number;
  temuan_terverifikasi: number;
  temuan_dengan_tindak_lanjut: number;
  tindak_lanjut_total: number;
  tindak_lanjut_selesai: number;
  tindak_lanjut_terverifikasi: number;
  tindak_lanjut_terlambat: number;
  alarm_total: number;
  alarm_dikonfirmasi: number;
  entri_total: number;
  entri_susulan: number;
  status: { HIJAU: number; KUNING: number; MERAH: number; KRITIS: number };
};

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

export function parseIndikator(raw: unknown): Indikator | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const s = (r.status ?? {}) as Record<string, unknown>;
  const kunci = [
    "total_sesi", "sesi_dijalankan", "sesi_ditutup", "sesi_sesuai_sop", "serah_terima_lengkap", "serah_terima_cocok",
    "catatan_dinilai", "catatan_lengkap", "perubahan_status", "perubahan_status_beralasan", "temuan_total", "temuan_terverifikasi",
    "temuan_dengan_tindak_lanjut", "tindak_lanjut_total", "tindak_lanjut_selesai", "tindak_lanjut_terverifikasi",
    "tindak_lanjut_terlambat", "alarm_total", "alarm_dikonfirmasi", "entri_total", "entri_susulan",
  ];
  const out: Record<string, unknown> = {};
  for (const k of kunci) out[k] = n(r[k]);
  out.status = { HIJAU: n(s.HIJAU), KUNING: n(s.KUNING), MERAH: n(s.MERAH), KRITIS: n(s.KRITIS) };
  return out as Indikator;
}

export type BarisEvaluasi = {
  kode: string;
  nama: string;
  nilai: number | null;
  /** Teks nilai, mis. "18 dari 20" atau "96%". */
  tampil: string;
  target: string;
  /** null bila belum ada data untuk dinilai. */
  tercapai: boolean | null;
  rujukan: string;
};

const persen = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

export function hitungEvaluasi(i: Indikator): BarisEvaluasi[] {
  const sesuaiSop = i.sesi_sesuai_sop;
  const cocok = persen(i.serah_terima_cocok, i.serah_terima_lengkap);
  const lengkap = persen(i.catatan_lengkap, i.catatan_dinilai);
  const beralasan = persen(i.perubahan_status_beralasan, i.perubahan_status);
  const tlTemuan = persen(i.temuan_dengan_tindak_lanjut, i.temuan_total);
  const tlSelesai = persen(i.tindak_lanjut_selesai, i.tindak_lanjut_total);
  const alarm = persen(i.alarm_dikonfirmasi, i.alarm_total);
  const verif = persen(i.temuan_terverifikasi, i.temuan_total);

  return [
    { kode: "E1", nama: "Kegiatan dijalankan sesuai SOP dan ditutup", nilai: sesuaiSop, tampil: `${sesuaiSop} kegiatan`, target: "Paling sedikit 20 kegiatan", tercapai: sesuaiSop >= 20, rujukan: "Tabel 2.5: penerapan awal di Ciangir" },
    { kode: "E2", nama: "Catatan keluar dan kembali cocok", nilai: cocok, tampil: cocok === null ? "-" : `${cocok}% (${i.serah_terima_cocok} dari ${i.serah_terima_lengkap})`, target: "100% pada seluruh kegiatan", tercapai: cocok === null ? null : cocok === 100, rujukan: "Tabel 2.5" },
    { kode: "E3", nama: "Kelengkapan dokumen dan catatan", nilai: lengkap, tampil: lengkap === null ? "-" : `${lengkap}% (${i.catatan_lengkap} dari ${i.catatan_dinilai})`, target: "Paling rendah 95%", tercapai: lengkap === null ? null : lengkap >= 95, rujukan: "Tabel 2.5" },
    { kode: "E4", nama: "Perubahan status tercatat dengan alasan", nilai: beralasan, tampil: beralasan === null ? "-" : `${beralasan}% (${i.perubahan_status_beralasan} dari ${i.perubahan_status})`, target: "100% dapat ditelusuri", tercapai: beralasan === null ? null : beralasan === 100, rujukan: "Tabel 2.5: dapat ditelusuri" },
    { kode: "E5", nama: "Temuan memiliki tindak lanjut", nilai: tlTemuan, tampil: tlTemuan === null ? "-" : `${tlTemuan}% (${i.temuan_dengan_tindak_lanjut} dari ${i.temuan_total})`, target: "100% bertanggung jawab dan bertenggat", tercapai: tlTemuan === null ? null : tlTemuan === 100, rujukan: "Tabel 2.5: tindak lanjut temuan" },
    { kode: "E6", nama: "Tindak lanjut selesai", nilai: tlSelesai, tampil: tlSelesai === null ? "-" : `${tlSelesai}% (${i.tindak_lanjut_selesai} dari ${i.tindak_lanjut_total}); ${i.tindak_lanjut_terlambat} terlambat`, target: "Selesai sebelum tenggat", tercapai: tlSelesai === null ? null : i.tindak_lanjut_terlambat === 0 && tlSelesai === 100, rujukan: "Bab III: pemilik dan tenggat mitigasi" },
    { kode: "E7", nama: "Kejadian diverifikasi sebelum ditutup", nilai: verif, tampil: verif === null ? "-" : `${verif}% (${i.temuan_terverifikasi} dari ${i.temuan_total})`, target: "100% terverifikasi", tercapai: verif === null ? null : verif === 100, rujukan: "Bab III: verifikasi penutupan kejadian" },
    { kode: "E8", nama: "Alarm gelang dikonfirmasi langsung", nilai: alarm, tampil: alarm === null ? "-" : `${alarm}% (${i.alarm_dikonfirmasi} dari ${i.alarm_total})`, target: "100% dikonfirmasi ke petugas di lokasi", tercapai: alarm === null ? null : alarm === 100, rujukan: "Tabel 3.4: gelang pemantau" },
  ];
}

/** Baris CSV dengan pengutipan aman dan pemisah titik koma (nyaman dibuka di Excel Indonesia). */
export function keCsv(baris: (string | number | null)[][]): string {
  const sel = (v: string | number | null) => {
    const t = v === null ? "" : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + baris.map((r) => r.map(sel).join(";")).join("\r\n") + "\r\n";
}
