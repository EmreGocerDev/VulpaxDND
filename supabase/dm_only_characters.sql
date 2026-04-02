-- Add dm_only column to characters table
-- 0 = everyone can select, 1 = only DM can select (boss characters)
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS dm_only INTEGER NOT NULL DEFAULT 0;
