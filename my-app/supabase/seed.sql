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
