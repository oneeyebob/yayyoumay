-- Add username and hotkey_hash to user_settings.
-- username: the user-chosen login name; used to derive the fake Supabase auth
--           email ({username}@yayyoumay.local). Unique so no two accounts share
--           a name. Nullable so existing rows (created before this migration)
--           are not broken.
-- hotkey_hash: bcrypt hash of the one-time recovery key shown at registration.
--              The raw key is never stored — only the hash.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS username   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS hotkey_hash TEXT;
