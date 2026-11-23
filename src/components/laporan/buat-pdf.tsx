// Penyusun berkas PDF laporan resmi. Dijalankan di browser (dimuat saat tombol Unduh PDF ditekan) supaya
// foto dan berkas besar tidak melewati batas ukuran server. Berkas PDF lampiran digabung di bagian akhir.

import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/client";
import type { IsiLaporan } from "@/lib/domain/laporan-format";

type TiketAmbil =
  | { sumber: "supabase"; path: string; mime: string; nama: string; ukuran: number }
  | { sumber: "drive"; url: string; tiket: string; sig: string; mime: string; nama: string; ukuran: number };

const POTONG = 3 * 1024 * 1024;

// Kata tidak dipenggal (pemenggalan bawaan berbahasa Inggris).
Font.registerHyphenationCallback((kata) => [kata]);

async function ambilBytes(id: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("tiket_ambil", { p_lampiran: id });
  if (error || !data) return null;
  const t = data as unknown as TiketAmbil;
  if (t.sumber === "supabase") {
    const { data: blob } = await supabase.storage.from("pas-siaga-evidence").download(t.path);
    return blob ? { mime: t.mime, bytes: new Uint8Array(await blob.arrayBuffer()) } : null;
  }
  const bagian: Uint8Array[] = [];
  let mulai = 0;
  let total = Infinity;
  while (mulai < total) {
    const u = new URL(t.url);
    u.searchParams.set("tiket", t.tiket);
    u.searchParams.set("sig", t.sig);
    u.searchParams.set("mulai", String(mulai));
    u.searchParams.set("panjang", String(POTONG));
    const r = await fetch(u.toString());
    const j = (await r.json()) as { ok: boolean; data?: string; total?: number };
    if (!j.ok || !j.data) return null;
    const bin = atob(j.data);
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    if (b.length === 0) break;
    bagian.push(b);
    mulai += b.length;
    total = Number(j.total ?? mulai);
  }
  const g = new Uint8Array(bagian.reduce((a, b) => a + b.length, 0));
  let i = 0;
  for (const b of bagian) {
    g.set(b, i);
    i += b.length;
  }
  return { mime: t.mime, bytes: g };
}

