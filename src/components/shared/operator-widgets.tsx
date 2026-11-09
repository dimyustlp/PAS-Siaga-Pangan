"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { attachSessionDocument, setNominatif } from "@/lib/actions/sessions";
import { UploadField } from "@/components/shared/upload-field";
import { Button } from "@/components/ui/button";
import { Alert, Pill } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Unggah surat perintah dan rencana pengamanan, lalu tautkan ke sesi. */
export function DokumenUpload({ sessionId, suratAda, rencanaAda, editable }: { sessionId: string; suratAda: boolean; rencanaAda: boolean; editable: boolean }) {
  const router = useRouter();
  const [galat, setGalat] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function tautkan(jenis: "surat_perintah" | "rencana_pengamanan", path: string) {
    setGalat(null);
    setOk(null);
    const res = await attachSessionDocument({ session_id: sessionId, jenis, path });
    if (!res.ok) setGalat(res.error);
    else {
      setOk("Dokumen tersimpan pada sesi.");
      router.refresh();
    }
  }

  const baris = [
    { jenis: "surat_perintah" as const, judul: "Surat perintah", ada: suratAda },
    { jenis: "rencana_pengamanan" as const, judul: "Rencana pengamanan", ada: rencanaAda },
  ];
  return (
    <div className="space-y-4">
      {baris.map((b) => (
        <div key={b.jenis} className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{b.judul}</Label>
            <Pill tone={b.ada ? "hijau" : "kuning"}>{b.ada ? "Sudah terunggah" : "Belum"}</Pill>
          </div>
          {editable ? (
            <UploadField bucket="pas-siaga-documents" sessionId={sessionId} accept=".pdf,.jpg,.jpeg,.png,.docx" onUploaded={(p) => tautkan(b.jenis, p)} />
          ) : (
            <p className="text-xs text-muted-foreground">Sesi sudah tidak bisa diubah.</p>
          )}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Format PDF, JPG, PNG, atau DOCX, maksimal 20 MB. Mengunggah ulang akan mengganti berkas sebelumnya.</p>
      {galat && <Alert tone="bahaya">{galat}</Alert>}
      {ok && !galat && <Alert tone="sukses">{ok}</Alert>}
    </div>
  );
}

type Wb = { id: string; nama: string; nomor_registrasi: string };

/** Memilih warga binaan yang ikut kegiatan. Jumlah pada rencana sesi mengikuti daftar ini. */
export function NominatifEditor({ sessionId, semua, terpilih, editable }: { sessionId: string; semua: Wb[]; terpilih: string[]; editable: boolean }) {
  const router = useRouter();
  const [pilih, setPilih] = React.useState<Set<string>>(new Set(terpilih));
  const [cari, setCari] = React.useState("");
  const [pending, start] = React.useTransition();
  const [galat, setGalat] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const tampil = semua.filter((w) => `${w.nama} ${w.nomor_registrasi}`.toLowerCase().includes(cari.toLowerCase()));
  const toggle = (id: string) =>
    setPilih((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function simpan() {
    setGalat(null);
    setOk(false);
    start(async () => {
      const res = await setNominatif({ session_id: sessionId, inmate_ids: [...pilih] });
      if (!res.ok) setGalat(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  if (semua.length === 0) {
    return <Alert tone="waspada">Belum ada data warga binaan aktif untuk UPT ini. Tambahkan dulu pada bagian Data induk di halaman Kegiatan.</Alert>;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Cari nama atau nomor registrasi" value={cari} onChange={(e) => setCari(e.target.value)} className="max-w-xs" aria-label="Cari warga binaan" />
        <span className="text-sm text-muted-foreground">{pilih.size} dipilih dari {semua.length}</span>
        {editable && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPilih(new Set([...pilih, ...tampil.map((w) => w.id)]))}>Pilih yang tampil</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPilih(new Set())}>Kosongkan</Button>
          </>
        )}
      </div>
      <ul className="grid max-h-80 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
        {tampil.map((w) => (
          <li key={w.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
              <input type="checkbox" checked={pilih.has(w.id)} onChange={() => toggle(w.id)} disabled={!editable} className="h-4 w-4" />
              <span>{w.nama} <span className="text-xs text-muted-foreground">{w.nomor_registrasi}</span></span>
            </label>
          </li>
        ))}
      </ul>
      {editable && (
        <Button type="button" onClick={simpan} disabled={pending}>{pending ? "Menyimpan…" : "Simpan daftar nominatif"}</Button>
      )}
      {galat && <Alert tone="bahaya">{galat}</Alert>}
      {ok && !galat && <Alert tone="sukses">Daftar nominatif tersimpan. Jumlah WB pada rencana sesi ikut diperbarui.</Alert>}
    </div>
  );
}
