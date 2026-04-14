ALTER TABLE screen_timers ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;
ALTER TABLE screen_timers ADD COLUMN IF NOT EXISTS frozen_seconds_remaining INTEGER;
