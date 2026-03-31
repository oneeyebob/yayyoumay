-- ============================================================
-- Initial schema
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- One row per person in the household, linked to auth.users.
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#000000',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner select"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles: owner delete"
  ON profiles FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- user_settings
-- Stores curator PIN hash and other per-user settings.
-- ------------------------------------------------------------
CREATE TABLE user_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  curator_pin_hash TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings: owner select"
  ON user_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_settings: owner insert"
  ON user_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings: owner update"
  ON user_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings: owner delete"
  ON user_settings FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- channels
-- YouTube channels that have been added to any list.
-- ------------------------------------------------------------
CREATE TABLE channels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yt_channel_id  TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  lang           TEXT,
  thumbnail_url  TEXT,
  last_synced    TIMESTAMPTZ
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Channels are read-only reference data — anyone authenticated can read
CREATE POLICY "channels: authenticated select"
  ON channels FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- videos
-- YouTube videos belonging to a channel.
-- ------------------------------------------------------------
CREATE TABLE videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id       UUID NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
  yt_video_id      TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  published_at     TIMESTAMPTZ
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos: authenticated select"
  ON videos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- lists
-- Curated lists owned by a profile.
-- ------------------------------------------------------------
CREATE TABLE lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  lang_filter TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Owner has full access; others can read public lists
CREATE POLICY "lists: owner select"
  ON lists FOR SELECT
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_public = true
  );

CREATE POLICY "lists: owner insert"
  ON lists FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "lists: owner update"
  ON lists FOR UPDATE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "lists: owner delete"
  ON lists FOR DELETE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ------------------------------------------------------------
-- list_items
-- Individual channel or video entries within a list.
-- ------------------------------------------------------------
CREATE TABLE list_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    UUID NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels (id) ON DELETE SET NULL,
  video_id   UUID REFERENCES videos (id) ON DELETE SET NULL,
  status     TEXT NOT NULL CHECK (status IN ('yay', 'nay')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT list_items_channel_or_video CHECK (
    (channel_id IS NOT NULL AND video_id IS NULL)
    OR (channel_id IS NULL AND video_id IS NOT NULL)
  )
);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_items: owner select"
  ON list_items FOR SELECT
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "list_items: owner insert"
  ON list_items FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "list_items: owner update"
  ON list_items FOR UPDATE
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "list_items: owner delete"
  ON list_items FOR DELETE
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- tags
-- Taxonomy tags (e.g. subject, age group) with bilingual labels.
-- ------------------------------------------------------------
CREATE TABLE tags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug      TEXT NOT NULL UNIQUE,
  category  TEXT,
  label_da  TEXT,
  label_en  TEXT
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: authenticated select"
  ON tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- list_item_tags
-- Many-to-many join between list_items and tags.
-- ------------------------------------------------------------
CREATE TABLE list_item_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_item_id UUID NOT NULL REFERENCES list_items (id) ON DELETE CASCADE,
  tag_id       UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  UNIQUE (list_item_id, tag_id)
);

ALTER TABLE list_item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_item_tags: owner select"
  ON list_item_tags FOR SELECT
  USING (
    list_item_id IN (
      SELECT li.id FROM list_items li
      JOIN lists l ON l.id = li.list_id
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "list_item_tags: owner insert"
  ON list_item_tags FOR INSERT
  WITH CHECK (
    list_item_id IN (
      SELECT li.id FROM list_items li
      JOIN lists l ON l.id = li.list_id
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "list_item_tags: owner delete"
  ON list_item_tags FOR DELETE
  USING (
    list_item_id IN (
      SELECT li.id FROM list_items li
      JOIN lists l ON l.id = li.list_id
      JOIN profiles p ON p.id = l.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- list_follows
-- Users following public lists curated by others.
-- ------------------------------------------------------------
CREATE TABLE list_follows (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  list_id          UUID NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_user_id, list_id)
);

ALTER TABLE list_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_follows: owner select"
  ON list_follows FOR SELECT
  USING (follower_user_id = auth.uid());

CREATE POLICY "list_follows: owner insert"
  ON list_follows FOR INSERT
  WITH CHECK (follower_user_id = auth.uid());

CREATE POLICY "list_follows: owner delete"
  ON list_follows FOR DELETE
  USING (follower_user_id = auth.uid());

-- ------------------------------------------------------------
-- community_votes
-- Approve/reject votes on public lists.
-- ------------------------------------------------------------
CREATE TABLE community_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  list_id       UUID NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  vote          TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voter_user_id, list_id)
);

ALTER TABLE community_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_votes: owner select"
  ON community_votes FOR SELECT
  USING (voter_user_id = auth.uid());

CREATE POLICY "community_votes: owner insert"
  ON community_votes FOR INSERT
  WITH CHECK (voter_user_id = auth.uid());

CREATE POLICY "community_votes: owner update"
  ON community_votes FOR UPDATE
  USING (voter_user_id = auth.uid())
  WITH CHECK (voter_user_id = auth.uid());

CREATE POLICY "community_votes: owner delete"
  ON community_votes FOR DELETE
  USING (voter_user_id = auth.uid());
