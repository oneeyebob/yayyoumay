CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON app_settings FOR SELECT USING (true);
CREATE POLICY "service role write" ON app_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO app_settings (key, value) VALUES
  ('pause_video_url', 'https://www.youtube.com/watch?v=THnF0IQ8JJM');
