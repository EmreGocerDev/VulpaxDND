-- ============================================
-- LORE SYSTEM — Hikayeler, Karakter Hikayeleri, Bölgeler
-- Run this in Supabase SQL Editor
-- Admin email: emregocernew@gmail.com
-- ============================================

-- ============================================
-- 1) ADD region COLUMN TO characters TABLE
-- ============================================
ALTER TABLE characters ADD COLUMN IF NOT EXISTS region TEXT DEFAULT NULL;

-- ============================================
-- 2) LORE_STORIES — Admin tarafından yazılan ana hikayeler
-- ============================================
CREATE TABLE IF NOT EXISTS public.lore_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3) CHARACTER_STORIES — Her karaktere özel hikaye
-- ============================================
CREATE TABLE IF NOT EXISTS public.character_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id)
);

-- ============================================
-- 4) RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE lore_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_stories ENABLE ROW LEVEL SECURITY;

-- Everyone can read lore
CREATE POLICY IF NOT EXISTS "lore_stories_select_all"
  ON lore_stories FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "character_stories_select_all"
  ON character_stories FOR SELECT
  USING (true);

-- Admin can INSERT lore_stories
CREATE POLICY IF NOT EXISTS "lore_stories_insert_admin"
  ON lore_stories FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can UPDATE lore_stories
CREATE POLICY IF NOT EXISTS "lore_stories_update_admin"
  ON lore_stories FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can DELETE lore_stories
CREATE POLICY IF NOT EXISTS "lore_stories_delete_admin"
  ON lore_stories FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can INSERT character_stories
CREATE POLICY IF NOT EXISTS "character_stories_insert_admin"
  ON character_stories FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can UPDATE character_stories
CREATE POLICY IF NOT EXISTS "character_stories_update_admin"
  ON character_stories FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Admin can DELETE character_stories
CREATE POLICY IF NOT EXISTS "character_stories_delete_admin"
  ON character_stories FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );
