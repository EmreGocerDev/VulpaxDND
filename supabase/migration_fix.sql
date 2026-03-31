-- ============================================================
-- VULPAX DND - Migrasyon / Düzeltme Dosyası
-- Bu dosyayı SADECE hata alırsan çalıştır. İlk schema.sql
-- zaten tüm tabloları oluşturdu.
-- ============================================================

-- Eğer 'equipped' sütunu eksikse (eski schema kullanıyorsan):
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_inventory' AND column_name = 'equipped'
  ) THEN
    ALTER TABLE public.user_inventory ADD COLUMN equipped BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Eğer 'voice_token' sütunu eksikse:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'voice_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN voice_token TEXT;
  END IF;
END $$;

-- Eğer 'avatar_url' sütunu eksikse:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- chat_message action type zaten schema.sql'de mevcut (room_actions CHECK constraint)
-- Eğer eski schema kullanıyorsan ve chat_message CHECK'te yoksa:
-- ALTER TABLE public.room_actions DROP CONSTRAINT room_actions_action_type_check;
-- ALTER TABLE public.room_actions ADD CONSTRAINT room_actions_action_type_check
--   CHECK (action_type IN ('dice_roll','card_use','dm_action','chat_message'));

-- ============================================================
-- Bu dosyayı çalıştırdıktan sonra tekrar çalıştırsan bile hata vermez.
-- ============================================================

-- XP ve Level sütunları (gameStore için):
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'xp'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Oda oyun modu (standard / simple):
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'game_mode'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'standard';
  END IF;
END $$;

-- ============================================================
-- ARKADAŞLIK SİSTEMİ
-- ============================================================

-- Friendships tablosu
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Friend messages tablosu
CREATE TABLE IF NOT EXISTS public.friend_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_from ON public.friend_messages(from_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_to ON public.friend_messages(to_id);

-- RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;

-- Friendships: kullanıcılar kendi arkadaşlıklarını görebilir
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Friendships: users can view own') THEN
    CREATE POLICY "Friendships: users can view own"
      ON public.friendships FOR SELECT
      USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Friendships: users can insert') THEN
    CREATE POLICY "Friendships: users can insert"
      ON public.friendships FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Friendships: users can update own') THEN
    CREATE POLICY "Friendships: users can update own"
      ON public.friendships FOR UPDATE
      USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Friendships: users can delete own') THEN
    CREATE POLICY "Friendships: users can delete own"
      ON public.friendships FOR DELETE
      USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;
END $$;

-- Friend messages: kullanıcılar kendi mesajlarını görebilir
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Friend messages: users can view own') THEN
    CREATE POLICY "Friend messages: users can view own"
      ON public.friend_messages FOR SELECT
      USING (auth.uid() = from_id OR auth.uid() = to_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Friend messages: users can insert') THEN
    CREATE POLICY "Friend messages: users can insert"
      ON public.friend_messages FOR INSERT
      WITH CHECK (auth.uid() = from_id);
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_messages;

-- ============================================================
-- KART SİSTEMİ V2 – Yeni sütunlar & constraint güncellemeleri
-- ============================================================

-- room_members: attack_bonus (kalıcı oyun içi atak bonusu)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_members' AND column_name = 'attack_bonus'
  ) THEN
    ALTER TABLE public.room_members ADD COLUMN attack_bonus INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- room_members: defense_bonus (kalıcı oyun içi savunma bonusu)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_members' AND column_name = 'defense_bonus'
  ) THEN
    ALTER TABLE public.room_members ADD COLUMN defense_bonus INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- room_members: poison_turns (kalan zehir turu)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_members' AND column_name = 'poison_turns'
  ) THEN
    ALTER TABLE public.room_members ADD COLUMN poison_turns INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- room_members: poison_value (her tur alınacak zehir hasarı)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_members' AND column_name = 'poison_value'
  ) THEN
    ALTER TABLE public.room_members ADD COLUMN poison_value INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- room_members: stun_turns (kalan sersemletme turu)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_members' AND column_name = 'stun_turns'
  ) THEN
    ALTER TABLE public.room_members ADD COLUMN stun_turns INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- room_members: status constraint güncelle (buffed ekle)
DO $$ BEGIN
  ALTER TABLE public.room_members DROP CONSTRAINT IF EXISTS room_members_status_check;
  ALTER TABLE public.room_members ADD CONSTRAINT room_members_status_check
    CHECK (status IN ('alive','dead','stunned','poisoned','buffed'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- powers: effect_type constraint güncelle (yeni tipler)
DO $$ BEGIN
  ALTER TABLE public.powers DROP CONSTRAINT IF EXISTS powers_effect_type_check;
  ALTER TABLE public.powers ADD CONSTRAINT powers_effect_type_check
    CHECK (effect_type IN ('zehir','diriltme','sersemletme','savunma','atak','can','savunmakirici','atakkirici','saldiri'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
