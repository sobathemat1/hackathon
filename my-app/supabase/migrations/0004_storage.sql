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
