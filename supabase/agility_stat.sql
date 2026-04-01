-- ============================================================
-- ÇEVİKLİK (Agility) STAT EKLEMESİ
-- characters tablosuna çeviklik, room_members tablosuna agility_bonus
-- ============================================================

-- characters: çeviklik sütunu
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'agility'
  ) THEN
    ALTER TABLE public.characters ADD COLUMN agility INTEGER NOT NULL DEFAULT 10;
  END IF;
END $$;

-- room_members: agility_bonus sütunu
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_members' AND column_name = 'agility_bonus'
  ) THEN
    ALTER TABLE public.room_members ADD COLUMN agility_bonus INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Mevcut karakterlere rarity'ye göre rastgele çeviklik ata
UPDATE public.characters SET
  agility = CASE
    WHEN rarity = 'common' THEN 8 + floor(random() * 5)::int
    WHEN rarity = 'uncommon' THEN 10 + floor(random() * 5)::int
    WHEN rarity = 'rare' THEN 12 + floor(random() * 5)::int
    WHEN rarity = 'epic' THEN 14 + floor(random() * 5)::int
    WHEN rarity = 'legendary' THEN 16 + floor(random() * 5)::int
    ELSE 10
  END
WHERE agility = 10;
