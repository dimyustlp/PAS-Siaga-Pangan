// Ringkasan satu baris untuk setiap entri lapangan, dipakai di lini masa, laporan, dan antrean offline.

type P = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const n = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
const ya = (v: unknown) => (v === true ? "ya" : v === false ? "tidak" : "-");
const tambah = (arr: string[], v: string | null) => v && arr.push(v);

export function describeLog(jenis: string, payload: unknown): string {
  const p = (payload && typeof payload === "object" ? payload : {}) as P;
  const out: string[] = [];
  switch (jenis) {
    case "Serah terima di blok":
      out.push(p.tahap === "kembali" ? "Serah terima kembali ke blok" : "Serah terima keluar dari blok");
      out.push(`${n(p.jumlah_wbp) ?? "?"} WB, ${n(p.jumlah_alat) ?? "?"} alat`);
      if (p.tahap === "kembali") out.push(`penggeledahan: ${ya(p.penggeledahan)}`);
      tambah(out, s(p.penerima) && `penerima ${s(p.penerima)}`);
      break;
    case "P2U keluar atau masuk":
      out.push(`P2U ${p.arah === "masuk" ? "masuk" : "keluar"}`);
      if (n(p.jumlah) !== null) out.push(`${n(p.jumlah)} orang`);
      tambah(out, s(p.catatan));
      break;
    case "Tiba di lokasi":
      out.push(`Tiba di lokasi, hitungan ${n(p.jumlah_wbp) ?? "?"} WB`);
      tambah(out, s(p.catatan));
      break;
    case "Pemeriksaan berkala":
      out.push(`Pemeriksaan berkala, hitungan ${n(p.jumlah_wbp) ?? "?"} WB`);
      if (n(p.jumlah_alat) !== null) out.push(`${n(p.jumlah_alat)} alat`);
      tambah(out, s(p.catatan));
      break;
    case "Pindah area atau ganti pengawal":
      out.push(`Pindah/ganti: hitungan ${n(p.jumlah_wbp) ?? "?"} WB`);
      tambah(out, s(p.area_baru) && `area ${s(p.area_baru)}`);
      tambah(out, s(p.pengawal_baru) && `pengawal ${s(p.pengawal_baru)}`);
      tambah(out, s(p.catatan));
      break;
    case "Pihak luar dan kendaraan":
      out.push(String(s(p.jenis) ?? "Pihak luar"));
      tambah(out, s(p.keterangan));
      tambah(out, s(p.nomor_kendaraan));
      break;
    case "Pengembalian sebagian":
      out.push(`Pengembalian sebagian ${n(p.jumlah_wbp) ?? "?"} WB`);
      if (p.penggeledahan !== undefined) out.push(`penggeledahan: ${ya(p.penggeledahan)}`);
      tambah(out, s(p.catatan));
      break;
    case "Alarm gelang":
      out.push(`Alarm gelang: ${s(p.jenis_alarm) ?? "-"}`);
      out.push(`dikonfirmasi langsung: ${ya(p.dikonfirmasi_langsung)}`);
      tambah(out, s(p.nomor_registrasi));
      tambah(out, s(p.tindakan));
      break;
    case "Pemeriksaan gelang":
      out.push(`Pemeriksaan gelang: ${n(p.jumlah_berfungsi) ?? "?"} dari ${n(p.jumlah_diperiksa) ?? "?"} berfungsi`);
      tambah(out, s(p.catatan));
      break;
    case "Gangguan":
      out.push(`Gangguan: ${s(p.kategori) ?? "-"}`);
      tambah(out, s(p.tindakan_awal));
      tambah(out, s(p.penanggung_jawab) && `PJ ${s(p.penanggung_jawab)}`);
      break;
    case "Naikkan status":
      out.push(`Status dinaikkan ke ${s(p.status_baru) ?? "?"}`);
      tambah(out, s(p.alasan));
      break;
    default:
      out.push(jenis);
  }
  return out.join(" · ");
}
