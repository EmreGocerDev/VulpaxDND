-- ============================================================
-- VULPAX DND – Karakter Zeka & Karizma Sütunları
-- characters tablosuna yeni info sütunları ekler (oyun mekaniğini etkilemez)
-- ============================================================

-- Zeka sütunu
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'intelligence'
  ) THEN
    ALTER TABLE public.characters ADD COLUMN intelligence INTEGER NOT NULL DEFAULT 10;
  END IF;
END $$;

-- Karizma sütunu
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'charisma'
  ) THEN
    ALTER TABLE public.characters ADD COLUMN charisma INTEGER NOT NULL DEFAULT 10;
  END IF;
END $$;

-- Mevcut karakterlere rastgele değerler ata
UPDATE public.characters SET
  intelligence = CASE
    WHEN rarity = 'common' THEN 8 + floor(random() * 5)::int
    WHEN rarity = 'uncommon' THEN 10 + floor(random() * 5)::int
    WHEN rarity = 'rare' THEN 12 + floor(random() * 5)::int
    WHEN rarity = 'epic' THEN 14 + floor(random() * 5)::int
    WHEN rarity = 'legendary' THEN 16 + floor(random() * 5)::int
    ELSE 10
  END,
  charisma = CASE
    WHEN rarity = 'common' THEN 8 + floor(random() * 5)::int
    WHEN rarity = 'uncommon' THEN 10 + floor(random() * 5)::int
    WHEN rarity = 'rare' THEN 12 + floor(random() * 5)::int
    WHEN rarity = 'epic' THEN 14 + floor(random() * 5)::int
    WHEN rarity = 'legendary' THEN 16 + floor(random() * 5)::int
    ELSE 10
  END
WHERE intelligence = 10 AND charisma = 10;
