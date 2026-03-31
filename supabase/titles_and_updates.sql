-- ============================================================
-- VULPAX DND – Ünvanlar + Profil Fotoğrafı + Envanter Güncelleme
-- ============================================================

-- ============================================================
-- 1) ÜNVANLAR TABLOSU
-- ============================================================
CREATE TABLE IF NOT EXISTS public.titles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  gold_cost INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Titles: public read"
  ON public.titles FOR SELECT
  USING (true);

-- ============================================================
-- 2) KULLANICI-ÜNVAN BAĞLANTISI (profiles tablosuna)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'equipped_title_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN equipped_title_id UUID REFERENCES public.titles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3) PROFİL FOTOĞRAFI (avatar_url zaten var, ama emin olalım)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- ============================================================
-- 4) ENVANTER: item_type güncelle – title desteği ekle
-- ============================================================
ALTER TABLE public.user_inventory DROP CONSTRAINT IF EXISTS user_inventory_item_type_check;
ALTER TABLE public.user_inventory ADD CONSTRAINT user_inventory_item_type_check
  CHECK (item_type IN ('character', 'power', 'title'));

-- ============================================================
-- 5) 10 ADET TÜRKÇE ÜNVAN
-- ============================================================
INSERT INTO public.titles (name, description, gold_cost) VALUES
  ('Ejderha Katili', 'Ezelî ejderhaları alt eden efsanevi savaşçı', 200),
  ('Gölge Lordu', 'Karanlığın derinliklerinden gelen gizemli bir güç', 200),
  ('Kutsal Şövalye', 'Işığın ve adaletin koruyucusu', 200),
  ('Fırtına Çağırıcı', 'Göklerin öfkesini yeryüzüne indiren büyücü', 200),
  ('Kan Prensi', 'Savaş meydanlarının korkusuz hükümdarı', 200),
  ('Ruh Avcısı', 'Öteki dünyadan ruhları avlayan karanlık avcı', 200),
  ('Demir Yumruk', 'Yenilmez gücüyle düşmanlarını ezen savaşçı', 200),
  ('Bilge Kahin', 'Geleceği gören ve kaderi şekillendiren bilge', 200),
  ('Ateş Dansçısı', 'Alevlerle dans eden büyülü savaşçı', 200),
  ('Kuzey Kurdu', 'Buzul topraklarının yalnız ve vahşi koruyucusu', 200)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 6) Supabase Storage bucket: avatars (profil fotoğrafları)
-- Not: Supabase Dashboard'dan avatars bucket'ı oluşturun veya
-- bu SQL'i storage API'den çalıştırın.
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- ============================================================
-- TAMAMLANDI
-- ============================================================
