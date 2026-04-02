-- ============================================================
-- VULPAX DND - ODA ŞİFRESİ VE DM KICK ÖZELLİĞİ
-- Migration: room_password_and_kick
-- ============================================================

-- 1) Odalara şifre sütunu ekle (opsiyonel, NULL ise şifresiz oda)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_password TEXT DEFAULT NULL;

-- 2) room_password sütununu rooms select'ten gizleme (RLS ile)
-- DM ve oda üyeleri şifreyi görebilir, dışarıdan sadece
-- room_password'ın olup olmadığını anlayabilir

-- Mevcut RLS politikalarını koruyarak ek politika ekliyoruz:
-- Herkes odaları görebilir (şifre dahil - client tarafında kontrol yapılıyor)
-- Sadece DM şifreyi güncelleyebilir

-- Eğer rooms tablosunda RLS yoksa etkinleştir
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Herkes odaları okuyabilir (lobby listesi için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'rooms_select_all'
  ) THEN
    CREATE POLICY rooms_select_all ON public.rooms
      FOR SELECT USING (true);
  END IF;
END$$;

-- Authenticated kullanıcılar oda oluşturabilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'rooms_insert_auth'
  ) THEN
    CREATE POLICY rooms_insert_auth ON public.rooms
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;

-- DM kendi odasını güncelleyebilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'rooms_update_dm'
  ) THEN
    CREATE POLICY rooms_update_dm ON public.rooms
      FOR UPDATE USING (dm_id = auth.uid());
  END IF;
END$$;

-- Room members tablosu için RLS (kick desteği)
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Herkes oda üyelerini görebilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_members' AND policyname = 'room_members_select_all'
  ) THEN
    CREATE POLICY room_members_select_all ON public.room_members
      FOR SELECT USING (true);
  END IF;
END$$;

-- Kullanıcılar kendilerini odaya ekleyebilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_members' AND policyname = 'room_members_insert_self'
  ) THEN
    CREATE POLICY room_members_insert_self ON public.room_members
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Kullanıcılar kendilerini çıkarabilir VEYA DM herhangi bir üyeyi çıkarabilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_members' AND policyname = 'room_members_delete_self_or_dm'
  ) THEN
    CREATE POLICY room_members_delete_self_or_dm ON public.room_members
      FOR DELETE USING (
        user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.rooms
          WHERE rooms.id = room_members.room_id
            AND rooms.dm_id = auth.uid()
        )
      );
  END IF;
END$$;

-- Kullanıcılar kendi verilerini güncelleyebilir, DM herkesinki güncelleyebilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_members' AND policyname = 'room_members_update_self_or_dm'
  ) THEN
    CREATE POLICY room_members_update_self_or_dm ON public.room_members
      FOR UPDATE USING (
        user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.rooms
          WHERE rooms.id = room_members.room_id
            AND rooms.dm_id = auth.uid()
        )
      );
  END IF;
END$$;
