-- Allow authenticated users to upload and re-upload their own agreement signature.
-- File path format within bucket: {project_id}/{user_id}.png
-- Uses split_part instead of storage.filename() for broader compatibility.

DROP POLICY IF EXISTS "users upload own agreement" ON storage.objects;
DROP POLICY IF EXISTS "users update own agreement" ON storage.objects;

CREATE POLICY "users upload own agreement" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'agreements'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text || '.png'
);

CREATE POLICY "users update own agreement" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'agreements'
  AND split_part(name, '/', 2) = auth.uid()::text || '.png'
);