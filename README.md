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
| Operator UPT | `/` dan `/kegiatan` |
| Kepala Pengamanan | `/` dan `/keputusan` |
| Pengawal | `/lapangan` dan `/lapangan/[sessionId]/entri` |

Pembatas halaman ada di `src/middleware.ts` dan `src/lib/rbac.ts`. Pembatas itu hanya memudahkan tampilan. Penjaga data yang sebenarnya adalah aturan RLS di database (`01-skema-pas-siaga-pangan.sql`).

## Tahap pengembangan

- Fase 1: skema database, RLS, penyimpanan berkas (selesai)
- Fase 2: kerangka aplikasi, login, pembatas peran (ini)
- Fase 3: server actions (sesi harian, entri lapangan, keputusan, penutupan)
- Fase 4: dasbor realtime dan antarmuka Pengawal mobile
