-- Allow authenticated users to read list_items from public lists.
-- Needed so the library page can count items per public list.
CREATE POLICY "list_items: public list select"
  ON list_items FOR SELECT
  USING (
    list_id IN (
      SELECT id FROM lists WHERE is_public = true
    )
  );
