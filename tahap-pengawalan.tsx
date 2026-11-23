"use client";

/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, FileUp, Images, Lock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { hapusLampiran, selesaikanTahap } from "@/lib/actions/tahap";
import { bangunIsian, butirKurang, fmtUkuran, TAHAP, type Butir } from "@/lib/domain/tahap";
import { unggahLampiran } from "@/lib/unggah-tahap";
import { cn } from "@/lib/utils";

export type LampiranRingkas = {
  id: string;
  tahap: number;
  butir: string;
  jenis: string;
  nama_berkas: string;
  ukuran_byte: number;
  mime: string;
  waktu_sistem: string;
  sumber: string;
};

export type TahapRingkas = { tahap: number; jumlah_wb: number; jumlah_alat: number | null; waktu_sistem: string };

type Props = {
  sessionId: string;
  rencanaWb: number;
  selesai: TahapRingkas[];
  lampiran: LampiranRingkas[];
  batasFotoMb: number;
  batasBerkasMb: number;
  modeDrive: boolean;
  tutup: boolean;
  /** Nama petugas yang sudah dicatat pada sesi ini. */
  petugas: string[];
};

const jamDetik = (v: string) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .format(new Date(v))
    .replace(/\./g, ":") + " WIB";

function KotakButir({
  b,
  sessionId,
  tahap,
  ada,
  terkunci,
  batasMb,
  onBerubah,
}: {
  b: Butir;
  sessionId: string;
  tahap: number;
  ada: LampiranRingkas[];
  terkunci: boolean;
  batasMb: number;
  onBerubah: () => void;
}) {
  const [antre, setAntre] = React.useState<{ nama: string; persen: number }[]>([]);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [hapus, setHapus] = React.useState<string | null>(null);
  const kamera = React.useRef<HTMLInputElement>(null);
  const galeri = React.useRef<HTMLInputElement>(null);
  const sisa = b.maks - ada.length;
  const foto = b.jenis === "foto";

  async function pilih(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGalat(null);
    const daftar = Array.from(files).slice(0, Math.max(0, sisa));
    if (files.length > sisa) setGalat(`Paling banyak ${b.maks} berkas untuk butir ini. ${files.length - daftar.length} berkas dilewati.`);
    for (const f of daftar) {
      if (!foto && f.size > batasMb * 1024 * 1024) {
        setGalat(`${f.name}: ukuran ${fmtUkuran(f.size)} melebihi batas ${batasMb} MB. Pindai ulang dengan resolusi lebih rendah.`);
        continue;
      }
      if (foto && f.size > 25 * 1024 * 1024) {
        setGalat(`${f.name}: foto terlalu besar.`);
        continue;
      }
      setAntre((a) => [...a, { nama: f.name, persen: 0 }]);
      const h = await unggahLampiran({ sessionId, tahap, butir: b.butir, file: f }, (persen) =>
        setAntre((a) => a.map((x) => (x.nama === f.name ? { ...x, persen } : x)))
      );
      setAntre((a) => a.filter((x) => x.nama !== f.name));
      if (!h.ok) {
        setGalat(`${f.name}: ${h.error}`);
        break;
      }
      onBerubah();
    }
    if (kamera.current) kamera.current.value = "";
    if (galeri.current) galeri.current.value = "";
  }

  async function buang(id: string) {
    if (!window.confirm("Hapus lampiran ini?")) return;
    setHapus(id);
    const r = await hapusLampiran({ id, session_id: sessionId });
    setHapus(null);
    if (!r.ok) setGalat(r.error);
    else onBerubah();
  }

  const lengkap = ada.length > 0;
  return (
    <div className={cn("rounded-xl border p-3", lengkap ? "border-status-hijau/40 bg-status-hijau/[0.05]" : b.wajib ? "border-gold/50 bg-[hsl(44_90%_60%/0.06)]" : "border-border bg-white")}>
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white", lengkap ? "bg-status-hijau" : "bg-ink/25")}>
          {lengkap ? <Check className="h-3 w-3" aria-hidden /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">
            {b.judul} {b.wajib ? <span className="text-status-merah">*</span> : <span className="text-xs font-normal text-muted-foreground">(opsional)</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {b.petunjuk} {foto ? `Foto diperkecil otomatis, maks. ${batasMb} MB.` : `PDF/JPG, maks. ${batasMb} MB.`} {ada.length}/{b.maks} terunggah.
          </p>
        </div>
      </div>

      {ada.length > 0 && (
        <ul className={cn("mt-3 gap-2", foto ? "grid grid-cols-3" : "space-y-1.5")}>
          {ada.map((l) =>
            foto ? (
              <li key={l.id} className="relative overflow-hidden rounded-lg border bg-white">
                <img src={`/lampiran/${l.id}`} alt={l.nama_berkas} loading="lazy" className="aspect-square w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[0.5625rem] leading-tight text-white">{jamDetik(l.waktu_sistem)}</span>
                {!terkunci && (
                  <button type="button" onClick={() => buang(l.id)} disabled={hapus === l.id} aria-label="Hapus foto" className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-status-merah shadow">
                    {hapus === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                  </button>
                )}
              </li>
            ) : (
              <li key={l.id} className="flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-xs">
                <FileUp className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                <a href={`/lampiran/${l.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-primary hover:underline">{l.nama_berkas}</a>
                <span className="shrink-0 text-muted-foreground">{fmtUkuran(l.ukuran_byte)} · {jamDetik(l.waktu_sistem)}</span>
                {!terkunci && (
                  <button type="button" onClick={() => buang(l.id)} aria-label="Hapus berkas" className="text-status-merah">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </li>
            )
          )}
        </ul>
      )}

      {antre.map((a) => (
        <div key={a.nama} className="mt-2 text-xs">
          <p className="truncate text-muted-foreground">Mengunggah {a.nama}… {a.persen}%</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-brand transition-[width]" style={{ width: `${a.persen}%` }} /></div>
        </div>
      ))}

      {!terkunci && sisa > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {foto ? (
            <>
              <input ref={kamera} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pilih(e.target.files)} />
              <input ref={galeri} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => pilih(e.target.files)} />
              <Button type="button" size="sm" onClick={() => kamera.current?.click()} disabled={antre.length > 0}><Camera className="h-4 w-4" aria-hidden />Ambil foto</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => galeri.current?.click()} disabled={antre.length > 0}><Images className="h-4 w-4" aria-hidden />Pilih dari galeri</Button>
            </>
          ) : (
            <>
              <input ref={galeri} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => pilih(e.target.files)} />
              <Button type="button" size="sm" variant="outline" onClick={() => galeri.current?.click()} disabled={antre.length > 0}><FileUp className="h-4 w-4" aria-hidden />Unggah berkas</Button>
            </>
          )}
        </div>
      )}
      {galat && <Alert tone="bahaya" className="mt-2 text-xs">{galat}</Alert>}
    </div>
  );
}

/** Empat tahap pengawalan dengan lampiran wajib. Satu tahap baru terbuka setelah tahap sebelumnya selesai. */
export function TahapPengawalan(p: Props) {
  const router = useRouter();
  const sudah = new Map(p.selesai.map((s) => [s.tahap, s]));
  const berikut = TAHAP.find((t) => !sudah.has(t.no))?.no ?? 0;
  const [dilihat, setDilihat] = React.useState<number>(berikut || 4);
  const [nilai, setNilai] = React.useState<Record<string, string>>({});
  const [pilihPetugas, setPilihPetugas] = React.useState<string>(p.petugas[0] ?? "");
  const [galat, setGalat] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    setDilihat(berikut || 4);
    setNilai({});
  }, [berikut]);
  // Bila daftar petugas berubah, pastikan pilihan masih valid.
  React.useEffect(() => {
    setPilihPetugas((x) => (p.petugas.includes(x) ? x : p.petugas[0] ?? ""));
  }, [p.petugas]);

  const def = TAHAP.find((t) => t.no === dilihat) ?? TAHAP[0];
  const catat = sudah.get(def.no);
  const lampiranTahap = p.lampiran.filter((l) => l.tahap === def.no);
  const kurang = butirKurang(def.no, lampiranTahap);
  const terbuka = def.no === berikut && !p.tutup;
  const segarkan = () => router.refresh();

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setInfo(null);
    if (!pilihPetugas) return setGalat("Pilih petugas yang mengisi tahap ini. Catat nama petugas dulu bila belum ada.");
    if (kurang.length > 0) return setGalat(`Lampiran wajib belum lengkap: ${kurang.map((k) => k.judul).join("; ")}.`);
    const isian = { ...bangunIsian(def.no, nilai), petugas: pilihPetugas } as Record<string, string | number | boolean>;
    start(async () => {
      const r = await selesaikanTahap({ session_id: p.sessionId, tahap: def.no, isian });
      if (!r.ok) return setGalat(r.error);
      setInfo(`Tahap ${def.no} tercatat. Waktu dicatat otomatis oleh sistem.`);
      router.refresh();
    });
  }

  return (
    <section aria-label="Tahap pengawalan" className="space-y-4">
      <ol className="grid grid-cols-4 gap-1.5">
        {TAHAP.map((t) => {
          const s = sudah.get(t.no);
          const kini = t.no === berikut;
          return (
            <li key={t.no}>
              <button
                type="button"
                onClick={() => (s || kini ? setDilihat(t.no) : undefined)}
                disabled={!s && !kini}
                aria-current={dilihat === t.no ? "step" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center text-[0.6562rem] font-medium leading-tight transition-colors",
                  s ? "border-status-hijau/40 bg-status-hijau/10 text-[hsl(152_70%_22%)]" : kini ? "border-gold bg-[hsl(44_90%_60%/0.14)] text-foreground" : "border-border bg-white/70 text-muted-foreground",
                  dilihat === t.no && "ring-2 ring-primary/40"
                )}
              >
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", s ? "bg-status-hijau text-white" : kini ? "bg-primary text-white" : "bg-ink/10")}>
                  {s ? <Check className="h-3.5 w-3.5" aria-hidden /> : !kini ? <Lock className="h-3 w-3" aria-hidden /> : t.no}
                </span>
                {t.judul}
              </button>
            </li>
          );
        })}
      </ol>

      {berikut === 0 && (
        <Alert tone="sukses">Keempat tahap selesai. Laporan kegiatan siap disahkan Kepala Pengamanan atau Ka.UPT, lalu bisa diunduh sebagai PDF.</Alert>
      )}

      <div className="kaca space-y-4 rounded-2xl p-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-brand">Tahap {def.no} dari 4 · {def.lokasi}</p>
          <h2 className="text-lg font-semibold leading-tight">{def.judul}</h2>
          <p className="text-sm text-muted-foreground">{def.ringkas}</p>
          {catat && (
            <p className="mt-2 rounded-lg bg-status-hijau/10 px-2.5 py-1.5 text-xs text-[hsl(152_70%_22%)]">
              Selesai, dicatat sistem {jamDetik(catat.waktu_sistem)} · {catat.jumlah_wb} WB{catat.jumlah_alat !== null ? ` · ${catat.jumlah_alat} alat` : ""}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {def.butir.map((b) => (
            <KotakButir
              key={b.butir}
              b={b}
              sessionId={p.sessionId}
              tahap={def.no}
              ada={lampiranTahap.filter((l) => l.butir === b.butir)}
              terkunci={!terbuka}
              batasMb={b.jenis === "foto" ? p.batasFotoMb : p.batasBerkasMb}
              onBerubah={segarkan}
            />
          ))}
        </div>

        {terbuka && (
          <form onSubmit={kirim} className="space-y-3 border-t pt-4">
            <Field label="Petugas yang mengisi tahap ini *" htmlFor={`t${def.no}-petugas`} hint="Dipilih dari nama yang sudah dicatat di atas.">
              <select id={`t${def.no}-petugas`} value={pilihPetugas} onChange={(e) => setPilihPetugas(e.target.value)} required className="flex h-11 w-full rounded-xl border border-input bg-white px-3 text-base">
                {p.petugas.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            {def.isian.map((f) => {
              const id = `t${def.no}-${f.name}`;
              const v = nilai[f.name] ?? "";
              const set = (x: string) => setNilai((s) => ({ ...s, [f.name]: x }));
              return (
                <Field key={f.name} label={f.label + (f.wajib ? " *" : "")} htmlFor={id} hint={f.hint ?? (f.name === "jumlah_wb" ? `Rencana ${p.rencanaWb} WB. Selisih otomatis menaikkan status ke MERAH.` : undefined)}>
                  {f.tipe === "angka" ? (
                    <Input id={id} inputMode="numeric" pattern="[0-9]*" value={v} onChange={(e) => set(e.target.value)} required={f.wajib} className="text-lg" />
                  ) : f.tipe === "area" ? (
                    <Textarea id={id} value={v} onChange={(e) => set(e.target.value)} rows={3} required={f.wajib} />
                  ) : f.tipe === "yt" ? (
                    <div className="flex gap-3">
                      {["ya", "tidak"].map((o) => (
                        <label key={o} className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                          <input type="radio" name={id} value={o} checked={v === o} onChange={() => set(o)} className="sr-only" required={f.wajib} />
                          {o === "ya" ? "Ya" : "Tidak"}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input id={id} value={v} onChange={(e) => set(e.target.value)} required={f.wajib} />
                  )}
                </Field>
              );
            })}
            <p className="text-xs text-muted-foreground">Waktu tahap dan setiap lampiran dicatat otomatis oleh server saat dikirim, tidak bisa diubah dari HP.</p>
            {galat && <Alert tone="bahaya">{galat}</Alert>}
            {info && !galat && <Alert tone="sukses">{info}</Alert>}
            <Button type="submit" size="lg" className="w-full" disabled={pending || kurang.length > 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
              {kurang.length > 0 ? `Lengkapi ${kurang.length} lampiran wajib` : `Selesaikan tahap ${def.no}`}
            </Button>
          </form>
        )}
        {!terbuka && !catat && <Alert tone="waspada">Tahap ini terbuka setelah tahap sebelumnya selesai.</Alert>}
        {galat && !terbuka && <Alert tone="bahaya">{galat}</Alert>}
      </div>
      <p className="text-center text-[0.6875rem] text-muted-foreground">Penyimpanan: {p.modeDrive ? "Google Drive instansi" : "server aplikasi (Google Drive belum dihubungkan)"}</p>
    </section>
  );
}
