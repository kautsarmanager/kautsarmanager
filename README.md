# Manager — Personal Management System

React 19 + TypeScript + Vite + Tailwind 4 + Supabase (Auth, Postgres+RLS, Storage, Realtime). PWA, offline-first dengan antrean sinkronisasi.

## Mulai cepat
```bash
cp .env.example .env.local      # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm ci
npm run lint && npm run build
npm run dev                     # http://localhost:3000
```
Database: jalankan `supabase_schema.sql` (baru) atau migrasi di `supabase/migrations/` (existing) di Supabase SQL Editor **sebelum** deploy.

## Dokumen
- `docs/LAPORAN_BUG_DAN_KEAMANAN.md` — temuan, perbaikan, batasan, apa yang belum terverifikasi.
- `docs/SINKRONISASI_PLATFORM.md` — langkah sinkronisasi Web/PWA/Android/iOS/desktop/integrasi lain.

## Aturan keamanan
- Hanya anon/publishable key di frontend. **Jangan pernah** `service_role`. `.env.local` tidak boleh di-commit.
- Jalankan `npm run audit:prod` sebelum rilis. Pasang header di `public/_headers` (CSP, HSTS).
- PIN kunci aplikasi diverifikasi di server, tetapi tetap hanya kunci kenyamanan; jaga password akun.
