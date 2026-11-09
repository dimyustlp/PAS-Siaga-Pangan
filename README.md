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
| Administrator | `/` (baca semua data; kelola akun dan data induk, tanpa ikut memutus) |
| Operator UPT | `/` dan `/kegiatan` |
| Kepala Pengamanan | `/` dan `/keputusan` |
| Pengawal | `/lapangan` dan `/lapangan/[sessionId]/entri` |

Pembatas halaman ada di `src/middleware.ts` dan `src/lib/rbac.ts`. Pembatas itu hanya memudahkan tampilan. Penjaga data yang sebenarnya adalah aturan RLS di database (`01-skema-pas-siaga-pangan.sql`, ditambah `02-peran-administrator.sql`).

## Tahap pengembangan

- Fase 1: skema database, RLS, penyimpanan berkas (selesai)
- Fase 2: kerangka aplikasi, login, pembatas peran (selesai)
- Fase 3: server actions dan lapisan data (selesai, lihat di bawah)
- Fase 4: dasbor realtime dan antarmuka Pengawal mobile

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

