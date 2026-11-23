"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createActivity, createSession } from "@/lib/actions/sessions";
import { cn } from "@/lib/utils";

type Lokasi = { id: string; nama: string; posisi: string; luas_ha: number | null };
type Pengawal = { id: string; full_name: string; nip: string | null };
export type OpsiKegiatan = { id: string; label: string; mulai: string; berakhir: string | null };

const JENIS = ["Pertanian", "Peternakan", "Perikanan"] as const;

function tambahHari(tgl: string, n: number): string {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function tambahBulan(tgl: string, n: number): string {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

function Pilihan({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        aktif ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}

function Lipat({ judul, hint, children }: { judul: string; hint: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-dashed border-border bg-secondary/30 p-3">
      <summary className="cursor-pointer list-none text-sm font-medium">
        {judul} <span className="font-normal text-muted-foreground">· {hint}</span>
      </summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

/** Langkah 1. Isian wajib hanya lima; sisanya boleh dilengkapi nanti. */
export function FormKegiatanMudah({ lokasi, hariIni }: { lokasi: Lokasi[]; hariIni: string }) {
  const router = useRouter();
  const [jenis, setJenis] = React.useState("");
  const [lok, setLok] = React.useState("");
  const [mulai, setMulai] = React.useState(hariIni);
  const [berakhir, setBerakhir] = React.useState("");
  const [luas, setLuas] = React.useState("");
  const [luasManual, setLuasManual] = React.useState(false);
  const [lain, setLain] = React.useState({ persetujuan: "", sp: "", komunikasi: "", batas: "", rute: "", akses: "" });
  const setL = (k: keyof typeof lain) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLain((x) => ({ ...x, [k]: e.target.value }));

  function pilihLokasi(id: string) {
    setLok(id);
    const l = lokasi.find((x) => x.id === id);
    if (!luasManual && l?.luas_ha != null) setLuas(String(l.luas_ha).replace(".", ","));
  }
  const durasi: [string, string][] = [
    ["Hari ini saja", mulai],
    ["1 minggu", tambahHari(mulai, 6)],
    ["1 bulan", tambahHari(tambahBulan(mulai, 1), -1)],
    ["3 bulan", tambahHari(tambahBulan(mulai, 3), -1)],
  ];

  return (
    <ActionForm
      action={createActivity}
      submit="Simpan rencana kegiatan"
      success="Rencana kegiatan tersimpan. Membuka halaman rincian untuk menambah sesi dan menugaskan pengawal…"
      onSuccess={(d) => { router.push(`/rencana/${d.id}`); setJenis(""); setLok(""); setBerakhir(""); setLuas(""); setLuasManual(false); setLain({ persetujuan: "", sp: "", komunikasi: "", batas: "", rute: "", akses: "" }); }}
      resetOnSuccess={false}
      build={() => ({
        jenis_kegiatan: jenis || undefined,
        lokasi_id: lok || undefined,
        tanggal_mulai: mulai || undefined,
        rencana_berakhir: berakhir || undefined,
        luas_lahan_ha: luas.trim() ? Number(luas.replace(",", ".")) : undefined,
        nomor_persetujuan: lain.persetujuan.trim() || undefined,
        nomor_surat_perintah: lain.sp.trim() || undefined,
        titik_komunikasi: lain.komunikasi.trim() || undefined,
        batas_area: lain.batas.trim() || undefined,
        rute: lain.rute.trim() || undefined,
        akses_warga: lain.akses.trim() || undefined,
      })}
    >
      <Field label="1. Jenis kegiatan">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Jenis kegiatan">
          {JENIS.map((j) => <Pilihan key={j} aktif={jenis === j} onClick={() => setJenis(j)}>{j}</Pilihan>)}
        </div>
      </Field>
      <Field label="2. Lokasi" htmlFor="kg-lokasi" hint={lokasi.length ? "Luas lahan terisi otomatis dari data lokasi bila sudah ada." : undefined}>
        <Select id="kg-lokasi" value={lok} onChange={(e) => pilihLokasi(e.target.value)}>
          <option value="" disabled>{lokasi.length ? "Pilih lokasi" : "Tambahkan lokasi dulu di bagian Data induk UPT"}</option>
          {lokasi.map((l) => <option key={l.id} value={l.id}>{l.nama} · {l.posisi}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="3. Tanggal mulai" htmlFor="kg-mulai"><Input id="kg-mulai" type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} required /></Field>
        <Field label="4. Rencana berakhir" htmlFor="kg-akhir" hint="Boleh dikosongkan bila belum ditentukan."><Input id="kg-akhir" type="date" value={berakhir} min={mulai} onChange={(e) => setBerakhir(e.target.value)} /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Isi cepat:</span>
        {durasi.map(([t, v]) => <Pilihan key={t} aktif={berakhir === v} onClick={() => setBerakhir(v)}>{t}</Pilihan>)}
        <Pilihan aktif={berakhir === ""} onClick={() => setBerakhir("")}>Tanpa batas</Pilihan>
      </div>
      <Field label="5. Luas lahan atau kolam (hektare)" htmlFor="kg-luas">
        <Input id="kg-luas" inputMode="decimal" placeholder="mis. 2,5" value={luas} onChange={(e) => { setLuas(e.target.value); setLuasManual(true); }} />
      </Field>
      <Lipat judul="Dokumen dan pengamanan" hint="boleh dilengkapi nanti">
        <Field label="Nomor surat perintah" htmlFor="kg-sp"><Input id="kg-sp" value={lain.sp} onChange={setL("sp")} /></Field>
        <Field label="Nomor persetujuan kegiatan" htmlFor="kg-pers"><Input id="kg-pers" value={lain.persetujuan} onChange={setL("persetujuan")} /></Field>
        <Field label="Titik komunikasi" htmlFor="kg-kom" hint="Mis. pos jaga, nomor radio atau telepon." className="sm:col-span-2"><Input id="kg-kom" value={lain.komunikasi} onChange={setL("komunikasi")} /></Field>
        <Field label="Batas area kegiatan" htmlFor="kg-batas" className="sm:col-span-2"><Textarea id="kg-batas" rows={2} value={lain.batas} onChange={setL("batas")} placeholder="Batas-batas area yang boleh dijangkau WB" /></Field>
        <Field label="Rute berangkat dan pulang" htmlFor="kg-rute" className="sm:col-span-2"><Textarea id="kg-rute" rows={2} value={lain.rute} onChange={setL("rute")} /></Field>
        <Field label="Akses warga sekitar" htmlFor="kg-akses" className="sm:col-span-2" hint="Siapa saja yang bisa berinteraksi di area kegiatan dan bagaimana diatur."><Textarea id="kg-akses" rows={2} value={lain.akses} onChange={setL("akses")} /></Field>
      </Lipat>
    </ActionForm>
  );
}

/** Langkah 2. Rencana terbaru terpilih otomatis, tanggal hari ini, pengawal bisa dipilih sekaligus. */
export function FormSesiMudah({ kegiatan, pengawal, hariIni }: { kegiatan: OpsiKegiatan[]; pengawal: Pengawal[]; hariIni: string }) {
  const [keg, setKeg] = React.useState(kegiatan[0]?.id ?? "");
  const [tanggal, setTanggal] = React.useState(hariIni);
  const [interval, setInterval_] = React.useState("60");
  const [dipilih, setDipilih] = React.useState<string[]>(pengawal.length === 1 ? [pengawal[0].id] : []);
  const [gelang, setGelang] = React.useState(false);
  const [r, setR] = React.useState({ alat: "0", rincian: "", bimker: "", blok: "", p2u: "" });
  const setRr = (k: keyof typeof r) => (e: React.ChangeEvent<HTMLInputElement>) => setR((x) => ({ ...x, [k]: e.target.value }));

  // Rencana baru yang baru disimpan tampil paling atas dan langsung terpilih.
  const awal = kegiatan[0]?.id;
  React.useEffect(() => { if (awal) setKeg(awal); }, [awal]);

  const terpilih = kegiatan.find((k) => k.id === keg);
  function pilihKegiatan(id: string) {
    setKeg(id);
    const k = kegiatan.find((x) => x.id === id);
    if (k && (tanggal < k.mulai || (k.berakhir && tanggal > k.berakhir))) setTanggal(k.mulai > hariIni ? k.mulai : k.berakhir && k.berakhir < hariIni ? k.berakhir : hariIni);
  }
  const alih = (id: string) => setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <ActionForm
      action={createSession}
      submit="Buat sesi harian"
      success="Sesi dibuat dengan status Menunggu. Lengkapi dokumen, nominatif, dan indikator kesiapan pada halaman sesi."
      resetOnSuccess={false}
      build={() => ({
        activity_id: keg || undefined,
        tanggal_sesi: tanggal || undefined,
        petugas_ids: dipilih,
        jumlah_narapidana: 0,
        jumlah_alat_kerja: Number(r.alat) || 0,
        rincian_alat: r.rincian.trim() || undefined,
        interval_pemeriksaan: Number(interval),
        pakai_gelang_monitor: gelang,
        bimker_penanggung_jawab: r.bimker.trim() || undefined,
        petugas_blok: r.blok.trim() || undefined,
        petugas_p2u: r.p2u.trim() || undefined,
      })}
    >
      <Field label="1. Kegiatan" htmlFor="sm-keg" hint={terpilih ? `Periode ${terpilih.mulai}${terpilih.berakhir ? ` s.d. ${terpilih.berakhir}` : ""}. Rencana terbaru terpilih otomatis.` : undefined}>
        <Select id="sm-keg" value={keg} onChange={(e) => pilihKegiatan(e.target.value)}>
          <option value="" disabled>{kegiatan.length ? "Pilih kegiatan" : "Buat rencana kegiatan dulu (langkah 1)"}</option>
          {kegiatan.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </Select>
      </Field>
      <Field label="2. Tanggal sesi" htmlFor="sm-tgl" hint="Satu sesi per kegiatan per tanggal.">
        <Input id="sm-tgl" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </Field>
      <Field label="3. Pengawal yang bertugas" hint="Hanya Pengawal aktif dari UPT yang sama.">
        {pengawal.length === 0 ? (
          <p className="text-sm text-status-merah">Belum ada akun Pengawal aktif di UPT Anda. Minta Administrator membuatkannya.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setDipilih(pengawal.map((p) => p.id))}>Pilih semua</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setDipilih([])}>Kosongkan</Button>
              <span className="self-center text-xs text-muted-foreground">{dipilih.length} dipilih</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {pengawal.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
                  <input type="checkbox" checked={dipilih.includes(p.id)} onChange={() => alih(p.id)} className="h-4 w-4" />
                  {p.full_name}
                </label>
              ))}
            </div>
          </div>
        )}
      </Field>
      <Field label="4. Hitung WB setiap" hint="Interval pemeriksaan berkala. Pilih cepat atau ketik 5 sampai 480 menit.">
        <div className="flex flex-wrap items-center gap-2">
          {["30", "60", "120"].map((m) => <Pilihan key={m} aktif={interval === m} onClick={() => setInterval_(m)}>{m} menit</Pilihan>)}
          <Input type="number" min={5} max={480} value={interval} onChange={(e) => setInterval_(e.target.value)} className="w-24" aria-label="Interval pemeriksaan (menit)" required />
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={gelang} onChange={(e) => setGelang(e.target.checked)} className="h-4 w-4" />
        Sesi memakai gelang monitor
      </label>
      <Lipat judul="Alat kerja dan petugas lain" hint="opsional">
        <Field label="Jumlah alat kerja" htmlFor="sm-alat"><Input id="sm-alat" type="number" min={0} value={r.alat} onChange={setRr("alat")} /></Field>
        <Field label="Rincian alat kerja" htmlFor="sm-rinci"><Input id="sm-rinci" value={r.rincian} onChange={setRr("rincian")} placeholder="Mis. 10 cangkul, 5 sabit" /></Field>
        <Field label="Bimker penanggung jawab" htmlFor="sm-bimker"><Input id="sm-bimker" value={r.bimker} onChange={setRr("bimker")} /></Field>
        <Field label="Petugas blok" htmlFor="sm-blok"><Input id="sm-blok" value={r.blok} onChange={setRr("blok")} /></Field>
        <Field label="Petugas P2U" htmlFor="sm-p2u"><Input id="sm-p2u" value={r.p2u} onChange={setRr("p2u")} /></Field>
      </Lipat>
    </ActionForm>
  );
}
