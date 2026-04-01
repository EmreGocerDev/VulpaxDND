-- ============================================
-- DM STORY CARDS (Kopya Kartları)
-- Yol, Zindan, Arkadaşlık, Festival, Savaş vs.
-- ============================================

CREATE TABLE IF NOT EXISTS dm_story_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,        -- yol, zindan, arkadaslik, festival, savas, gizem, tuzak, ticaret
  subcategory TEXT DEFAULT '',   -- alt başlık
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  skill_check TEXT DEFAULT '',   -- örn: "d20 → 4+zeka" veya "d20 → 8+karizma"
  difficulty TEXT DEFAULT 'orta', -- kolay, orta, zor, efsanevi
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE dm_story_cards ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can read dm_story_cards"
  ON dm_story_cards FOR SELECT
  USING (true);

-- Only admin can insert/update/delete
CREATE POLICY "Admin can insert dm_story_cards"
  ON dm_story_cards FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE email = 'emregocernew@gmail.com')
  );

CREATE POLICY "Admin can update dm_story_cards"
  ON dm_story_cards FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE email = 'emregocernew@gmail.com')
  );

CREATE POLICY "Admin can delete dm_story_cards"
  ON dm_story_cards FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE email = 'emregocernew@gmail.com')
  );

-- Index for fast category lookup
CREATE INDEX IF NOT EXISTS idx_dm_story_cards_category ON dm_story_cards(category);
