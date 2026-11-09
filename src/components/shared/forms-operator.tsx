import { ActionForm } from "@/components/shared/action-form";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createActivity, createSession, updateSession } from "@/lib/actions/sessions";
import { createLocation, importInmates } from "@/lib/actions/master";
import type { Tables } from "@/lib/supabase/database.types";

type Pengawal = { id: string; full_name: string; nip: string | null };

function DaftarPengawal({ pengawal, pilih = [] }: { pengawal: Pengawal[]; pilih?: string[] }) {
  if (pengawal.length === 0) {
    return <p className="text-sm text-status-merah">Belum ada akun Pengawal aktif di UPT Anda. Minta Administrator membuatkannya.</p>;
  }
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {pengawal.map((p) => (
        <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
          <input type="checkbox" name="petugas" value={p.id} defaultChecked={pilih.includes(p.id)} className="h-4 w-4" />
          {p.full_name}
        </label>
      ))}
    </div>
  );
}

export function FormKegiatan({ lokasi }: { lokasi: Tables<"master_locations">[] }) {
  return (
    <ActionForm
      action={createActivity}
      submit="Simpan rencana kegiatan"
      success="Rencana kegiatan tersimpan. Kode kegiatan dibuat otomatis."
      fields={{
        jenis_kegiatan: { s: "jenis" },
        lokasi_id: { s: "lokasi" },
        tanggal_mulai: { s: "mulai" },
        rencana_berakhir: { s: "berakhir" },
        luas_lahan_ha: { n: "luas" },
        batas_area: { s: "batas" },
        rute: { s: "rute" },
        titik_komunikasi: { s: "komunikasi" },
        akses_warga: { s: "akses" },
        nomor_persetujuan: { s: "persetujuan" },
        nomor_surat_perintah: { s: "sp" },
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis kegiatan" htmlFor="jenis">
          <Select id="jenis" name="jenis" required defaultValue="">
            <option value="" disabled>Pilih jenis</option>
            <option>Pertanian</option><option>Peternakan</option><option>Perikanan</option>
          </Select>
        </Field>
        <Field label="Lokasi" htmlFor="lokasi">
          <Select id="lokasi" name="lokasi" required defaultValue="">
            <option value="" disabled>{lokasi.length ? "Pilih lokasi" : "Tambahkan lokasi dulu di bawah"}</option>
            {lokasi.map((l) => <option key={l.id} value={l.id}>{l.nama} · {l.posisi}</option>)}
          </Select>
        </Field>
        <Field label="Tanggal mulai" htmlFor="mulai"><Input id="mulai" name="mulai" type="date" required /></Field>
        <Field label="Rencana berakhir" htmlFor="berakhir"><Input id="berakhir" name="berakhir" type="date" /></Field>
        <Field label="Luas lahan atau kolam (hektare)" htmlFor="luas"><Input id="luas" name="luas" inputMode="decimal" placeholder="mis. 2,5" /></Field>
        <Field label="Nomor persetujuan kegiatan" htmlFor="persetujuan"><Input id="persetujuan" name="persetujuan" /></Field>
        <Field label="Nomor surat perintah" htmlFor="sp"><Input id="sp" name="sp" /></Field>
        <Field label="Titik komunikasi" htmlFor="komunikasi" hint="Mis. pos jaga, nomor radio atau telepon."><Input id="komunikasi" name="komunikasi" /></Field>
        <Field label="Batas area kegiatan" htmlFor="batas" className="sm:col-span-2"><Textarea id="batas" name="batas" rows={2} placeholder="Batas-batas area yang boleh dijangkau WB" /></Field>
        <Field label="Rute berangkat dan pulang" htmlFor="rute" className="sm:col-span-2"><Textarea id="rute" name="rute" rows={2} /></Field>
        <Field label="Akses warga sekitar" htmlFor="akses" className="sm:col-span-2" hint="Siapa saja yang bisa berinteraksi di area kegiatan dan bagaimana diatur."><Textarea id="akses" name="akses" rows={2} /></Field>
      </div>
    </ActionForm>
  );
}

const kolomSesi = {
  tanggal_sesi: { s: "tanggal" },
  petugas_ids: { a: "petugas" },
  jumlah_alat_kerja: { n: "alat" },
  rincian_alat: { s: "rincian" },
  interval_pemeriksaan: { n: "interval" },
  pakai_gelang_monitor: { b: "gelang" },
  bimker_penanggung_jawab: { s: "bimker" },
  petugas_blok: { s: "blok" },
  petugas_p2u: { s: "p2u" },
} as const;

function IsianSesi({ pengawal, awal }: { pengawal: Pengawal[]; awal?: Tables<"daily_sessions"> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tanggal sesi" htmlFor="tanggal"><Input id="tanggal" name="tanggal" type="date" required defaultValue={awal?.tanggal_sesi} /></Field>
      <Field label="Interval pemeriksaan berkala (menit)" htmlFor="interval" hint="Hitung WB setiap interval ini. 5 sampai 480 menit.">
        <Input id="interval" name="interval" type="number" min={5} max={480} required defaultValue={awal?.interval_pemeriksaan ?? 60} />
      </Field>
      <Field label="Jumlah alat kerja" htmlFor="alat"><Input id="alat" name="alat" type="number" min={0} required defaultValue={awal?.jumlah_alat_kerja ?? 0} /></Field>
      <Field label="Rincian alat kerja" htmlFor="rincian"><Input id="rincian" name="rincian" defaultValue={awal?.rincian_alat ?? ""} placeholder="Mis. 10 cangkul, 5 sabit" /></Field>
      <Field label="Bimker penanggung jawab" htmlFor="bimker"><Input id="bimker" name="bimker" defaultValue={awal?.bimker_penanggung_jawab ?? ""} /></Field>
      <Field label="Petugas blok" htmlFor="blok"><Input id="blok" name="blok" defaultValue={awal?.petugas_blok ?? ""} /></Field>
      <Field label="Petugas P2U" htmlFor="p2u"><Input id="p2u" name="p2u" defaultValue={awal?.petugas_p2u ?? ""} /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="gelang" className="h-4 w-4" defaultChecked={awal?.pakai_gelang_monitor ?? false} />
        Sesi memakai gelang monitor
      </label>
      <Field label="Pengawal yang bertugas" className="sm:col-span-2" hint="Hanya Pengawal aktif dari UPT yang sama.">
        <DaftarPengawal pengawal={pengawal} pilih={awal?.petugas_ids} />
      </Field>
    </div>
  );
}

export function FormSesiBaru({ kegiatan, pengawal }: { kegiatan: { id: string; label: string }[]; pengawal: Pengawal[] }) {
  return (
    <ActionForm
      action={createSession}
      submit="Buat sesi harian"
      success="Sesi dibuat dengan status Menunggu. Lengkapi dokumen, nominatif, dan indikator kesiapan pada halaman sesi."
      fields={{ activity_id: { s: "kegiatan" }, jumlah_narapidana: { v: 0 }, ...kolomSesi }}
    >
      <Field label="Kegiatan" htmlFor="kegiatan">
        <Select id="kegiatan" name="kegiatan" required defaultValue="">
          <option value="" disabled>{kegiatan.length ? "Pilih kegiatan" : "Buat rencana kegiatan dulu"}</option>
          {kegiatan.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </Select>
      </Field>
      <IsianSesi pengawal={pengawal} />
    </ActionForm>
  );
}

export function FormSesiUbah({ sesi, pengawal }: { sesi: Tables<"daily_sessions">; pengawal: Pengawal[] }) {
  return (
    <ActionForm
      action={updateSession}
      submit="Simpan perubahan sesi"
      resetOnSuccess={false}
      fields={{ session_id: { v: sesi.id }, jumlah_narapidana: { v: sesi.jumlah_narapidana }, ...kolomSesi }}
    >
      <IsianSesi pengawal={pengawal} awal={sesi} />
    </ActionForm>
  );
}

export function FormLokasi() {
  return (
    <ActionForm
      action={createLocation}
      submit="Simpan lokasi"
      fields={{ nama: { s: "nama" }, kode: { s: "kode" }, keterangan: { s: "ket" }, luas_ha: { n: "luas" }, posisi: { s: "posisi" }, titik: { s: "titik" } }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lokasi" htmlFor="l-nama"><Input id="l-nama" name="nama" required /></Field>
        <Field label="Letak lokasi" htmlFor="l-posisi" hint="Menentukan bentuk penanda di peta: lingkaran untuk di dalam UPT, belah ketupat untuk di luar UPT.">
          <Select id="l-posisi" name="posisi" defaultValue="Dalam UPT"><option>Dalam UPT</option><option>Luar UPT</option></Select>
        </Field>
        <Field label="Titik koordinat" htmlFor="l-titik" hint="Wajib untuk lokasi di luar UPT. Di Google Maps, klik kanan titik lokasi lalu klik angka koordinatnya, kemudian tempel di sini.">
          <Input id="l-titik" name="titik" placeholder="-6.2995, 106.5960" inputMode="decimal" />
        </Field>
        <Field label="Kode (opsional)" htmlFor="l-kode"><Input id="l-kode" name="kode" /></Field>
        <Field label="Luas (hektare)" htmlFor="l-luas"><Input id="l-luas" name="luas" inputMode="decimal" /></Field>
        <Field label="Keterangan" htmlFor="l-ket"><Input id="l-ket" name="ket" /></Field>
      </div>
    </ActionForm>
  );
}

export function FormImporWb() {
  return (
    <ActionForm
      action={importInmates}
      submit="Impor warga binaan"
      fields={{ teks: { s: "teks" } }}
      success="Impor selesai."
    >
      <Field label="Data warga binaan" htmlFor="wb-teks" hint="Satu baris per orang: nomor registrasi, lalu nama (dipisah koma, titik koma, atau tab). Yang sudah terdaftar dilewati.">
        <Textarea id="wb-teks" name="teks" rows={6} required placeholder={"AI-123456, Nama Lengkap\nAI-123457, Nama Lain"} />
      </Field>
    </ActionForm>
  );
}
