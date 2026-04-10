CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Kun super admin må læse og skrive
CREATE POLICY "super admin only" ON admin_users
  USING (
    auth.uid() = 'c0e3d233-4c33-4bd9-98b3-4625a9b731a3'
  );

-- Indsæt Jakob som super admin
INSERT INTO admin_users (user_id, role)
VALUES ('c0e3d233-4c33-4bd9-98b3-4625a9b731a3', 'super_admin');
