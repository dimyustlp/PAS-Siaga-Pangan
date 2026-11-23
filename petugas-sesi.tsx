"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { catatPetugas, hapusPetugas } from "@/lib/actions/petugas";

export type PetugasCatat = { id: string; nama: string; nip: string | null; seksi: string | null };

/** Gerbang nama petugas: akun Pengawal dipakai bergantian, jadi nama petugas wajib dicatat sebelum berkas diisi. */
export function PetugasSesi({ sessionId, daftar, saran, terkunci }: { sessionId: string; daftar: PetugasCatat[]; saran: string[]; terkunci: boolean }) {
  const router = useRouter();
  const [nama, setNama] = React.useState("");
  const [nip, setNip] = React.useState("");
  const [seksi, setSeksi] = React.useState("");
  const [galat, setGalat] = React.useState<string | null>(null);
  const [hapus, setHapus] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const kosong = daftar.length === 0;

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    start(async () => {
      const r = await catatPetugas({ session_id: sessionId, nama, nip: nip || undefined, seksi: seksi || undefined });
      if (!r.ok) return setGalat(r.error);
      setNama(""); setNip(""); setSeksi("");
      router.refresh();
    });
  }
  function buang(id: string) {
    setGalat(null);
    setHapus(id);
    start(async () => {
      const r = await hapusPetugas({ id, session_id: sessionId });
      setHapus(null);
      if (!r.ok) return setGalat(r.error);
      router.refresh();
    });
  }

  return (
    <section aria-label="Petugas pengawal" className="kaca space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-brand" aria-hidden />
        <h2 className="font-semibold">Petugas yang bertugas</h2>
      </div>
      {kosong && !terkunci && (
        <Alert tone="waspada">Tulis nama petugas yang mengawal kegiatan ini. Pengisian berkas persyaratan baru terbuka setelah minimal satu nama tercatat.</Alert>
      )}
      {daftar.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {daftar.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.nama}</span>
                <span className="block truncate text-xs text-muted-foreground">{[p.nip && `NIP ${p.nip}`, p.seksi].filter(Boolean).join(" · ") || "Tanpa NIP atau seksi"}</span>
              </span>
              {!terkunci && (
                <button type="button" onClick={() => buang(p.id)} disabled={pending} aria-label={`Hapus ${p.nama}`} className="text-status-merah disabled:opacity-50">
                  {hapus === p.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!terkunci && (
        <form onSubmit={simpan} className="space-y-3 border-t pt-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Nama petugas *" htmlFor="pt-nama">
              <Input id="pt-nama" list="pt-saran" value={nama} onChange={(e) => setNama(e.target.value)} required autoComplete="off" placeholder="Nama lengkap" />
              <datalist id="pt-saran">{saran.map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field label="NIP" htmlFor="pt-nip" hint="Boleh dikosongkan."><Input id="pt-nip" inputMode="numeric" value={nip} onChange={(e) => setNip(e.target.value)} /></Field>
            <Field label="Seksi atau bagian" htmlFor="pt-seksi" hint="Mis. Seksi Giatja atau Bimker."><Input id="pt-seksi" value={seksi} onChange={(e) => setSeksi(e.target.value)} /></Field>
          </div>
          {galat && <Alert tone="bahaya">{galat}</Alert>}
          <Button type="submit" disabled={pending} variant={kosong ? "default" : "outline"}>
            {pending && !hapus ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
            {kosong ? "Catat petugas" : "Tambah petugas lain"}
          </Button>
        </form>
      )}
      {terkunci && galat && <Alert tone="bahaya">{galat}</Alert>}
    </section>
  );
}
