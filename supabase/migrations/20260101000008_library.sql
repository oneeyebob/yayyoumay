-- is_public and public read policy already exist on lists table.

-- Subscriptions: which users subscribe to which public lists
CREATE TABLE list_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscriber_user_id, list_id)
);
ALTER TABLE list_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON list_subscriptions
  FOR ALL TO authenticated
  USING (subscriber_user_id = auth.uid())
  WITH CHECK (subscriber_user_id = auth.uid());

-- Mark YayYouMay account's lists as public
UPDATE lists SET is_public = true
  WHERE profile_id IN (
    SELECT id FROM profiles WHERE user_id = 'c0e3d233-4c33-4bd9-98b3-4625a9b731a3'
  );
