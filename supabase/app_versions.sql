-- ============================================
-- APP VERSIONS TABLE (Sürüm Yönetimi)
-- ============================================

CREATE TABLE IF NOT EXISTS app_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  release_notes TEXT NOT NULL DEFAULT '',
  download_url TEXT DEFAULT '',
  published_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can read versions
CREATE POLICY "Anyone can read versions"
  ON app_versions FOR SELECT
  USING (true);

-- Only admin can insert/update
CREATE POLICY "Admin can insert versions"
  ON app_versions FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'emregocernew@gmail.com'
    )
  );

CREATE POLICY "Admin can update versions"
  ON app_versions FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'emregocernew@gmail.com'
    )
  );
