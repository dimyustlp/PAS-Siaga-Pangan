"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { submitFieldLogBatch } from "@/lib/actions/field-logs";
import { Button } from "@/components/ui/button";
import { Alert, Field, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import { unggah } from "@/components/shared/upload-field";
import { PANDUAN_STATUS } from "@/lib/domain/pedoman";
import { bangunPayload, JENIS_ENTRI, jumlahDiharapkan, tampilkan } from "@/lib/domain/entri-config";
import { describeLog } from "@/lib/domain/describe";
import { fmtJam } from "@/lib/format";
import { keInputWib, waktuWib } from "@/lib/form";
import { bacaAntrean, hapusDariAntrean, bersihkanGalat, siapKirim, tambahAntrean, tandaiGalat, type EntriAntre } from "@/lib/offline-queue";
import { fieldLogSchema } from "@/lib/validations/field-log";

type Props = {
  userId: string;
  sessionId: string;
  status: SecurityStatus;
  rencanaWb: number;
  pakaiGelang: boolean;
  intervalMenit: number;
  batasPeriksaBerikut: string | null;
  nominatif: { inmate_id: string; nama: string; nomor_registrasi: string }[];
  logs: { id: string; jenis_entri: string; payload: unknown; waktu_kejadian: string; susulan: boolean }[];
  tutup: boolean;
};

const kunciNominatif = (id: string) => `pas-siaga:nominatif:v1:${id}`;

export function EntriLapangan(p: Props) {
  const router = useRouter();
  const [antre, setAntre] = React.useState<EntriAntre[]>([]);
  const [daring, setDaring] = React.useState(true);
  const [mengirim, setMengirim] = React.useState(false);
  const [jenis, setJenis] = React.useState(JENIS_ENTRI[0].jenis);
  const [nilai, setNilai] = React.useState<Record<string, string>>({});
  const [waktu, setWaktu] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [nominatif, setNominatif] = React.useState(p.nominatif);
  const sibuk = React.useRef(false);

  const def = JENIS_ENTRI.find((j) => j.jenis === jenis) ?? JENIS_ENTRI[0];
  const diharapkan = jumlahDiharapkan(p.logs, p.rencanaWb);

  const muatAntrean = React.useCallback(() => setAntre(bacaAntrean(localStorage, p.userId)), [p.userId]);

  const kirim = React.useCallback(async () => {
    if (sibuk.current) return;
    const siap = siapKirim(bacaAntrean(localStorage, p.userId));
    if (siap.length === 0 || !navigator.onLine) return;
    sibuk.current = true;
    setMengirim(true);
    try {
      const res = await submitFieldLogBatch(siap.map(({ galat: _g, ...e }) => { void _g; return e; }));
      if (!res.ok) {
        setGalat(res.error);
        return;
      }
      const terkirim: string[] = [];
      const ditolak: Record<string, string> = {};
      for (const h of res.data.hasil) {
        if (!h.client_id) continue;
        if (h.ok) terkirim.push(h.client_id);
        else ditolak[h.client_id] = h.error ?? "Ditolak server.";
      }
      hapusDariAntrean(localStorage, p.userId, terkirim);
      tandaiGalat(localStorage, p.userId, ditolak);
      if (terkirim.length > 0) {
        setInfo(`${terkirim.length} entri terkirim.`);
        router.refresh();
      }
    } catch {
      // Jaringan putus di tengah jalan: entri tetap aman di antrean dan dicoba lagi nanti.
    } finally {
      sibuk.current = false;
      setMengirim(false);
      muatAntrean();
    }
  }, [p.userId, router, muatAntrean]);

  React.useEffect(() => {
    setDaring(navigator.onLine);
    setWaktu(keInputWib(new Date()));
    muatAntrean();
    // Simpan nominatif di perangkat supaya tetap terbaca saat tanpa sinyal.
    try {
      if (p.nominatif.length > 0) localStorage.setItem(kunciNominatif(p.sessionId), JSON.stringify(p.nominatif));
      else {
        const simpan = localStorage.getItem(kunciNominatif(p.sessionId));
        if (simpan) setNominatif(JSON.parse(simpan));
      }
    } catch {}
    const on = () => { setDaring(true); void kirim(); };
    const off = () => setDaring(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const t = setInterval(() => void kirim(), 30_000);
    void kirim();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(t); };
  }, [kirim, muatAntrean, p.nominatif, p.sessionId]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setInfo(null);
    const waktuIso = waktuWib(waktu);
    if (!waktuIso) return setGalat("Isi waktu kejadian.");
    let buktiPath: string | undefined;
    if (file) {
      if (navigator.onLine) {
        const h = await unggah("pas-siaga-evidence", p.sessionId, file);
        if ("error" in h) return setGalat(h.error);
        buktiPath = h.path;
      } else setInfo("Foto tidak disertakan karena tanpa sinyal. Catatan tetap disimpan.");
    }
    const entri = {
      client_id: crypto.randomUUID(),
      session_id: p.sessionId,
      waktu_kejadian: waktuIso,
      jenis_entri: jenis,
      payload: bangunPayload(jenis, nilai),
      ...(buktiPath ? { bukti_path: buktiPath } : {}),
    };
    const cek = fieldLogSchema.safeParse(entri);
    if (!cek.success) return setGalat(cek.error.issues[0]?.message ?? "Isian belum lengkap.");
    tambahAntrean(localStorage, p.userId, entri);
    setNilai({});
    setFile(null);
    setWaktu(keInputWib(new Date()));
    muatAntrean();
    setInfo(navigator.onLine ? "Tersimpan di perangkat, sedang dikirim…" : "Tersimpan di perangkat. Akan dikirim otomatis saat ada sinyal.");
    void kirim();
  }

  const panduan = PANDUAN_STATUS[p.status];
  const siap = antre.filter((a) => !a.galat).length;
  const ditolak = antre.filter((a) => a.galat);

  return (
    <div className="space-y-5">
      <Alert tone={p.status === "HIJAU" ? "sukses" : p.status === "KUNING" ? "waspada" : "bahaya"}>
        <p className="flex items-center gap-2 font-semibold">Status <StatusBadge status={p.status} /></p>
        <p className="mt-1"><strong>Tindakan minimum:</strong> {panduan.minimum}</p>
        <p className="mt-1 text-xs">Ketiadaan data tidak berarti keadaan aman. Tetap awasi langsung dan catat.</p>
      </Alert>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {daring ? <Pill tone="hijau"><Wifi className="mr-1 h-3 w-3" aria-hidden />Ada sinyal</Pill> : <Pill tone="merah"><CloudOff className="mr-1 h-3 w-3" aria-hidden />Tanpa sinyal</Pill>}
        <span className="text-muted-foreground">Rencana {p.rencanaWb} WB · seharusnya ada <strong className="text-foreground">{diharapkan}</strong></span>
        {p.batasPeriksaBerikut && !p.tutup && <span className="text-muted-foreground">Periksa berikut {fmtJam(p.batasPeriksaBerikut)} (tiap {p.intervalMenit} menit)</span>}
      </div>

      {antre.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <p className="flex items-center justify-between text-sm font-medium">
            <span>Belum terkirim: {siap}{ditolak.length > 0 ? ` · ditolak: ${ditolak.length}` : ""}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void kirim()} disabled={mengirim || !daring || siap === 0}>
              <RefreshCw className={`h-4 w-4 ${mengirim ? "animate-spin" : ""}`} aria-hidden />Kirim
            </Button>
          </p>
          <ul className="space-y-1 text-xs">
            {antre.map((a) => (
              <li key={a.client_id} className="flex items-start justify-between gap-2">
                <span className={a.galat ? "text-status-merah" : "text-muted-foreground"}>
                  {fmtJam(a.waktu_kejadian)} · {describeLog(a.jenis_entri, a.payload)}{a.galat ? ` — ${a.galat}` : ""}
                </span>
                {a.galat && (
                  <span className="flex shrink-0 gap-2">
                    <button type="button" className="text-primary underline" onClick={() => { bersihkanGalat(localStorage, p.userId, a.client_id); muatAntrean(); void kirim(); }}>Coba lagi</button>
                    <button type="button" className="text-status-merah underline" onClick={() => { hapusDariAntrean(localStorage, p.userId, [a.client_id]); muatAntrean(); }}>Hapus</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.tutup ? (
        <Alert>Sesi ini sudah ditutup. Tidak ada entri baru yang bisa dicatat.</Alert>
      ) : (
        <form onSubmit={simpan} className="space-y-4 rounded-lg border bg-card p-4">
          <Field label="Jenis catatan" htmlFor="jenis" hint={def.ringkas}>
            <Select id="jenis" value={jenis} onChange={(e) => { setJenis(e.target.value); setNilai({}); }}>
              {JENIS_ENTRI.filter((j) => !j.perluGelang || p.pakaiGelang).map((j) => <option key={j.jenis} value={j.jenis}>{j.judul}</option>)}
            </Select>
          </Field>
          {def.fields.filter((f) => tampilkan(f, nilai)).map((f) => {
            const v = nilai[f.name] ?? "";
            const set = (x: string) => setNilai((s) => ({ ...s, [f.name]: x }));
            const id = `f-${f.name}`;
            return (
              <Field key={f.name} label={f.label + (f.wajib ? " *" : "")} htmlFor={id} hint={f.hint}>
                {f.tipe === "angka" ? (
                  <Input id={id} inputMode="numeric" pattern="[0-9]*" value={v} onChange={(e) => set(e.target.value)} required={f.wajib} className="text-lg" />
                ) : f.tipe === "pilih" ? (
                  <Select id={id} value={v} onChange={(e) => set(e.target.value)} required={f.wajib}>
                    <option value="">{f.wajib ? "Pilih…" : "—"}</option>
                    {(f.pilihan ?? []).filter(Boolean).map((o) => <option key={o}>{o}</option>)}
                  </Select>
                ) : f.tipe === "yt" ? (
                  <div className="flex gap-3">
                    {["ya", "tidak"].map((o) => (
                      <label key={o} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                        <input type="radio" name={id} value={o} checked={v === o} onChange={() => set(o)} className="sr-only" />
                        {o === "ya" ? "Ya" : "Tidak"}
                      </label>
                    ))}
                  </div>
                ) : f.tipe === "area" ? (
                  <Textarea id={id} value={v} onChange={(e) => set(e.target.value)} rows={2} required={f.wajib} />
                ) : (
                  <Input id={id} value={v} onChange={(e) => set(e.target.value)} required={f.wajib} />
                )}
              </Field>
            );
          })}
          <Field label="Waktu kejadian (WIB)" htmlFor="waktu" hint="Ubah bila mencatat susulan. Entri ditandai “susulan” otomatis bila terlambat dikirim.">
            <Input id="waktu" type="datetime-local" value={waktu} onChange={(e) => setWaktu(e.target.value)} required />
          </Field>
          <Field label="Foto (opsional)" htmlFor="foto">
            <Input id="foto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          {galat && <Alert tone="bahaya">{galat}</Alert>}
          {info && !galat && <Alert tone="sukses">{info}</Alert>}
          <Button type="submit" size="lg" className="w-full">Simpan catatan</Button>
        </form>
      )}

      {nominatif.length > 0 && (
        <details className="rounded-lg border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium">Daftar nominatif ({nominatif.length} WB)</summary>
          <ol className="mt-2 space-y-0.5 text-sm">
            {nominatif.map((n, i) => <li key={n.inmate_id}>{i + 1}. {n.nama} <span className="text-xs text-muted-foreground">{n.nomor_registrasi}</span></li>)}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Tersimpan di perangkat ini selama sesi berjalan supaya tetap terbaca tanpa sinyal.</p>
        </details>
      )}

      <section aria-label="Catatan terakhir" className="space-y-2">
        <h2 className="text-sm font-semibold">Catatan terakhir</h2>
        {p.logs.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada.</p> : (
          <ul className="space-y-1.5 text-sm">
            {p.logs.slice(0, 12).map((l) => (
              <li key={l.id} className="flex gap-2"><span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtJam(l.waktu_kejadian)}</span><span>{describeLog(l.jenis_entri, l.payload)}{l.susulan ? " (susulan)" : ""}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
