import { ActionButton, ActionForm } from "@/components/shared/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Field, Pill, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatusBadge, type SecurityStatus } from "@/components/ui/status-badge";
import {
  catatAksesLuar,
  catatPengembalianSebagian,
  catatPerubahanRencana,
  catatStatusVariabel,
  hapusAksesLuar,
  hapusKelompok,
  hapusKontrolAlat,
  simpanKontrolAlat,
  tambahKelompok,
  ubahDokumenWajib,
  ubahLahanAktif,
  verifikasiEntri,
} from "@/lib/actions/kendali";
import { DOKUMEN_WAJIB, dokumenKurang, type BarisDokumen } from "@/lib/domain/dokumen-wajib";
import { VARIABEL_STATUS } from "@/lib/domain/instrumen-status";
import { fmtWaktu } from "@/lib/format";
import type { Role } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { longgar } from "@/lib/supabase/longgar";

type Baris = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const nomorFmt = (v: unknown) => (v === null || v === undefined ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(v)));

/**
 * Kendali sesi menurut pedoman: status 8 variabel, dokumen wajib a-m, kelompok kerja, perubahan rencana,
 * kontrol alat dan bahan, akses pihak luar, pengembalian sebagian, dan kualitas data.
 * Dipakai oleh halaman dasbor (Operator, Kepala Pengamanan, pemantau) dan halaman lapangan (Pengawal).
 */
