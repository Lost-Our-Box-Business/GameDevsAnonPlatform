-- Allow authenticated users to upload and re-upload their own agreement signature.
-- File path format: {project_id}/{user_id}.png — user ID is embedded in the filename.

CREATE POLICY "users upload own agreement" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'agreements'
  AND auth.uid() IS NOT NULL
  AND replace(storage.filename(name), '.png', '')::uuid = auth.uid()
);

CREATE POLICY "users update own agreement" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'agreements'
  AND replace(storage.filename(name), '.png', '')::uuid = auth.uid()
);