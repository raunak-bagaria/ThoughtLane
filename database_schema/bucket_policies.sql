CREATE POLICY "Public Access To Media Bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ThoughtLane_Media' );