/** Memperkecil gambar menjadi JPEG (sisi terpanjang `maks` px) dan mengembalikan data URL. */
async function keJpeg(bytes: Uint8Array, mime: string, maks = 1300): Promise<{ url: string; w: number; h: number } | null> {
  try {
    const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
    const s = Math.min(1, maks / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return { url: c.toDataURL("image/jpeg", 0.78), w: c.width, h: c.height };
  } catch {
    return null;
  }
}

async function logo(src: string): Promise<string | null> {
  try {
    const r = await fetch(src);
    const b = await r.blob();
    return await new Promise((res) => {
      const f = new FileReader();
      f.onload = () => res(String(f.result));
      f.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 54, paddingHorizontal: 60, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.45, color: "#111" },
  kop: { flexDirection: "row", alignItems: "center", gap: 10 },
  kopTengah: { flex: 1, alignItems: "center" },
  kopBaris: { fontSize: 11.5, fontFamily: "Helvetica-Bold", textAlign: "center", lineHeight: 1.25 },
  kopUpt: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", lineHeight: 1.25 },
  kopAlamat: { fontSize: 8.5, textAlign: "center", marginTop: 2 },
  garis1: { borderBottomWidth: 2.4, borderBottomColor: "#111", marginTop: 6 },
  garis2: { borderBottomWidth: 0.8, borderBottomColor: "#111", marginTop: 1.5, marginBottom: 14 },
  judul: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center" },
  nomor: { textAlign: "center", marginTop: 2, marginBottom: 12 },
  bab: { fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  para: { textAlign: "justify" },
  baris: { flexDirection: "row" },
  label: { width: 120 },
  titik: { width: 12 },
  isi: { flex: 1 },
  tabel: { borderWidth: 0.7, borderColor: "#333", marginTop: 4 },
  th: { flexDirection: "row", backgroundColor: "#e9ecef", borderBottomWidth: 0.7, borderColor: "#333", fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#999", fontSize: 9.5 },
  td: { paddingVertical: 2.5, paddingHorizontal: 4, borderRightWidth: 0.5, borderColor: "#999" },
  ttd: { marginTop: 26, alignSelf: "flex-end", width: 230, alignItems: "center" },
  kaki: { position: "absolute", bottom: 24, left: 60, right: 60, fontSize: 8, color: "#666", flexDirection: "row", justifyContent: "space-between" },
  lampJudul: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center", marginBottom: 8 },
  tahapJudul: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginTop: 8, marginBottom: 4, paddingVertical: 3, paddingHorizontal: 6, backgroundColor: "#eef3ea" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kartu: { width: "48.5%", borderWidth: 0.5, borderColor: "#bbb", padding: 4 },
  cap: { fontSize: 8, marginTop: 3, lineHeight: 1.3 },
});

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII"];

function Dokumen({ isi, foto, logoKiri, logoKanan }: { isi: IsiLaporan; foto: Map<string, { url: string; w: number; h: number }>; logoKiri: string | null; logoKanan: string | null }) {
  const kaki = (
    <View style={s.kaki} fixed>
      <Text>PAS-SIAGA Pangan · {isi.kopBaris[isi.kopBaris.length - 1]}</Text>
      <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
    </View>
  );
  const adaLampiran = isi.lampiranPerTahap.some((t) => t.foto.length + t.berkas.length > 0);
  return (
    <Document title={`${isi.judul} ${isi.subjudul}`} author="PAS-SIAGA Pangan" language="id">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          {logoKiri ? <Image src={logoKiri} style={{ width: 62, height: 62 }} /> : <View style={{ width: 62 }} />}
          <View style={s.kopTengah}>
            {isi.kopBaris.map((b, i) => (
              <Text key={b} style={i === isi.kopBaris.length - 1 ? s.kopUpt : s.kopBaris}>{b}</Text>
            ))}
            {isi.kopAlamat ? <Text style={s.kopAlamat}>{isi.kopAlamat}</Text> : null}
          </View>
          {logoKanan ? <Image src={logoKanan} style={{ width: 48, height: 62, objectFit: "contain" }} /> : <View style={{ width: 48 }} />}
        </View>
        <View style={s.garis1} />
        <View style={s.garis2} />

        <Text style={s.judul}>{isi.judul}</Text>
        <Text style={s.judul}>{isi.subjudul}</Text>
        <Text style={s.nomor}>Nomor: ....................................................</Text>

        <Text style={s.bab}>{ROMAWI[0]}. DASAR</Text>
        {isi.dasar.map((d, i) => (
          <View key={i} style={s.baris} wrap={false}>
            <Text style={{ width: 16 }}>{i + 1}.</Text>
            <Text style={[s.isi, s.para]}>{d}</Text>
          </View>
        ))}

        <Text style={s.bab}>{ROMAWI[1]}. WAKTU DAN TEMPAT PELAKSANAAN</Text>
        {isi.waktuTempat.map(([k, v]) => (
          <View key={k} style={s.baris}>
            <Text style={s.label}>{k}</Text>
            <Text style={s.titik}>:</Text>
            <Text style={s.isi}>{v}</Text>
          </View>
        ))}

        <Text style={s.bab}>{ROMAWI[2]}. NAMA DAN JUMLAH WARGA BINAAN</Text>
        <Text style={s.para}>{isi.ringkasWb}</Text>
        {isi.wb.length > 0 && (
          <View style={s.tabel}>
            <View style={s.th}>
              <Text style={[s.td, { width: 30 }]}>No</Text>
              <Text style={[s.td, { flex: 1 }]}>Nama</Text>
              <Text style={[s.td, { width: 140, borderRightWidth: 0 }]}>Nomor registrasi</Text>
            </View>
            {isi.wb.map((w) => (
              <View key={w.no} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: 30 }]}>{w.no}</Text>
                <Text style={[s.td, { flex: 1 }]}>{w.nama}</Text>
                <Text style={[s.td, { width: 140, borderRightWidth: 0 }]}>{w.reg}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.bab}>{ROMAWI[3]}. PETUGAS PENGAWAL</Text>
        <View style={s.tabel}>
          <View style={s.th}>
            <Text style={[s.td, { width: 30 }]}>No</Text>
            <Text style={[s.td, { flex: 1 }]}>Nama</Text>
            <Text style={[s.td, { width: 160, borderRightWidth: 0 }]}>NIP</Text>
          </View>
          {isi.pengawal.map((p) => (
            <View key={p.no} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: 30 }]}>{p.no}</Text>
              <Text style={[s.td, { flex: 1 }]}>{p.nama}</Text>
              <Text style={[s.td, { width: 160, borderRightWidth: 0 }]}>{p.nip}</Text>
            </View>
          ))}
        </View>

        <Text style={s.bab}>{ROMAWI[4]}. RINCIAN PELAKSANAAN</Text>
        {isi.rincian.length === 0 ? (
          <Text>Belum ada tahap yang tercatat.</Text>
        ) : (
          <View style={s.tabel}>
            <View style={s.th}>
              <Text style={[s.td, { width: 120 }]}>Tahap</Text>
              <Text style={[s.td, { width: 105 }]}>Waktu (sistem)</Text>
              <Text style={[s.td, { width: 48 }]}>WB</Text>
              <Text style={[s.td, { flex: 1, borderRightWidth: 0 }]}>Keterangan</Text>
            </View>
            {isi.rincian.map((r) => (
              <View key={r.tahap} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: 120 }]}>{r.tahap}</Text>
                <Text style={[s.td, { width: 105 }]}>{r.waktu}</Text>
                <Text style={[s.td, { width: 48 }]}>{r.wb}</Text>
                <Text style={[s.td, { flex: 1, borderRightWidth: 0 }]}>{r.ket}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.bab}>{ROMAWI[5]}. PENGESAHAN BERKAS</Text>
        <Text style={s.para}>{isi.pengesahan}</Text>

        <Text style={s.bab}>{ROMAWI[6]}. PENUTUP</Text>
        <Text style={s.para}>{isi.penutup}</Text>

        <View style={s.ttd} wrap={false}>
          <Text>{isi.kotaTanggal}</Text>
          <Text>..................................................</Text>
          <View style={{ height: 64 }} />
          <Text>(..................................................)</Text>
          <Text>NIP. ..........................................</Text>
        </View>
        {kaki}
      </Page>

      {adaLampiran && (
        <Page size="A4" style={s.page}>
          <Text style={s.lampJudul}>LAMPIRAN DOKUMENTASI</Text>
          <Text style={{ textAlign: "center", fontSize: 9, marginBottom: 6 }}>{isi.judul} {isi.subjudul}</Text>
          {isi.lampiranPerTahap.map((t) =>
            t.foto.length + t.berkas.length === 0 ? null : (
              <View key={t.judul}>
                <Text style={s.tahapJudul}>{t.judul}</Text>
                <View style={s.grid}>
                  {t.foto.map((f) => {
                    const g = foto.get(f.id);
                    return (
                      <View key={f.id} style={s.kartu} wrap={false}>
                        {g ? <Image src={g.url} style={{ width: "100%", height: 170, objectFit: "contain" }} /> : <Text style={{ fontSize: 9 }}>Foto tidak terbaca.</Text>}
                        <Text style={s.cap}>{f.judul}{"\n"}Diunggah sistem: {f.waktu}</Text>
                      </View>
                    );
                  })}
                </View>
                {t.berkas.map((b) => (
                  <Text key={b.id} style={{ fontSize: 9, marginTop: 3 }}>
                    • {b.judul}: {b.nama} (diunggah sistem {b.waktu}){b.mime === "application/pdf" ? " — dilampirkan utuh pada halaman berikutnya." : ""}
                  </Text>
                ))}
                {t.berkas
                  .filter((b) => b.mime !== "application/pdf" && foto.get(b.id))
                  .map((b) => (
                    <View key={b.id + "g"} style={[s.kartu, { width: "100%", marginTop: 4 }]} wrap={false}>
                      <Image src={foto.get(b.id)!.url} style={{ width: "100%", height: 420, objectFit: "contain" }} />
                      <Text style={s.cap}>{b.judul} — {b.nama}</Text>
                    </View>
                  ))}
              </View>
            )
          )}
          {kaki}
        </Page>
      )}
    </Document>
  );
}

export async function buatPdfLaporan(isi: IsiLaporan, onLangkah?: (teks: string) => void): Promise<Blob> {
  onLangkah?.("Menyiapkan kop surat…");
  const [logoKiri, logoKanan] = await Promise.all([logo("/logo-kemenimipas-512.png"), logo("/logo-pemasyarakatan.png")]);

  const semuaFoto = isi.lampiranPerTahap.flatMap((t) => t.foto.map((f) => ({ id: f.id, mime: f.mime })));
  const berkasGambar = isi.lampiranPerTahap.flatMap((t) => t.berkas.filter((b) => b.mime !== "application/pdf").map((b) => ({ id: b.id, mime: b.mime })));
  const berkasPdf = isi.lampiranPerTahap.flatMap((t) => t.berkas.filter((b) => b.mime === "application/pdf").map((b) => ({ ...b, tahap: t.judul })));

  const foto = new Map<string, { url: string; w: number; h: number }>();
  const gambar = [...semuaFoto, ...berkasGambar];
  for (let i = 0; i < gambar.length; i++) {
    onLangkah?.(`Mengambil foto ${i + 1} dari ${gambar.length}…`);
    const b = await ambilBytes(gambar[i].id);
    if (b) {
      const j = await keJpeg(b.bytes, b.mime, gambar[i].mime.startsWith("image/") && berkasGambar.some((x) => x.id === gambar[i].id) ? 1800 : 1300);
      if (j) foto.set(gambar[i].id, j);
    }
  }

  onLangkah?.("Menyusun laporan…");
  const dasar = await pdf(<Dokumen isi={isi} foto={foto} logoKiri={logoKiri} logoKanan={logoKanan} />).toBlob();
  if (berkasPdf.length === 0) return dasar;

  const induk = await PDFDocument.load(await dasar.arrayBuffer());
  const huruf = await induk.embedFont(StandardFonts.HelveticaBold);
  for (let i = 0; i < berkasPdf.length; i++) {
    const b = berkasPdf[i];
    onLangkah?.(`Menggabungkan berkas ${i + 1} dari ${berkasPdf.length}…`);
    const isiB = await ambilBytes(b.id);
    if (!isiB) continue;
    try {
      const src = await PDFDocument.load(isiB.bytes, { ignoreEncryption: true });
      const hal = await induk.copyPages(src, src.getPageIndices());
      hal.forEach((h, k) => {
        induk.addPage(h);
        if (k === 0) {
          const { width, height } = h.getSize();
          const teks = `Lampiran: ${b.judul} (${b.tahap})`.slice(0, 110);
          h.drawRectangle({ x: 0, y: height - 18, width, height: 18, color: rgb(1, 1, 1), opacity: 0.85 });
          h.drawText(teks, { x: 12, y: height - 13, size: 8.5, font: huruf, color: rgb(0.1, 0.15, 0.3) });
        }
      });
    } catch {
      // Berkas PDF rusak atau terkunci: tetap tercantum di daftar lampiran.
    }
  }
  const hasil = await induk.save();
  return new Blob([hasil as BlobPart], { type: "application/pdf" });
}
