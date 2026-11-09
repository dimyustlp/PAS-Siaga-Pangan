# PAS-SIAGA Pangan

Aplikasi pemantauan dan pengamanan kegiatan ketahanan pangan pemasyarakatan.

Teknologi: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (database, login, penyimpanan berkas), Vercel.

## Menjalankan di komputer sendiri

1. `npm install`
2. Salin `.env.example` menjadi `.env.local`, isi dua nilainya dari Supabase (Project Settings).
3. `npm run dev`, lalu buka http://localhost:3000

## Peran dan halaman

| Peran | Halaman |
|---|---|
| Administrator | Dasbor, `/sesi`, `/evaluasi`, `/risiko`, `/pedoman`, `/admin/akun`, `/admin/wilayah`, `/admin/data-induk`, `/admin/audit`, `/berkas` |
| Operator UPT | Dasbor, `/kegiatan`, `/tindak-lanjut`, `/evaluasi`, `/berkas` (unggah dan hapus untuk UPT sendiri) |
| Kepala Pengamanan | Dasbor, `/keputusan`, `/tindak-lanjut`, `/evaluasi`, `/risiko` |
| Pengawal | `/lapangan` (entri offline, bisa dipasang sebagai aplikasi), `/pedoman` |
| Pemantau Kanwil / Pusat | Dasbor, `/sesi`, `/evaluasi`, `/risiko`, `/pedoman` (hanya baca, cakupan sesuai Kanwil/pusat) |

Pembatas halaman ada di `src/middleware.ts` dan `src/lib/rbac.ts`. Pembatas itu hanya memudahkan tampilan. Penjaga data yang sebenarnya adalah aturan RLS di database (`01-skema-pas-siaga-pangan.sql`, `02-peran-administrator.sql`, dan `03-fitur-rpp.sql`, `06-berkas-dan-akun.sql`, `07-gelang-alarm.sql`, `08-perketat-profil.sql`, `09-kanwil-upt-nasional.sql`).

## Tahap pengembangan

- Fase 1: skema database, RLS, penyimpanan berkas (selesai)
- Fase 2: kerangka aplikasi, login, pembatas peran (selesai)
- Fase 3: server actions dan lapisan data (selesai, lihat di bawah)
- Fase 4: dasbor realtime, antarmuka Pengawal offline (PWA), evaluasi, pedoman, risiko, dan halaman Administrator (selesai)

## Fase 3: fungsi sisi server

Semua ada di `src/lib/actions/` dan hanya bisa dipanggil sesuai peran. Aturan alur yang sebenarnya dijaga database, jadi pesan penolakannya (berbahasa Indonesia) diteruskan apa adanya.

| Berkas | Fungsi | Peran |
|---|---|---|
| `master.ts` | `createLocation`, `createInmate` | Administrator, Operator |
| `sessions.ts` | `createActivity`, `createSession`, `updateSession`, `resubmitSession`, `attachSessionDocument` | Operator |
| `field-logs.ts` | `submitFieldLog`, `submitFieldLogBatch` (entri susulan setelah offline) | Pengawal |
| `decisions.ts` | `decideReadiness`, `verifyIncident`, `lowerSecurityStatus`, `closeSession`, `checkReconciliation` | Kepala Pengamanan (cek rekonsiliasi: Operator dan Administrator juga) |

Pembacaan data: `src/lib/data/sessions.ts` (`listSessions`, `getSessionDetail` termasuk status jadwal pemeriksaan berkala).

Catatan penting:
- Foto dan dokumen diunggah langsung dari browser ke Supabase Storage, lalu alamatnya dikirim ke server action untuk diperiksa dan dicatat.
- Entri lapangan membawa `client_id` (UUID dari perangkat). Kirim ulang entri yang sama aman: dianggap sudah tersimpan.
- Entri susulan boleh bermundur sampai 7 hari dan tidak boleh di masa depan (toleransi 5 menit untuk selisih jam HP).
- Jalankan uji: `npm test`.


## Alarm gelang

Sistem pemantauan gelang (imipas.kittways.com) tidak punya API yang kami ketahui, jadi integrasinya memakai model dorong: notifikasi di sistem gelang memanggil `GET/POST /api/gelang/alarm` dengan parameter `kunci`, `unit`, `jenis`, `waktu`, `lokasi`, `baterai`.

- Kunci dibuat Administrator di `/admin/gelang`. Database hanya menyimpan SHA-256-nya.
- Nama unit di sistem gelang diawali kode (`0834_M Hendi F`). Kode itu dipetakan ke UPT dan WB di menu Gelang.
- Alarm masuk ke sesi aktif UPT (yang memakai gelang) dan menunggu konfirmasi petugas di menu Gelang.
- Tidak ada pemantauan posisi terus-menerus di aplikasi ini.

## Peta kegiatan

Menu Peta (`/peta`) menampilkan seluruh 611 UPT dari 33 Kanwil (data di `data/upt-nasional.json`, `data/kanwil-33.json`).

- Bentuk penanda = letak kegiatan: lingkaran di dalam UPT, belah ketupat di luar UPT (dengan garis putus-putus ke UPT induknya).
- Warna penanda = kondisi lapangan memakai warna status yang sudah ditetapkan (hijau, kuning, merah, kritis). Kegiatan yang belum diizinkan mulai hanya bergaris putih; tanpa sesi bergaris abu-abu putus-putus.
- Titik UPT awalnya perkiraan (pusat kabupaten/kota). Administrator memperbaikinya di menu UPT & Kanwil dengan menempel koordinat dari Google Maps.
- Lokasi kegiatan di luar UPT wajib diberi titik koordinat saat Operator mencatat lokasi.
- Peta dasar: CARTO Dark Matter (MapLibre GL), dengan ubin raster CARTO sebagai cadangan.
