CREATE POLICY "Authenticated users can upsert channel_cache"
ON channel_cache
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
