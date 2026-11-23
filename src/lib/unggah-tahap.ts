"use client";

// Unggah lampiran tahap pengawalan: minta tiket ke database, kirim ke Google Drive (Apps Script) atau
// Supabase Storage sebagai cadangan, lalu catat. Waktu unggah dicatat oleh server, bukan oleh HP pengawal.

import { createClient } from "@/lib/supabase/client";

type Tiket =
  | { mode: "drive"; url: string; tiket: string; sig: string }
  | { mode: "supabase"; tiket: string; sig: string; path: string };

const MAKS_SISI = 1920;

/** Memperkecil foto (sisi terpanjang 1920 px, JPEG) agar hemat kuota Drive dan cepat terkirim di sinyal lemah. */
export async function kompresFoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const skala = Math.min(1, MAKS_SISI / Math.max(bmp.width, bmp.height));
    if (skala === 1 && file.size <= 1.2 * 1024 * 1024) return file;
    const w = Math.round(bmp.width * skala);
    const h = Math.round(bmp.height * skala);
    const kanvas = document.createElement("canvas");
    kanvas.width = w;
    kanvas.height = h;
    kanvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
    let mutu = 0.82;
    let blob: Blob | null = null;
    for (let i = 0; i < 4; i++) {
      blob = await new Promise<Blob | null>((r) => kanvas.toBlob(r, "image/jpeg", mutu));
      if (!blob || blob.size <= 1.5 * 1024 * 1024) break;
      mutu -= 0.12;
    }
    if (!blob) return file;
    const nama = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nama, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function keBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Berkas tidak terbaca."));
    r.readAsDataURL(file);
  });
}

function kirimDrive(url: string, body: string, onProgres?: (p: number) => void): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    // text/plain supaya tidak perlu izin lintas situs tambahan (Apps Script tidak melayani preflight).
    xhr.setRequestHeader("Content-Type", "text/plain;charset=utf-8");
    xhr.timeout = 180_000;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgres?.(Math.round((e.loaded / e.total) * 95));
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("Jawaban Google Drive tidak terbaca. Pastikan aplikasi web Apps Script sudah di-deploy untuk \"Anyone\"."));
      }
    };
    xhr.onerror = () => reject(new Error("Gagal terhubung ke Google Drive. Periksa sinyal lalu coba lagi."));
    xhr.ontimeout = () => reject(new Error("Pengiriman terlalu lama. Coba lagi saat sinyal lebih baik."));
    xhr.send(body);
  });
}

const pesan = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? "";
  return m && /^[A-Z]/.test(m) && !/violates|permission denied|function /i.test(m) ? m : "Unggahan gagal. Coba lagi.";
};

export async function unggahLampiran(
  p: { sessionId: string; tahap: number; butir: string; file: File },
  onProgres?: (persen: number) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  try {
    const file = p.file.type.startsWith("image/") ? await kompresFoto(p.file) : p.file;
    onProgres?.(3);
    const { data, error } = await supabase.rpc("tiket_unggah", {
      p_session: p.sessionId,
      p_tahap: p.tahap,
      p_butir: p.butir,
      p_nama: file.name,
      p_mime: file.type || "application/octet-stream",
      p_ukuran: file.size,
    });
    if (error) return { ok: false, error: pesan(error) };
    const t = data as unknown as Tiket;

    if (t.mode === "drive") {
      const isi = await keBase64(file);
      const h = await kirimDrive(t.url, JSON.stringify({ tiket: t.tiket, sig: t.sig, data: isi }), onProgres);
      if (!h.ok) return { ok: false, error: String(h.galat ?? "Google Drive menolak berkas.") };
      const { error: e2 } = await supabase.rpc("catat_lampiran", {
        p_tiket: t.tiket,
        p_sig: t.sig,
        p_sumber: "drive",
        p_file_id: String(h.id),
        p_url: String(h.url ?? ""),
        p_path: null,
        p_ukuran: Number(h.ukuran),
        p_bukti: String(h.bukti),
      });
      if (e2) return { ok: false, error: pesan(e2) };
    } else {
      const { error: e1 } = await supabase.storage
        .from("pas-siaga-evidence")
        .upload(t.path, file, { contentType: file.type || undefined, upsert: false });
      if (e1) return { ok: false, error: "Berkas gagal disimpan. Periksa jenis dan ukuran berkas." };
      onProgres?.(90);
      const { error: e2 } = await supabase.rpc("catat_lampiran", {
        p_tiket: t.tiket,
        p_sig: t.sig,
        p_sumber: "supabase",
        p_file_id: null,
        p_url: null,
        p_path: t.path,
        p_ukuran: file.size,
        p_bukti: null,
      });
      if (e2) return { ok: false, error: pesan(e2) };
    }
    onProgres?.(100);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }
}
