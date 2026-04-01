-- Add intelligence_bonus and charisma_bonus columns to room_members
-- (Mirrors the pattern from agility_stat.sql)

ALTER TABLE public.room_members ADD COLUMN intelligence_bonus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.room_members ADD COLUMN charisma_bonus INTEGER NOT NULL DEFAULT 0;
