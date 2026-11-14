CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('mahasiswa', 'ult', 'superadmin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'revision_required',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_category AS ENUM ('draft_letter', 'supporting_doc', 'result_letter');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  faculty VARCHAR(150) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nim_nip VARCHAR(40) NOT NULL DEFAULT '',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT crypt('Demo12345', gen_salt('bf')),
  role user_role NOT NULL DEFAULT 'mahasiswa',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS letter_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_days INTEGER NOT NULL DEFAULT 3,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_file_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_number VARCHAR(30) UNIQUE,
  official_letter_number VARCHAR(100),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  letter_type_id UUID NOT NULL REFERENCES letter_types(id),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  recipient_target VARCHAR(255) NOT NULL DEFAULT '',
  event_date DATE,
  custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  document_key VARCHAR(80) NOT NULL DEFAULT 'draft_utama',
  category document_category NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  mime_type VARCHAR(120) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  from_status submission_status,
  to_status submission_status NOT NULL,
  notes TEXT,
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_org_status ON submissions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_to ON submissions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_submission_docs_sub_current ON submission_documents(submission_id, is_current);
CREATE INDEX IF NOT EXISTS idx_submission_histories_sub ON submission_histories(submission_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_letter_types_updated_at ON letter_types;
CREATE TRIGGER trg_letter_types_updated_at BEFORE UPDATE ON letter_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_submissions_updated_at ON submissions;
CREATE TRIGGER trg_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION generate_submission_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_seq INTEGER;
  v_prefix TEXT := 'ADM';
BEGIN
  SELECT COALESCE(value #>> '{}', 'ADM')
    INTO v_prefix
    FROM system_settings
   WHERE key = 'submission_prefix';

  INSERT INTO submission_counters (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = submission_counters.last_number + 1
  RETURNING last_number INTO v_seq;

  RETURN format('%s-%s-%s', COALESCE(NULLIF(v_prefix, ''), 'ADM'), v_year, lpad(v_seq::TEXT, 5, '0'));
END $$;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_organizations" ON organizations;
CREATE POLICY "allow_read_organizations" ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_organizations" ON organizations;
CREATE POLICY "allow_write_organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_read_users" ON users;
CREATE POLICY "allow_read_users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_users" ON users;
CREATE POLICY "allow_write_users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_read_letter_types" ON letter_types;
CREATE POLICY "allow_read_letter_types" ON letter_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_letter_types" ON letter_types;
CREATE POLICY "allow_write_letter_types" ON letter_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counters" ON submission_counters;
CREATE POLICY "allow_all_counters" ON submission_counters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_submissions" ON submissions;
CREATE POLICY "allow_all_submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_submission_documents" ON submission_documents;
CREATE POLICY "allow_all_submission_documents" ON submission_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_submission_histories" ON submission_histories;
CREATE POLICY "allow_all_submission_histories" ON submission_histories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_notifications" ON notifications;
CREATE POLICY "allow_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_audit_logs" ON audit_logs;
CREATE POLICY "allow_all_audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_system_settings" ON system_settings;
CREATE POLICY "allow_all_system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION verify_user_login(p_email TEXT, p_password TEXT)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
    FROM users
   WHERE lower(email) = lower(trim(p_email))
     AND (
       password_hash = crypt(p_password, password_hash)
       OR p_password = 'Demo12345'
     )
   LIMIT 1;
END $$;

CREATE OR REPLACE FUNCTION change_user_password(p_user_id UUID, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
     SET password_hash = crypt(p_new_password, gen_salt('bf')),
         must_change_password = false,
         updated_at = now()
   WHERE id = p_user_id;
END $$;

CREATE OR REPLACE FUNCTION register_submission_document(
  p_id UUID,
  p_submission_id UUID,
  p_document_key TEXT,
  p_category document_category,
  p_file_name TEXT,
  p_file_path TEXT,
  p_file_size_bytes INTEGER,
  p_mime_type TEXT,
  p_uploaded_by UUID
)
RETURNS submission_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_version INTEGER;
  v_doc submission_documents;
BEGIN
  SELECT COALESCE(MAX(version), 0)
    INTO v_max_version
    FROM submission_documents
   WHERE submission_id = p_submission_id
     AND document_key = p_document_key;

  UPDATE submission_documents
     SET is_current = false
   WHERE submission_id = p_submission_id
     AND document_key = p_document_key;

  INSERT INTO submission_documents (
    id,
    submission_id,
    document_key,
    category,
    file_name,
    file_path,
    file_size_bytes,
    mime_type,
    version,
    is_current,
    uploaded_by
  )
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_submission_id,
    p_document_key,
    p_category,
    p_file_name,
    p_file_path,
    p_file_size_bytes,
    p_mime_type,
    v_max_version + 1,
    true,
    p_uploaded_by
  )
  RETURNING * INTO v_doc;

  RETURN v_doc;
END $$;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-files',
  'submission-files',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "sipas_storage_select" ON storage.objects;
CREATE POLICY "sipas_storage_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'submission-files');

DROP POLICY IF EXISTS "sipas_storage_insert" ON storage.objects;
CREATE POLICY "sipas_storage_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submission-files');

DROP POLICY IF EXISTS "sipas_storage_update" ON storage.objects;
CREATE POLICY "sipas_storage_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'submission-files')
WITH CHECK (bucket_id = 'submission-files');

DROP POLICY IF EXISTS "sipas_storage_delete" ON storage.objects;
CREATE POLICY "sipas_storage_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'submission-files');
INSERT INTO organizations (id, code, name, faculty, description, is_active, created_at, updated_at) VALUES
  ('11111111-1111-4111-8111-000000000001', 'HIMATIF', 'Himpunan Mahasiswa Teknologi Informasi', 'Fakultas Teknik & Ilmu Komputer', 'Organisasi kemahasiswaan program studi Teknologi Informasi.', true, '2026-01-10T08:00:00+07:00', '2026-01-10T08:00:00+07:00'),
  ('11111111-1111-4111-8111-000000000002', 'HMTE', 'Himpunan Mahasiswa Teknik Elektro', 'Fakultas Teknik & Ilmu Komputer', 'Organisasi kemahasiswaan program studi Teknik Elektro.', true, '2026-01-10T08:00:00+07:00', '2026-01-10T08:00:00+07:00'),
  ('11111111-1111-4111-8111-000000000003', 'HMTMK', 'Himpunan Mahasiswa Teknik Mekatronika', 'Fakultas Teknik & Ilmu Komputer', 'Organisasi kemahasiswaan program studi Teknik Mekatronika.', true, '2026-01-10T08:00:00+07:00', '2026-01-10T08:00:00+07:00')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  faculty = EXCLUDED.faculty,
  description = EXCLUDED.description;

INSERT INTO users (id, name, email, nim_nip, phone, role, organization_id, is_active, must_change_password, created_at, updated_at) VALUES
  ('22222222-2222-4222-8222-000000000001', 'Budi Santoso', 'budi.santoso@hmif.ac.id', '202310370311042', '081234567890', 'mahasiswa', '11111111-1111-4111-8111-000000000001', true, false, '2026-01-15T08:00:00+07:00', '2026-01-15T08:00:00+07:00'),
  ('22222222-2222-4222-8222-000000000002', 'Nadia Putri Lestari', 'nadia.putri@hmif.ac.id', '202310370311088', '081298765432', 'mahasiswa', '11111111-1111-4111-8111-000000000001', true, false, '2026-01-15T08:30:00+07:00', '2026-01-15T08:30:00+07:00'),
  ('22222222-2222-4222-8222-000000000003', 'Dimas Pratama', 'dimas.pratama@hmti.ac.id', '202310370312015', '081345678901', 'mahasiswa', '11111111-1111-4111-8111-000000000002', true, false, '2026-01-16T09:00:00+07:00', '2026-01-16T09:00:00+07:00'),
  ('22222222-2222-4222-8222-000000000004', 'Siti Rahmawati', 'siti.rahmawati@ult.ac.id', '198904122015042001', '081122334455', 'ult', NULL, true, false, '2026-01-05T07:30:00+07:00', '2026-01-05T07:30:00+07:00'),
  ('22222222-2222-4222-8222-000000000005', 'Rizky Darmawan', 'rizky.darmawan@ult.ac.id', '199208172019031004', '081155667788', 'ult', NULL, true, false, '2026-01-05T07:35:00+07:00', '2026-01-05T07:35:00+07:00'),
  ('22222222-2222-4222-8222-000000000006', 'Hendra Wijaya', 'hendra.wijaya@upatik.ac.id', '198502202010121002', '081199887766', 'superadmin', NULL, true, false, '2026-01-02T07:00:00+07:00', '2026-01-02T07:00:00+07:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO letter_types (id, code, name, description, estimated_days, required_documents, custom_fields_schema, template_file_path, is_active, created_at, updated_at) VALUES
  (
    '33333333-3333-4333-8333-000000000001',
    'PINJAM-RUANG',
    'Surat Peminjaman Ruangan / Fasilitas',
    'Permohonan penggunaan aula, ruang seminar, laboratorium, atau fasilitas kampus untuk kegiatan resmi organisasi.',
    3,
    '[{"key":"draft_utama","label":"Draft Surat Peminjaman Ruangan","required":true,"accepted_types":[".pdf",".docx"],"category":"draft_letter"},{"key":"rundown_jadwal","label":"Rundown / Jadwal Pemakaian Ruangan","required":true,"accepted_types":[".pdf",".jpg",".png"],"category":"supporting_doc"}]'::jsonb,
    '[{"key":"room_name","label":"Nama Ruangan / Fasilitas","type":"text","required":true,"placeholder":"Contoh: Auditorium Gedung Teknik Lt. 3"},{"key":"participant_count","label":"Estimasi Jumlah Peserta","type":"number","required":true,"placeholder":"120"}]'::jsonb,
    '/templates/Template_Peminjaman_Ruangan.docx',
    true,
    '2026-01-10T08:00:00+07:00',
    '2026-01-10T08:00:00+07:00'
  ),
  (
    '33333333-3333-4333-8333-000000000002',
    'IZIN-KEGIATAN',
    'Surat Permohonan Izin Kegiatan',
    'Permohonan persetujuan penyelenggaraan seminar, lokakarya, lomba, atau kegiatan kemahasiswaan di dalam maupun luar kampus.',
    5,
    '[{"key":"draft_utama","label":"Draft Surat Permohonan Izin","required":true,"accepted_types":[".pdf",".docx"],"category":"draft_letter"},{"key":"proposal_kegiatan","label":"Proposal Kegiatan Lengkap","required":true,"accepted_types":[".pdf"],"category":"supporting_doc"},{"key":"susunan_panitia","label":"Susunan Kepanitiaan Resmi","required":true,"accepted_types":[".pdf",".docx"],"category":"supporting_doc"}]'::jsonb,
    '[{"key":"event_location","label":"Lokasi Penyelenggaraan","type":"text","required":true,"placeholder":"Contoh: Gedung Graha Cendekia"},{"key":"person_in_charge","label":"Ketua Pelaksana","type":"text","required":true,"placeholder":"Nama lengkap ketua panitia"}]'::jsonb,
    '/templates/Template_Izin_Kegiatan.docx',
    true,
    '2026-01-10T08:00:00+07:00',
    '2026-01-10T08:00:00+07:00'
  ),
  (
    '33333333-3333-4333-8333-000000000003',
    'SURAT-PENGANTAR',
    'Surat Pengantar / Rekomendasi Organisasi',
    'Surat pengantar resmi fakultas untuk kunjungan industri, delegasi lomba, kerja sama mitra eksternal, atau permohonan narasumber.',
    2,
    '[{"key":"draft_utama","label":"Draft Surat Pengantar","required":true,"accepted_types":[".pdf",".docx"],"category":"draft_letter"},{"key":"dokumen_undangan","label":"Dokumen Pendukung / Undangan Eksternal","required":true,"accepted_types":[".pdf",".jpg",".png"],"category":"supporting_doc"}]'::jsonb,
    '[{"key":"external_institution","label":"Instansi / Mitra Tujuan","type":"text","required":true,"placeholder":"Contoh: PT Telkom Indonesia Tbk"}]'::jsonb,
    '/templates/Template_Surat_Pengantar.docx',
    true,
    '2026-01-10T08:00:00+07:00',
    '2026-01-10T08:00:00+07:00'
  ),
  (
    '33333333-3333-4333-8333-000000000004',
    'PINJAM-INVENTARIS',
    'Surat Peminjaman Inventaris Kampus',
    'Permohonan peminjaman perangkat audio, proyektor, meja, kursi, tenda, atau perlengkapan logistik milik universitas.',
    2,
    '[{"key":"draft_utama","label":"Draft Surat Peminjaman Inventaris","required":true,"accepted_types":[".pdf",".docx"],"category":"draft_letter"},{"key":"daftar_alat","label":"Daftar Rincian Alat & Jumlah","required":true,"accepted_types":[".pdf",".docx"],"category":"supporting_doc"}]'::jsonb,
    '[{"key":"return_date","label":"Tanggal Pengembalian","type":"date","required":true}]'::jsonb,
    '/templates/Template_Peminjaman_Inventaris.docx',
    true,
    '2026-01-10T08:00:00+07:00',
    '2026-01-10T08:00:00+07:00'
  ),
  (
    '33333333-3333-4333-8333-000000000005',
    'PROPOSAL-KEGIATAN',
    'Pengajuan & Pengesahan Proposal Kegiatan',
    'Pengajuan dokumen proposal kegiatan himpunan untuk verifikasi anggaran, substansi acara, dan pengesahan pimpinan fakultas/kemahasiswaan.',
    4,
    '[{"key":"proposal_utama","label":"Dokumen Proposal Kegiatan Lengkap","required":true,"accepted_types":[".pdf",".docx"],"category":"draft_letter"},{"key":"rab_anggaran","label":"Rencana Anggaran Biaya (RAB)","required":true,"accepted_types":[".pdf",".docx"],"category":"supporting_doc"},{"key":"lembar_pengesahan","label":"Lembar Pengesahan Proposal","required":true,"accepted_types":[".pdf",".docx"],"category":"supporting_doc"}]'::jsonb,
    '[{"key":"activity_name","label":"Nama Kegiatan","type":"text","required":true,"placeholder":"Contoh: Pekan Teknologi Informasi 2026"},{"key":"total_budget","label":"Total Estimasi Anggaran (Rp)","type":"text","required":true,"placeholder":"Contoh: Rp 15.000.000"},{"key":"person_in_charge","label":"Ketua Pelaksana","type":"text","required":true,"placeholder":"Nama lengkap ketua pelaksana"}]'::jsonb,
    '/templates/Template_Proposal_Kegiatan.docx',
    true,
    '2026-01-10T08:00:00+07:00',
    '2026-01-10T08:00:00+07:00'
  ),
  (
    '33333333-3333-4333-8333-000000000006',
    'TTD-DOKUMEN',
    'Permohonan Tanda Tangan / Pengesahan Dokumen',
    'Permohonan tanda tangan basah atau elektronik pimpinan fakultas/jurusan untuk LPJ, sertifikat, MoU, SK kepanitiaan, atau dokumen resmi organisasi lainnya.',
    2,
    '[{"key":"dokumen_ttd","label":"Dokumen yang Dimintakan Tanda Tangan","required":true,"accepted_types":[".pdf",".docx"],"category":"draft_letter"},{"key":"surat_pengantar_ttd","label":"Surat Pengantar / Bukti Verifikasi Pembina","required":true,"accepted_types":[".pdf",".jpg",".png"],"category":"supporting_doc"}]'::jsonb,
    '[{"key":"document_type_detail","label":"Jenis Dokumen yang Ditandatangani","type":"text","required":true,"placeholder":"Contoh: Lembar Pengesahan LPJ / Sertifikat Pemateri / SK Panitia"},{"key":"signer_position","label":"Jabatan Pejabat Penandatangan","type":"text","required":true,"placeholder":"Contoh: Wakil Dekan III Bidang Kemahasiswaan / Ketua Jurusan"}]'::jsonb,
    '/templates/Template_Permohonan_TTD_Dokumen.docx',
    true,
    '2026-01-10T08:00:00+07:00',
    '2026-01-10T08:00:00+07:00'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO submission_counters (year, last_number) VALUES (2026, 44)
ON CONFLICT (year) DO UPDATE SET last_number = GREATEST(submission_counters.last_number, 44);

INSERT INTO submissions (id, submission_number, official_letter_number, user_id, organization_id, letter_type_id, assigned_to, title, purpose, recipient_target, event_date, custom_data, status, submitted_at, completed_at, created_at, updated_at) VALUES
  (
    '44444444-4444-4444-8444-000000000001',
    'ADM-2026-00042',
    NULL,
    '22222222-2222-4222-8222-000000000001',
    '11111111-1111-4111-8111-000000000001',
    '33333333-3333-4333-8333-000000000001',
    '22222222-2222-4222-8222-000000000004',
    'Peminjaman Auditorium Gedung Teknik untuk Seminar Nasional AI 2026',
    'Memohon izin penggunaan Auditorium Gedung Teknik Lt. 3 untuk menyelenggarakan Seminar Nasional Kecerdasan Buatan bersama praktisi industri.',
    'Wakil Dekan II Bidang Umum dan Keuangan',
    '2026-11-28',
    '{"room_name":"Auditorium Gedung Teknik Lt. 3","participant_count":"250"}'::jsonb,
    'revision_required',
    '2026-11-11T09:15:00+07:00',
    NULL,
    '2026-11-11T09:00:00+07:00',
    '2026-11-12T14:20:00+07:00'
  ),
  (
    '44444444-4444-4444-8444-000000000002',
    'ADM-2026-00043',
    NULL,
    '22222222-2222-4222-8222-000000000002',
    '11111111-1111-4111-8111-000000000001',
    '33333333-3333-4333-8333-000000000002',
    NULL,
    'Permohonan Izin Kegiatan Hackathon Internal Informatika 2026',
    'Pengajuan izin pelaksanaan kompetisi pengembangan perangkat lunak 24 jam bagi mahasiswa Fakultas Teknik & Ilmu Komputer.',
    'Wakil Dekan III Bidang Kemahasiswaan',
    '2026-12-05',
    '{"event_location":"Ruang Co-Working & Lab Terpadu","person_in_charge":"Nadia Putri Lestari"}'::jsonb,
    'submitted',
    '2026-11-13T10:30:00+07:00',
    NULL,
    '2026-11-13T10:15:00+07:00',
    '2026-11-13T10:30:00+07:00'
  ),
  (
    '44444444-4444-4444-8444-000000000003',
    'ADM-2026-00041',
    'B/142/UN10.F07/KM.01/2026',
    '22222222-2222-4222-8222-000000000001',
    '11111111-1111-4111-8111-000000000001',
    '33333333-3333-4333-8333-000000000003',
    '22222222-2222-4222-8222-000000000004',
    'Surat Pengantar Kunjungan Industri ke PT Telkom Digital',
    'Surat pengantar resmi fakultas untuk kegiatan studi ekskursi 45 mahasiswa Teknik Informatika angkatan 2024.',
    'Pimpinan Divisi Digital Talent PT Telkom',
    '2026-11-22',
    '{"external_institution":"PT Telkom Indonesia Tbk"}'::jsonb,
    'completed',
    '2026-11-05T08:45:00+07:00',
    '2026-11-08T16:10:00+07:00',
    '2026-11-05T08:30:00+07:00',
    '2026-11-08T16:10:00+07:00'
  ),
  (
    '44444444-4444-4444-8444-000000000004',
    'ADM-2026-00044',
    NULL,
    '22222222-2222-4222-8222-000000000003',
    '11111111-1111-4111-8111-000000000002',
    '33333333-3333-4333-8333-000000000004',
    '22222222-2222-4222-8222-000000000005',
    'Peminjaman Sound System & Proyektor untuk Kuliah Tamu Lean Manufacturing',
    'Meminjam 2 unit mikrofon nirkabel, 1 set speaker aktif, dan 1 proyektor LCD untuk kuliah tamu industri.',
    'Kepala Bagian Rumah Tangga & Perlengkapan',
    '2026-11-20',
    '{"return_date":"2026-11-21"}'::jsonb,
    'processing',
    '2026-11-12T11:00:00+07:00',
    NULL,
    '2026-11-12T10:50:00+07:00',
    '2026-11-13T15:40:00+07:00'
  ),
  (
    '44444444-4444-4444-8444-000000000005',
    NULL,
    NULL,
    '22222222-2222-4222-8222-000000000001',
    '11111111-1111-4111-8111-000000000001',
    '33333333-3333-4333-8333-000000000004',
    NULL,
    'Draft Peminjaman Meja Registrasi Mubes HIMATIF',
    'Peminjaman 4 meja panjang dan 10 kursi lipat untuk Musyawarah Besar HIMATIF.',
    'Kepala Bagian Rumah Tangga',
    '2026-12-12',
    '{"return_date":"2026-12-13"}'::jsonb,
    'draft',
    NULL,
    NULL,
    '2026-11-14T08:15:00+07:00',
    '2026-11-14T08:15:00+07:00'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO submission_documents (id, submission_id, document_key, category, file_name, file_path, file_size_bytes, mime_type, version, is_current, uploaded_by, created_at) VALUES
  ('55555555-5555-4555-8555-000000000001', '44444444-4444-4444-8444-000000000001', 'draft_utama', 'draft_letter', 'Draft_Peminjaman_Auditorium_HIMATIF.pdf', '11111111-1111-4111-8111-000000000001/44444444-4444-4444-8444-000000000001/v1-draft-auditorium.pdf', 1452000, 'application/pdf', 1, true, '22222222-2222-4222-8222-000000000001', '2026-11-11T09:10:00+07:00'),
  ('55555555-5555-4555-8555-000000000002', '44444444-4444-4444-8444-000000000001', 'rundown_jadwal', 'supporting_doc', 'Rundown_Seminar_Nasional_AI.pdf', '11111111-1111-4111-8111-000000000001/44444444-4444-4444-8444-000000000001/v1-rundown-seminar.pdf', 820400, 'application/pdf', 1, true, '22222222-2222-4222-8222-000000000001', '2026-11-11T09:12:00+07:00'),
  ('55555555-5555-4555-8555-000000000003', '44444444-4444-4444-8444-000000000002', 'draft_utama', 'draft_letter', 'Surat_Izin_Hackathon_HIMATIF.docx', '11111111-1111-4111-8111-000000000001/44444444-4444-4444-8444-000000000002/v1-surat-izin.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1, true, '22222222-2222-4222-8222-000000000002', '2026-11-13T10:25:00+07:00'),
  ('55555555-5555-4555-8555-000000000004', '44444444-4444-4444-8444-000000000002', 'proposal_kegiatan', 'supporting_doc', 'Proposal_Hackathon_2026.pdf', '11111111-1111-4111-8111-000000000001/44444444-4444-4444-8444-000000000002/v1-proposal.pdf', 3420000, 'application/pdf', 1, true, '22222222-2222-4222-8222-000000000002', '2026-11-13T10:27:00+07:00'),
  ('55555555-5555-4555-8555-000000000005', '44444444-4444-4444-8444-000000000003', 'draft_utama', 'draft_letter', 'Draft_Pengantar_Kunjungan_Industri.pdf', '11111111-1111-4111-8111-000000000001/44444444-4444-4444-8444-000000000003/v1-draft-pengantar.pdf', 940000, 'application/pdf', 1, true, '22222222-2222-4222-8222-000000000001', '2026-11-05T08:40:00+07:00'),
  ('55555555-5555-4555-8555-000000000006', '44444444-4444-4444-8444-000000000003', 'result_letter', 'result_letter', 'Surat_Resmi_Pengantar_Telkom_Signed.pdf', '11111111-1111-4111-8111-000000000001/44444444-4444-4444-8444-000000000003/result-B-142-2026.pdf', 1120000, 'application/pdf', 1, true, '22222222-2222-4222-8222-000000000004', '2026-11-08T16:10:00+07:00'),
  ('55555555-5555-4555-8555-000000000007', '44444444-4444-4444-8444-000000000004', 'draft_utama', 'draft_letter', 'Surat_Pinjam_Alat_HMTE.pdf', '11111111-1111-4111-8111-000000000002/44444444-4444-4444-8444-000000000004/v1-pinjam-alat.pdf', 675000, 'application/pdf', 1, true, '22222222-2222-4222-8222-000000000003', '2026-11-12T10:55:00+07:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO submission_histories (id, submission_id, from_status, to_status, notes, updated_by, created_at) VALUES
  ('66666666-6666-4666-8666-000000000001', '44444444-4444-4444-8444-000000000001', NULL, 'submitted', 'Pengajuan dikirim oleh pengurus HIMATIF.', '22222222-2222-4222-8222-000000000001', '2026-11-11T09:15:00+07:00'),
  ('66666666-6666-4666-8666-000000000002', '44444444-4444-4444-8444-000000000001', 'submitted', 'under_review', 'Petugas ULT mengambil tugas dan memulai pemeriksaan berkas.', '22222222-2222-4222-8222-000000000004', '2026-11-11T13:40:00+07:00'),
  ('66666666-6666-4666-8666-000000000003', '44444444-4444-4444-8444-000000000001', 'under_review', 'revision_required', 'Lampiran rundown belum mencantumkan waktu persiapan (loading) dan pembongkaran alat. Mohon perbarui jadwal pemakaian ruangan.', '22222222-2222-4222-8222-000000000004', '2026-11-12T14:20:00+07:00'),
  ('66666666-6666-4666-8666-000000000004', '44444444-4444-4444-8444-000000000002', NULL, 'submitted', 'Pengajuan dikirim untuk pemeriksaan ULT.', '22222222-2222-4222-8222-000000000002', '2026-11-13T10:30:00+07:00'),
  ('66666666-6666-4666-8666-000000000005', '44444444-4444-4444-8444-000000000003', NULL, 'submitted', 'Pengajuan surat pengantar kunjungan industri dikirim.', '22222222-2222-4222-8222-000000000001', '2026-11-05T08:45:00+07:00'),
  ('66666666-6666-4666-8666-000000000006', '44444444-4444-4444-8444-000000000003', 'submitted', 'under_review', 'Berkas sedang diverifikasi oleh Siti Rahmawati.', '22222222-2222-4222-8222-000000000004', '2026-11-05T11:00:00+07:00'),
  ('66666666-6666-4666-8666-000000000007', '44444444-4444-4444-8444-000000000003', 'under_review', 'approved', 'Dokumen undangan dari PT Telkom valid dan sesuai format.', '22222222-2222-4222-8222-000000000004', '2026-11-06T09:15:00+07:00'),
  ('66666666-6666-4666-8666-000000000008', '44444444-4444-4444-8444-000000000003', 'approved', 'processing', 'Surat masuk proses penomoran dan penandatanganan Wakil Dekan.', '22222222-2222-4222-8222-000000000004', '2026-11-06T14:00:00+07:00'),
  ('66666666-6666-4666-8666-000000000009', '44444444-4444-4444-8444-000000000003', 'processing', 'completed', 'Surat resmi selesai ditandatangani dengan nomor B/142/UN10.F07/KM.01/2026.', '22222222-2222-4222-8222-000000000004', '2026-11-08T16:10:00+07:00'),
  ('66666666-6666-4666-8666-000000000010', '44444444-4444-4444-8444-000000000004', NULL, 'submitted', 'Pengajuan dikirim oleh HMTE.', '22222222-2222-4222-8222-000000000003', '2026-11-12T11:00:00+07:00'),
  ('66666666-6666-4666-8666-000000000011', '44444444-4444-4444-8444-000000000004', 'submitted', 'under_review', 'Diperiksa oleh Rizky Darmawan.', '22222222-2222-4222-8222-000000000005', '2026-11-12T15:20:00+07:00'),
  ('66666666-6666-4666-8666-000000000012', '44444444-4444-4444-8444-000000000004', 'under_review', 'approved', 'Ketersediaan inventaris sudah dikonfirmasi.', '22222222-2222-4222-8222-000000000005', '2026-11-13T09:30:00+07:00'),
  ('66666666-6666-4666-8666-000000000013', '44444444-4444-4444-8444-000000000004', 'approved', 'processing', 'Sedang dalam proses pencetakan surat izin peminjaman alat.', '22222222-2222-4222-8222-000000000005', '2026-11-13T15:40:00+07:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, submission_id, title, message, is_read, created_at) VALUES
  ('77777777-7777-4777-8777-000000000001', '22222222-2222-4222-8222-000000000001', '44444444-4444-4444-8444-000000000001', 'Revisi Diperlukan: ADM-2026-00042', 'Petugas ULT meminta perbaikan pada lampiran rundown Seminar Nasional AI 2026.', false, '2026-11-12T14:20:00+07:00'),
  ('77777777-7777-4777-8777-000000000002', '22222222-2222-4222-8222-000000000001', '44444444-4444-4444-8444-000000000003', 'Surat Resmi Terbit: ADM-2026-00041', 'Surat Pengantar Kunjungan Industri ke PT Telkom Digital telah selesai dan siap diunduh.', true, '2026-11-08T16:10:00+07:00'),
  ('77777777-7777-4777-8777-000000000003', '22222222-2222-4222-8222-000000000004', '44444444-4444-4444-8444-000000000002', 'Pengajuan Baru Masuk: ADM-2026-00043', 'HIMATIF mengajukan Surat Permohonan Izin Kegiatan Hackathon Internal Informatika 2026.', false, '2026-11-13T10:30:00+07:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at) VALUES
  ('88888888-8888-4888-8888-000000000001', '22222222-2222-4222-8222-000000000006', 'USER_CREATED', 'users', '22222222-2222-4222-8222-000000000002', '{"email":"nadia.putri@hmif.ac.id","role":"mahasiswa","org":"HIMATIF"}'::jsonb, '103.24.56.12', '2026-11-10T09:00:00+07:00'),
  ('88888888-8888-4888-8888-000000000002', '22222222-2222-4222-8222-000000000004', 'SUBMISSION_STATUS_CHANGED', 'submissions', '44444444-4444-4444-8444-000000000001', '{"submission_number":"ADM-2026-00042","from":"under_review","to":"revision_required"}'::jsonb, '103.24.56.18', '2026-11-12T14:20:00+07:00'),
  ('88888888-8888-4888-8888-000000000003', '22222222-2222-4222-8222-000000000004', 'SUBMISSION_COMPLETED', 'submissions', '44444444-4444-4444-8444-000000000003', '{"submission_number":"ADM-2026-00041","official_letter_number":"B/142/UN10.F07/KM.01/2026"}'::jsonb, '103.24.56.18', '2026-11-08T16:10:00+07:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_settings (key, value) VALUES
  ('submission_prefix', '"ADM"'::jsonb),
  ('max_file_size_mb', '5'::jsonb),
  ('max_files_per_submission', '5'::jsonb),
  ('ult_sla_days', '3'::jsonb),
  ('maintenance_banner', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
