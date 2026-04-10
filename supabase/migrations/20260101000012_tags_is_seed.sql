ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

-- Alle eksisterende tags er seed-tags
UPDATE tags SET is_seed = true;
