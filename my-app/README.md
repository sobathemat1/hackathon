# SIPESAT : Sistem Informasi Pelayanan Surat Terpadu

Platform terpusat pengajuan, verifikasi, pemrosesan, dan pengarsipan surat administrasi organisasi mahasiswa dan Unit Layanan Terpadu (ULT) berbasis **Next.js 16 (App Router)** dan **Supabase (PostgreSQL + RLS + Private Storage)**.

## 1. Kredensial & Environment Variables (`.env.local`)

File `.env.local` sudah dikonfigurasi dengan kredensial project Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vbdekvixsfrvfoxblpdw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Cpj5BKa3Pzx9gU0noYqbEA_MQfefdza
SUPABASE_SERVICE_ROLE_KEY=sb_publishable_Cpj5BKa3Pzx9gU0noYqbEA_MQfefdza
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=submission-files
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
HEALTHCHECK_SECRET=sipas-keepalive-secret-2026
```

## 2. Setup Database & Storage Bucket di Supabase

Untuk mengaktifkan seluruh tabel, fungsi atomik (`generate_submission_number`), RLS policies, bucket `submission-files`, dan data seed awal di Supabase:

1. Buka **Supabase Dashboard** → **SQL Editor**.
2. Salin seluruh isi file [`supabase/full_setup.sql`](./supabase/full_setup.sql) lalu klik **Run**.
   - Skrip ini secara otomatis membuat tabel (`organizations`, `users`, `letter_types`, `submission_counters`, `submissions`, `submission_documents`, `submission_histories`, `notifications`, `audit_logs`, `system_settings`), fungsi RPC, bucket storage `submission-files` (batas 5 MB, format PDF/DOCX/JPG/PNG), beserta policy aksesnya.

## 3. Menjalankan Aplikasi

Pastikan menggunakan **Node.js ≥ 20.9** (sudah diset ke **v22.23.4**):

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.
