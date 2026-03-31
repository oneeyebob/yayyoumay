-- Allow authenticated users to insert/update channels and videos.
-- These are shared reference data populated from the YouTube API —
-- any signed-in user should be able to add or refresh them.

CREATE POLICY "channels: authenticated insert"
  ON channels FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "channels: authenticated update"
  ON channels FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "videos: authenticated insert"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "videos: authenticated update"
  ON videos FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