export async function PanelKendali({ sessionId, peran }: { sessionId: string; peran: Role }) {
  const supabase = await createClient();
  const db = longgar(supabase);
  const [ses, dok, kel, ubah, vars, riw, alat, akses, sebagian, kual, ptg, nom] = await Promise.all([
    supabase.from("daily_sessions").select("*").eq("id", sessionId).maybeSingle(),
    db.from("sesi_dokumen").select("*").eq("session_id", sessionId).order("kode"),
    db.from("sesi_kelompok").select("*").eq("session_id", sessionId).order("created_at"),
    db.from("perubahan_rencana").select("*").eq("session_id", sessionId).order("waktu_dicatat", { ascending: false }),
    db.from("status_variabel").select("*").eq("session_id", sessionId),
    db.from("status_variabel_riwayat").select("*").eq("session_id", sessionId).order("waktu", { ascending: false }).limit(40),
    db.from("kontrol_alat").select("*").eq("session_id", sessionId).order("created_at"),
    db.from("akses_pihak_luar").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    db.from("pengembalian_sebagian").select("*").eq("session_id", sessionId).order("waktu_serah"),
    db.from("v_kualitas_data").select("*").eq("session_id", sessionId).maybeSingle(),
    supabase.from("petugas_sesi").select("nama").eq("session_id", sessionId),
    supabase.rpc("daftar_nominatif", { p_session: sessionId }),
  ]);
  const sesi = ses.data;
  if (!sesi) return <Alert tone="bahaya">Sesi tidak ditemukan.</Alert>;

  const tutup = !!sesi.ditutup_at;
  const mulai = sesi.status_kesiapan === "Dapat Dimulai";
  const operator = peran === "operator";
  const kepala = peran === "kepala_pengamanan";
  const pengawal = peran === "pengawal";
  const bisaUbahPersiapan = operator && !tutup && ["Menunggu", "Perbaiki Dulu", "Ditunda"].includes(sesi.status_kesiapan);
  const bisaCatat = !tutup && (operator || kepala || (pengawal && mulai));
  const bisaPerubahan = !tutup && (operator || kepala);

  const barisDok = (dok.data ?? []) as BarisDokumen[];
  const jumlahNom = Array.isArray(nom.data) ? nom.data.length : 0;
  const kurang = dokumenKurang(barisDok, {
    nominatif: jumlahNom > 0,
    rencanaPengamanan: !!sesi.dokumen_rencana_pengamanan,
    suratPerintah: !!sesi.dokumen_surat_perintah,
  });
  const peta = new Map(((vars.data ?? []) as Baris[]).map((v) => [Number(v.no), v]));
  const namaPetugas = (ptg.data ?? []).map((p) => p.nama);
  const kq = (kual.data ?? null) as Baris | null;
  const totalSebagian = ((sebagian.data ?? []) as Baris[]).reduce((a, b) => a + Number(b.jumlah_wb ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ---------------- Status per variabel ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Status pengamanan per variabel</CardTitle>
          <CardDescription>
            Status keseluruhan mengikuti temuan terberat yang masih berlangsung, tidak dirata-ratakan. Variabel yang kosong berarti belum diperiksa, bukan aman.
            Keberadaan WB yang belum pasti sekurang-kurangnya MERAH; WB tidak ditemukan setelah pemeriksaan langsung berstatus KRITIS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Status keseluruhan sesi:</span>
            <StatusBadge status={sesi.status_keamanan as SecurityStatus} />
            <span className="text-muted-foreground">Penurunan hanya lewat keputusan Kepala Pengamanan dengan bukti pemulihan.</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {VARIABEL_STATUS.map((v) => {
              const baris = peta.get(v.no);
              const status = (baris?.status ?? null) as SecurityStatus | null;
              const tb = !!baris && baris.status === null;
              const gelangTb = v.no === 7 && !sesi.pakai_gelang_monitor;
              return (
                <div key={v.no} className="space-y-3 rounded-xl border border-border/70 bg-white/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{v.no}. {v.judul}</p>
                    {status ? <StatusBadge status={status} /> : tb ? <Pill>Tidak berlaku</Pill> : gelangTb ? <Pill>Tidak berlaku (tanpa gelang)</Pill> : <Pill tone="kuning">Belum diperiksa</Pill>}
                  </div>
                  {baris && (
                    <p className="text-xs text-muted-foreground">
                      Dicatat {fmtWaktu(s(baris.diperbarui_at))}
                      {s(baris.tindak_lanjut) && <> · {s(baris.tindak_lanjut)}</>}
                      {s(baris.bukti) && <> · Bukti: {s(baris.bukti)}</>}
                      {tb && s(baris.alasan_tb) && <> · Alasan: {s(baris.alasan_tb)}</>}
                    </p>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary">Lihat tanda yang diamati dan tindakan minimum</summary>
                    <table className="mt-2 w-full border-collapse text-left">
                      <tbody>
                        {(["HIJAU", "KUNING", "MERAH", "KRITIS"] as const).map((k) => (
                          <tr key={k} className="align-top border-t border-border/60">
                            <td className="w-16 py-1.5 pr-2 font-semibold">{k}</td>
                            <td className="py-1.5 pr-2">{v.rubrik[k].tanda}</td>
                            <td className="py-1.5 text-muted-foreground">{v.rubrik[k].tindakan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                  {bisaCatat && !(gelangTb && !tb) && (
                    <ActionForm
                      action={catatStatusVariabel}
                      submit="Catat status"
                      resetOnSuccess={false}
                      className="space-y-2"
                      fields={{
                        session_id: { v: sessionId },
                        no: { v: v.no },
                        status: { s: "status" },
                        alasan_tb: { s: "alasan_tb" },
                        bukti: { s: "bukti" },
                        tindak_lanjut: { s: "tindak_lanjut" },
                        kondisi: { s: "kondisi" },
                      }}
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Status" htmlFor={`st-${v.no}`}>
                          <Select id={`st-${v.no}`} name="status" defaultValue={status ?? "HIJAU"}>
                            <option value="HIJAU">HIJAU</option>
                            <option value="KUNING">KUNING</option>
                            <option value="MERAH">MERAH</option>
                            <option value="KRITIS">KRITIS</option>
                            {v.bolehTB && <option value="">Tidak berlaku</option>}
                          </Select>
                        </Field>
                        {v.no === 2 && (
                          <Field label="Keberadaan WB" htmlFor="kond">
                            <Select id="kond" name="kondisi" defaultValue="">
                              <option value="">Semua WB terlihat dan cocok</option>
                              <option value="belum_pasti">Belum dapat dipastikan (paling rendah MERAH)</option>
                              <option value="tidak_ditemukan">Tidak ditemukan setelah pemeriksaan langsung (KRITIS)</option>
                            </Select>
                          </Field>
                        )}
                      </div>
                      <Field label="Temuan dan tindakan awal" htmlFor={`tl-${v.no}`}><Input id={`tl-${v.no}`} name="tindak_lanjut" defaultValue={s(baris?.tindak_lanjut)} placeholder="Apa yang ditemukan dan apa yang sudah dilakukan" /></Field>
                      <Field label="Bukti atau sumber (catatan pemeriksaan, berita acara, dokumentasi)" htmlFor={`bk-${v.no}`}><Input id={`bk-${v.no}`} name="bukti" defaultValue={s(baris?.bukti)} /></Field>
                      {v.bolehTB && <Field label="Alasan tidak berlaku (bila dipilih)" htmlFor={`tb-${v.no}`}><Input id={`tb-${v.no}`} name="alasan_tb" defaultValue={s(baris?.alasan_tb)} placeholder="Contoh: gelang tidak ditetapkan untuk kegiatan ini" /></Field>}
                    </ActionForm>
                  )}
                </div>
              );
            })}
          </div>
          {((riw.data ?? []) as Baris[]).length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-primary">Riwayat perubahan status variabel ({(riw.data ?? []).length})</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {((riw.data ?? []) as Baris[]).map((r) => (
                  <li key={s(r.id)}>{fmtWaktu(s(r.waktu))} · Variabel {s(r.no)}: {s(r.dari) || "-"} → {r.tb ? "Tidak berlaku" : s(r.ke)} · {s(r.alasan)}</li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Dokumen wajib ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumen wajib sebelum kegiatan</CardTitle>
          <CardDescription>
            Kepala Pengamanan baru dapat memutuskan Dapat Dimulai bila semua dokumen yang berlaku tersedia. Daftar nominatif, rencana pengamanan, dan surat perintah dinilai otomatis dari data yang sudah diisi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {kurang.length > 0 ? (
            <Alert tone="waspada">Belum tersedia: {kurang.map((k) => `${k.kode.toUpperCase()} (${k.judul.toLowerCase()})`).join("; ")}.</Alert>
          ) : (
            <Alert tone="sukses">Semua dokumen wajib yang berlaku sudah tersedia.</Alert>
          )}
          <div className="divide-y">
            {DOKUMEN_WAJIB.map((d) => {
              const b = barisDok.find((x) => x.kode === d.kode);
              const auto =
                d.otomatis === "nominatif" ? jumlahNom > 0 : d.otomatis === "rencana_pengamanan" ? !!sesi.dokumen_rencana_pengamanan : d.otomatis === "surat_perintah" ? !!sesi.dokumen_surat_perintah : null;
              return (
                <div key={d.kode} className="py-3 first:pt-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {d.kode.toUpperCase()}. {d.judul}
                    {!b?.berlaku ? <Pill>Tidak berlaku</Pill> : auto !== null ? (auto ? <Pill tone="hijau">Tersedia (otomatis)</Pill> : <Pill tone="kuning">Belum ada</Pill>) : b.tersedia ? <Pill tone="hijau">Tersedia</Pill> : <Pill tone="kuning">Belum ada</Pill>}
                    {d.hanyaLuar && <span className="text-xs font-normal text-muted-foreground">khusus di luar perimeter</span>}
                  </p>
                  <p className="mb-1 text-sm text-muted-foreground">{d.uraian}</p>
                  {b && !b.berlaku && b.alasan_tb && <p className="text-xs text-muted-foreground">Alasan: {b.alasan_tb}</p>}
                  {b?.nomor && <p className="text-xs text-muted-foreground">Nomor atau keterangan: {b.nomor}</p>}
                  {bisaUbahPersiapan && b && auto === null && (
                    <ActionForm
                      action={ubahDokumenWajib}
                      submit="Simpan"
                      resetOnSuccess={false}
                      className="flex flex-wrap items-end gap-3 space-y-0"
                      fields={{ session_id: { v: sessionId }, kode: { v: d.kode }, berlaku: { b: "berlaku" }, tersedia: { b: "tersedia" }, nomor: { s: "nomor" }, alasan_tb: { s: "alasan_tb" } }}
                    >
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="berlaku" defaultChecked={b.berlaku} className="h-4 w-4" /> Berlaku</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tersedia" defaultChecked={b.tersedia} className="h-4 w-4" /> Tersedia</label>
                      <Input name="nomor" defaultValue={b.nomor ?? ""} placeholder="Nomor atau keterangan" className="min-w-44 flex-1" aria-label={`Nomor dokumen ${d.kode}`} />
                      <Input name="alasan_tb" defaultValue={b.alasan_tb ?? ""} placeholder="Alasan bila tidak berlaku" className="min-w-44 flex-1" aria-label={`Alasan tidak berlaku ${d.kode}`} />
                    </ActionForm>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Lahan aktif, kelompok kerja ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Lahan aktif dan kelompok kerja</CardTitle>
          <CardDescription>Lahan tersedia (pada rencana kegiatan) dicatat terpisah dari lahan aktif pada hari ini. Perbandingan peserta atau luas per petugas hanya informasi beban pengawasan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">Lahan aktif hari ini: <b>{sesi.lahan_aktif_ha === null ? "belum diisi" : `${nomorFmt(sesi.lahan_aktif_ha)} ha`}</b> · Batas keterlambatan entri: <b>{sesi.batas_keterlambatan_menit} menit</b> · Pengawas: <b>{sesi.petugas_ids.length}</b> akun, <b>{namaPetugas.length}</b> nama dicatat</p>
          {bisaUbahPersiapan && (
            <ActionForm action={ubahLahanAktif} submit="Simpan" resetOnSuccess={false} className="flex flex-wrap items-end gap-3 space-y-0" fields={{ session_id: { v: sessionId }, lahan_aktif_ha: { n: "lahan_aktif_ha" }, batas_keterlambatan_menit: { n: "batas" } }}>
              <Field label="Lahan aktif (ha)" htmlFor="la"><Input id="la" name="lahan_aktif_ha" inputMode="decimal" defaultValue={s(sesi.lahan_aktif_ha)} className="w-36" /></Field>
              <Field label="Batas keterlambatan entri (menit)" htmlFor="bt"><Input id="bt" name="batas" inputMode="numeric" defaultValue={s(sesi.batas_keterlambatan_menit)} className="w-44" /></Field>
            </ActionForm>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 pr-2">Kelompok</th><th className="pr-2">WB</th><th className="pr-2">Area aktif</th><th className="pr-2">Pengawas</th><th className="pr-2">Pengganti</th><th className="pr-2">Jalur serah terima</th><th /></tr></thead>
              <tbody>
                {((kel.data ?? []) as Baris[]).map((k) => (
                  <tr key={s(k.id)} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2">{s(k.nama)}</td><td className="pr-2">{s(k.jumlah_wb)}</td><td className="pr-2">{s(k.area_aktif) || "-"}</td><td className="pr-2">{s(k.pengawas) || "-"}</td><td className="pr-2">{s(k.pengganti) || "-"}</td><td className="pr-2">{s(k.jalur_serah_terima) || "-"}</td>
                    <td>{bisaUbahPersiapan && <ActionButton action={hapusKelompok} input={{ session_id: sessionId, id: s(k.id) }} label="Hapus" confirm="Hapus kelompok ini?" />}</td>
                  </tr>
                ))}
                {(kel.data ?? []).length === 0 && <tr><td colSpan={7} className="py-2 text-muted-foreground">Belum ada kelompok kerja.</td></tr>}
              </tbody>
            </table>
          </div>
          {bisaUbahPersiapan && (
            <ActionForm action={tambahKelompok} submit="Tambah kelompok" className="grid gap-2 sm:grid-cols-3" fields={{ session_id: { v: sessionId }, nama: { s: "nama" }, jumlah_wb: { n: "jumlah_wb" }, area_aktif: { s: "area_aktif" }, pengawas: { s: "pengawas" }, pengganti: { s: "pengganti" }, jalur_serah_terima: { s: "jalur" } }}>
              <Field label="Nama kelompok" htmlFor="kn"><Input id="kn" name="nama" /></Field>
              <Field label="Jumlah WB" htmlFor="kj"><Input id="kj" name="jumlah_wb" inputMode="numeric" /></Field>
              <Field label="Area aktif" htmlFor="ka"><Input id="ka" name="area_aktif" /></Field>
              <Field label="Pengawas" htmlFor="kp"><Input id="kp" name="pengawas" /></Field>
              <Field label="Pengganti" htmlFor="kg"><Input id="kg" name="pengganti" /></Field>
              <Field label="Jalur serah terima" htmlFor="kr"><Input id="kr" name="jalur" /></Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Perubahan rencana ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Perubahan rencana dan koreksi data</CardTitle>
          <CardDescription>
            Perubahan yang memengaruhi pengamanan diperiksa ulang kesiapannya dan disetujui pejabat berwenang sebelum dijalankan. Catat rencana awal, perubahan, alasan, waktu, pejabat, dan bukti. Salah tulis dikoreksi dengan mencatat data sebelum dan sesudah. Catatan tidak dapat diubah atau dihapus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 pr-2">Waktu</th><th className="pr-2">Jenis</th><th className="pr-2">Bagian</th><th className="pr-2">Awal</th><th className="pr-2">Menjadi</th><th className="pr-2">Alasan</th><th>Pejabat dan bukti</th></tr></thead>
              <tbody>
                {((ubah.data ?? []) as Baris[]).map((u) => (
                  <tr key={s(u.id)} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2">{fmtWaktu(s(u.waktu_dicatat))}</td><td className="pr-2">{s(u.jenis)}</td><td className="pr-2">{s(u.bagian)}</td><td className="pr-2">{s(u.nilai_awal) || "-"}</td><td className="pr-2">{s(u.nilai_baru)}</td><td className="pr-2">{s(u.alasan)}</td><td>{s(u.pejabat) || "-"}{s(u.bukti_url) && <> · {s(u.bukti_url)}</>}</td>
                  </tr>
                ))}
                {(ubah.data ?? []).length === 0 && <tr><td colSpan={7} className="py-2 text-muted-foreground">Belum ada perubahan atau koreksi.</td></tr>}
              </tbody>
            </table>
          </div>
          {bisaPerubahan && (
            <ActionForm action={catatPerubahanRencana} submit="Catat" className="grid gap-2 sm:grid-cols-2" fields={{ session_id: { v: sessionId }, jenis: { s: "jenis" }, bagian: { s: "bagian" }, nilai_awal: { s: "nilai_awal" }, nilai_baru: { s: "nilai_baru" }, alasan: { s: "alasan" }, pejabat: { s: "pejabat" }, bukti_url: { s: "bukti_url" } }}>
              <Field label="Jenis" htmlFor="pj"><Select id="pj" name="jenis" defaultValue="Perubahan rencana"><option>Perubahan rencana</option><option>Koreksi data</option></Select></Field>
              <Field label="Bagian yang berubah" htmlFor="pb"><Input id="pb" name="bagian" placeholder="Peserta, petugas, lokasi, lahan aktif, jadwal, alat, atau data yang salah tulis" /></Field>
              <Field label="Rencana awal atau data sebelum koreksi" htmlFor="pa"><Input id="pa" name="nilai_awal" /></Field>
              <Field label="Perubahan yang disetujui atau data sesudah koreksi" htmlFor="pn"><Input id="pn" name="nilai_baru" /></Field>
              <Field label="Alasan" htmlFor="pl" className="sm:col-span-2"><Textarea id="pl" name="alasan" rows={2} /></Field>
              <Field label="Pejabat yang menyetujui (wajib untuk perubahan rencana)" htmlFor="pp"><Input id="pp" name="pejabat" /></Field>
              <Field label="Bukti persetujuan (nomor atau keterangan)" htmlFor="pk"><Input id="pk" name="bukti_url" /></Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Kontrol alat dan bahan ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Pengendalian alat, mesin, dan bahan</CardTitle>
          <CardDescription>
            Catat penyerahan, penggunaan, sisa, dan pengembalian. Selisih alat dihitung dari diserahkan dikurangi kembali; untuk bahan, dikurangi juga yang digunakan. Selisih wajib ditindaklanjuti sebelum kegiatan ditutup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 pr-2">Jenis</th><th className="pr-2">Nama</th><th className="pr-2">Diserahkan</th><th className="pr-2">Digunakan</th><th className="pr-2">Kembali atau sisa</th><th className="pr-2">Selisih</th><th className="pr-2">Tindakan atas selisih</th><th className="pr-2">Petugas</th><th /></tr></thead>
              <tbody>
                {((alat.data ?? []) as Baris[]).map((a) => {
                  const selisih = Number(a.selisih ?? 0);
                  return (
                    <tr key={s(a.id)} className="border-b border-border/50 align-top">
                      <td className="py-1.5 pr-2">{s(a.jenis)}</td><td className="pr-2">{s(a.nama)}</td><td className="pr-2">{nomorFmt(a.diserahkan)} {s(a.satuan)}</td><td className="pr-2">{nomorFmt(a.digunakan)}</td><td className="pr-2">{nomorFmt(a.kembali)}</td>
                      <td className="pr-2">{selisih === 0 ? <Pill tone="hijau">Cocok</Pill> : <Pill tone="merah">{nomorFmt(selisih)}</Pill>}</td>
                      <td className="pr-2">{s(a.tindakan) || (selisih !== 0 ? <span className="text-status-merah">Belum ada tindakan</span> : "-")}</td><td className="pr-2">{s(a.petugas) || "-"}</td>
                      <td>{bisaCatat && <ActionButton action={hapusKontrolAlat} input={{ session_id: sessionId, id: s(a.id) }} label="Hapus" confirm="Hapus baris ini?" />}</td>
                    </tr>
                  );
                })}
                {(alat.data ?? []).length === 0 && <tr><td colSpan={9} className="py-2 text-muted-foreground">Belum ada catatan.</td></tr>}
              </tbody>
            </table>
          </div>
          {bisaCatat && (
            <ActionForm action={simpanKontrolAlat} submit="Tambah catatan" className="grid gap-2 sm:grid-cols-3" fields={{ session_id: { v: sessionId }, jenis: { s: "jenis" }, nama: { s: "nama" }, satuan: { s: "satuan" }, diserahkan: { n: "diserahkan" }, digunakan: { n: "digunakan" }, kembali: { n: "kembali" }, tindakan: { s: "tindakan" }, petugas: { s: "petugas" } }}>
              <Field label="Jenis" htmlFor="aj"><Select id="aj" name="jenis" defaultValue="Alat"><option>Alat</option><option>Mesin</option><option>Bahan</option><option>APD</option><option>Sarana</option><option>Gelang</option></Select></Field>
              <Field label="Nama" htmlFor="an"><Input id="an" name="nama" /></Field>
              <Field label="Satuan" htmlFor="as"><Input id="as" name="satuan" placeholder="buah, kg, liter" /></Field>
              <Field label="Diserahkan" htmlFor="ad"><Input id="ad" name="diserahkan" inputMode="decimal" defaultValue="0" /></Field>
              <Field label="Digunakan" htmlFor="au"><Input id="au" name="digunakan" inputMode="decimal" defaultValue="0" /></Field>
              <Field label="Kembali atau sisa" htmlFor="ak"><Input id="ak" name="kembali" inputMode="decimal" defaultValue="0" /></Field>
              <Field label="Tindakan atas selisih" htmlFor="at"><Input id="at" name="tindakan" /></Field>
              <Field label="Petugas" htmlFor="ap"><Input id="ap" name="petugas" /></Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Akses pihak luar ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Akses pihak luar dan serah terima hasil</CardTitle>
          <CardDescription>Pihak luar dan kendaraan hanya mengakses lokasi sesuai persetujuan dan pemeriksaan. Pendamping atau mitra tidak memberikan izin pergerakan WB. Muatan atau hasil produksi dicatat jenis, jumlah, asal, tujuan, serta petugas penyerah dan penerima.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 pr-2">Identitas dan kendaraan</th><th className="pr-2">Tujuan</th><th className="pr-2">Masuk</th><th className="pr-2">Keluar</th><th className="pr-2">Barang atau hasil</th><th className="pr-2">Asal dan tujuan</th><th className="pr-2">Pemeriksaan dan serah terima</th><th /></tr></thead>
              <tbody>
                {((akses.data ?? []) as Baris[]).map((a) => (
                  <tr key={s(a.id)} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2">{s(a.identitas)}{s(a.kendaraan) && <> · {s(a.kendaraan)}</>}</td><td className="pr-2">{s(a.tujuan) || "-"}</td><td className="pr-2">{a.waktu_masuk ? fmtWaktu(s(a.waktu_masuk)) : "-"}</td><td className="pr-2">{a.waktu_keluar ? fmtWaktu(s(a.waktu_keluar)) : "-"}</td>
                    <td className="pr-2">{s(a.barang_hasil) || "-"}{a.jumlah !== null && a.jumlah !== undefined && <> · {nomorFmt(a.jumlah)} {s(a.satuan)}</>}</td><td className="pr-2">{s(a.asal_tujuan) || "-"}</td><td className="pr-2">{s(a.pemeriksaan) || "-"}{s(a.serah_terima) && <> · {s(a.serah_terima)}</>}</td>
                    <td>{bisaCatat && <ActionButton action={hapusAksesLuar} input={{ session_id: sessionId, id: s(a.id) }} label="Hapus" confirm="Hapus catatan ini?" />}</td>
                  </tr>
                ))}
                {(akses.data ?? []).length === 0 && <tr><td colSpan={8} className="py-2 text-muted-foreground">Belum ada pihak luar yang tercatat.</td></tr>}
              </tbody>
            </table>
          </div>
          {bisaCatat && (
            <ActionForm action={catatAksesLuar} submit="Catat akses" className="grid gap-2 sm:grid-cols-3" fields={{ session_id: { v: sessionId }, identitas: { s: "identitas" }, kendaraan: { s: "kendaraan" }, tujuan: { s: "tujuan" }, waktu_masuk: { w: "waktu_masuk" }, waktu_keluar: { w: "waktu_keluar" }, barang_hasil: { s: "barang_hasil" }, satuan: { s: "satuan" }, jumlah: { n: "jumlah" }, asal_tujuan: { s: "asal_tujuan" }, pemeriksaan: { s: "pemeriksaan" }, serah_terima: { s: "serah_terima" } }}>
              <Field label="Identitas pihak luar" htmlFor="xi"><Input id="xi" name="identitas" /></Field>
              <Field label="Kendaraan" htmlFor="xk"><Input id="xk" name="kendaraan" placeholder="Nomor polisi" /></Field>
              <Field label="Tujuan" htmlFor="xt"><Input id="xt" name="tujuan" /></Field>
              <Field label="Waktu masuk" htmlFor="xm"><Input id="xm" name="waktu_masuk" type="datetime-local" /></Field>
              <Field label="Waktu keluar" htmlFor="xl"><Input id="xl" name="waktu_keluar" type="datetime-local" /></Field>
              <Field label="Barang atau hasil" htmlFor="xb"><Input id="xb" name="barang_hasil" /></Field>
              <Field label="Jumlah" htmlFor="xj"><Input id="xj" name="jumlah" inputMode="decimal" /></Field>
              <Field label="Satuan" htmlFor="xs"><Input id="xs" name="satuan" /></Field>
              <Field label="Asal dan tujuan" htmlFor="xa"><Input id="xa" name="asal_tujuan" /></Field>
              <Field label="Hasil pemeriksaan" htmlFor="xp"><Input id="xp" name="pemeriksaan" /></Field>
              <Field label="Serah terima (penyerah dan penerima)" htmlFor="xh" className="sm:col-span-2"><Input id="xh" name="serah_terima" /></Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Pengembalian sebagian ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Pengembalian sebagian</CardTitle>
          <CardDescription>Bila WB kembali ke blok bertahap, catat setiap penyerahan di sini. Jumlah dijumlahkan dengan serah terima akhir tanpa menghitung peserta dua kali. Total sebagian saat ini: <b>{totalSebagian}</b> WB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1 text-sm">
            {((sebagian.data ?? []) as Baris[]).map((x) => (
              <li key={s(x.id)}>{fmtWaktu(s(x.waktu_serah))} · {s(x.jumlah_wb)} WB, {s(x.jumlah_alat)} alat · diserahkan {s(x.penyerah) || "-"}, diterima {s(x.penerima)}{s(x.catatan) && <> · {s(x.catatan)}</>}</li>
            ))}
            {(sebagian.data ?? []).length === 0 && <li className="text-muted-foreground">Belum ada pengembalian sebagian.</li>}
          </ul>
          {bisaCatat && mulai && (
            <ActionForm action={catatPengembalianSebagian} submit="Catat penyerahan" className="grid gap-2 sm:grid-cols-3" fields={{ session_id: { v: sessionId }, jumlah_wb: { n: "jumlah_wb" }, jumlah_alat: { n: "jumlah_alat" }, penyerah: { s: "penyerah" }, penerima: { s: "penerima" }, catatan: { s: "catatan" } }}>
              <Field label="Jumlah WB diserahkan" htmlFor="sw"><Input id="sw" name="jumlah_wb" inputMode="numeric" /></Field>
              <Field label="Jumlah alat" htmlFor="sa"><Input id="sa" name="jumlah_alat" inputMode="numeric" defaultValue="0" /></Field>
              <Field label="Petugas penyerah" htmlFor="sp"><Input id="sp" name="penyerah" /></Field>
              <Field label="Petugas penerima" htmlFor="sn"><Input id="sn" name="penerima" /></Field>
              <Field label="Catatan" htmlFor="sc" className="sm:col-span-2"><Input id="sc" name="catatan" /></Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Kualitas data ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Kualitas data</CardTitle>
          <CardDescription>Waktu pemeriksaan di lapangan dan waktu data diterima ditampilkan terpisah. Entri yang terlambat atau susulan tidak dianggap mutakhir sebelum diverifikasi pejabat pengamanan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Ukuran judul="Entri tercatat" nilai={s(kq?.entri_total ?? 0)} />
            <Ukuran judul="Pengecekan lapangan terakhir" nilai={kq?.cek_terakhir_at ? fmtWaktu(s(kq.cek_terakhir_at)) : "-"} />
            <Ukuran judul="Data terakhir diterima" nilai={kq?.diterima_terakhir_at ? fmtWaktu(s(kq.diterima_terakhir_at)) : "-"} />
            <Ukuran judul="Entri susulan" nilai={s(kq?.entri_susulan ?? 0)} />
            <Ukuran judul={`Terlambat (> ${sesi.batas_keterlambatan_menit} menit)`} nilai={s(kq?.entri_terlambat ?? 0)} />
            <Ukuran judul="Belum diverifikasi" nilai={s(kq?.entri_belum_verifikasi ?? 0)} />
          </div>
          {kepala && !tutup && Number(kq?.entri_belum_verifikasi ?? 0) > 0 && (
            <ActionButton action={verifikasiEntri} input={{ session_id: sessionId }} label="Verifikasi semua entri sesi ini" confirm="Nyatakan seluruh entri sesi ini sudah Anda verifikasi?" variant="default" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Ukuran({ judul, nilai }: { judul: string; nilai: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white/70 p-3">
      <p className="text-xs text-muted-foreground">{judul}</p>
      <p className="mt-1 font-semibold">{nilai}</p>
    </div>
  );
}
