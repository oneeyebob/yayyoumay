CREATE TABLE channel_cache (
  channel_id      UUID PRIMARY KEY REFERENCES channels (id) ON DELETE CASCADE,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE channel_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON channel_cache USING (false);
