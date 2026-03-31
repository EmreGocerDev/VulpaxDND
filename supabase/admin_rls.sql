-- ============================================
-- Admin RLS Policies for characters, powers, titles tables
-- Run this in Supabase SQL Editor
-- Admin email: emregocernew@gmail.com
-- ============================================

-- Enable RLS on tables (if not already)
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE powers ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CHARACTERS TABLE
-- ============================================

-- Everyone can read characters
CREATE POLICY IF NOT EXISTS "characters_select_all"
  ON characters FOR SELECT
  USING (true);

-- Admin can insert characters
CREATE POLICY IF NOT EXISTS "characters_insert_admin"
  ON characters FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can update characters
CREATE POLICY IF NOT EXISTS "characters_update_admin"
  ON characters FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can delete characters
CREATE POLICY IF NOT EXISTS "characters_delete_admin"
  ON characters FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- ============================================
-- POWERS TABLE
-- ============================================

-- Everyone can read powers
CREATE POLICY IF NOT EXISTS "powers_select_all"
  ON powers FOR SELECT
  USING (true);

-- Admin can insert powers
CREATE POLICY IF NOT EXISTS "powers_insert_admin"
  ON powers FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can update powers
CREATE POLICY IF NOT EXISTS "powers_update_admin"
  ON powers FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can delete powers
CREATE POLICY IF NOT EXISTS "powers_delete_admin"
  ON powers FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- ============================================
-- TITLES TABLE
-- ============================================

-- Everyone can read titles
CREATE POLICY IF NOT EXISTS "titles_select_all"
  ON titles FOR SELECT
  USING (true);

-- Admin can insert titles
CREATE POLICY IF NOT EXISTS "titles_insert_admin"
  ON titles FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can update titles
CREATE POLICY IF NOT EXISTS "titles_update_admin"
  ON titles FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can delete titles
CREATE POLICY IF NOT EXISTS "titles_delete_admin"
  ON titles FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );
