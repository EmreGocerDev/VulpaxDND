-- XP System Migration
-- Add xp column to room_members (per-game XP, starts at 0)
ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- Add xp_rate column to rooms (1=yavaş, 2=orta, 3=orta+, 4=hızlı)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS xp_rate INTEGER NOT NULL DEFAULT 1;
