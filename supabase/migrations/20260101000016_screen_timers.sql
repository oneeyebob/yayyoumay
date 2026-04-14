CREATE TABLE screen_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  auto_cancel_at TIMESTAMPTZ,
  pause_duration_minutes INTEGER NOT NULL DEFAULT 10,
  pause_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE screen_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON screen_timers USING (true) WITH CHECK (true);
