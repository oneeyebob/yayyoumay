CREATE TABLE list_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(list_id, tag_id)
);

ALTER TABLE list_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can manage list_tags" ON list_tags
  USING (true) WITH CHECK (true);
