-- Add age_filter to lists.
-- Stored as a comma-separated string of slugs, e.g. "4-6,7-9".
-- Mirrors the lang_filter pattern already in use.

ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS age_filter TEXT;
