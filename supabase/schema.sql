-- ============================================================
-- VULPAX DND - SUPABASE DATABASE SCHEMA
-- Tek seferde çalıştırılacak SQL Snippet
-- ============================================================

-- ============================================================
-- 1) EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2) TABLES
-- ============================================================

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  gold_balance INTEGER NOT NULL DEFAULT 100,
  voice_token TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHARACTERS (oyun içi satın alınabilir karakterler)
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  health INTEGER NOT NULL DEFAULT 100,
  attack INTEGER NOT NULL DEFAULT 10,
  defense INTEGER NOT NULL DEFAULT 10,
  rarity TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary')) DEFAULT 'common',
  image_placeholder TEXT DEFAULT '/assets/characters/default.png',
  gold_cost INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POWERS (güç kartları)
CREATE TABLE public.powers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  effect_type TEXT NOT NULL CHECK (effect_type IN ('damage','heal','buff','debuff','utility')) DEFAULT 'damage',
  effect_value INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 10,
  rarity TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary')) DEFAULT 'common',
  image_placeholder TEXT DEFAULT '/assets/powers/default.png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER INVENTORY (kullanıcının sahip olduğu karakter ve güçler)
CREATE TABLE public.user_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('character','power')),
  quantity INTEGER NOT NULL DEFAULT 1,
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- ROOMS (lobi / oyun odaları)
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_name TEXT NOT NULL,
  room_code TEXT UNIQUE NOT NULL DEFAULT substring(uuid_generate_v4()::text, 1, 8),
  dm_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('lobby','playing','finished')) DEFAULT 'lobby',
  max_players INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROOM MEMBERS (odadaki oyuncular)
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  current_health INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL CHECK (status IN ('alive','dead','stunned','poisoned')) DEFAULT 'alive',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- ROOM ACTIONS (zar atışları, kart kullanımları vb. – Realtime ile dinlenecek)
CREATE TABLE public.room_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('dice_roll','card_use','dm_action','chat_message')),
  action_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LOOTBOXES (kasa tanımları)
CREATE TABLE public.lootboxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  gold_cost INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  drop_rates JSONB NOT NULL DEFAULT '{"common":50,"uncommon":25,"rare":15,"epic":8,"legendary":2}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3) INDEXES
-- ============================================================
CREATE INDEX idx_user_inventory_user ON public.user_inventory(user_id);
CREATE INDEX idx_room_members_room ON public.room_members(room_id);
CREATE INDEX idx_room_actions_room ON public.room_actions(room_id);
CREATE INDEX idx_room_actions_created ON public.room_actions(created_at DESC);
CREATE INDEX idx_rooms_code ON public.rooms(room_code);

-- ============================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================

-- PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Profiles: users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- CHARACTERS RLS (herkes okuyabilir, kimse değiştiremez)
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Characters: public read"
  ON public.characters FOR SELECT
  USING (true);

-- POWERS RLS
ALTER TABLE public.powers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Powers: public read"
  ON public.powers FOR SELECT
  USING (true);

-- USER_INVENTORY RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory: users can view own inventory"
  ON public.user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Inventory: users can insert own inventory"
  ON public.user_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Inventory: users can update own inventory"
  ON public.user_inventory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ROOMS RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms: anyone can view rooms"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Rooms: authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Rooms: DM can update own room"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = dm_id)
  WITH CHECK (auth.uid() = dm_id);

-- ROOM MEMBERS RLS
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room Members: room participants can view"
  ON public.room_members FOR SELECT
  USING (true);

CREATE POLICY "Room Members: users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Room Members: users can leave or DM can update"
  ON public.room_members FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT dm_id FROM public.rooms WHERE id = room_id)
  );

CREATE POLICY "Room Members: users can leave room"
  ON public.room_members FOR DELETE
  USING (auth.uid() = user_id);

-- ROOM ACTIONS RLS
ALTER TABLE public.room_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room Actions: room participants can view"
  ON public.room_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_actions.room_id AND rm.user_id = auth.uid()
    )
    OR auth.uid() IN (SELECT dm_id FROM public.rooms WHERE id = room_actions.room_id)
  );

CREATE POLICY "Room Actions: authenticated users can insert"
  ON public.room_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- LOOTBOXES RLS
ALTER TABLE public.lootboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lootboxes: public read"
  ON public.lootboxes FOR SELECT
  USING (true);

-- ============================================================
-- 5) REALTIME – Yayın yapılacak tablolar
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- ============================================================
-- 6) FUNCTIONS
-- ============================================================

-- Profil otomatik oluşturma (auth.users trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Adventurer_' || substring(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7) SEED DATA – Başlangıç Karakterleri
-- ============================================================

INSERT INTO public.characters (name, health, attack, defense, rarity, gold_cost, description, image_placeholder) VALUES
  ('Shadow Knight',     120, 18, 14, 'rare',      150, 'Karanlığın hizmetindeki gizemli bir şövalye. Gölgelerden güç alır.',            '/assets/characters/shadow_knight.png'),
  ('Forest Druid',      90,  12, 10, 'common',     50, 'Ormanların koruyucusu. Doğanın gücünü kullanır.',                              '/assets/characters/forest_druid.png'),
  ('Iron Paladin',      150, 15, 20, 'epic',       300, 'Kutsal zırhıyla korunan yenilmez bir savaşçı.',                               '/assets/characters/iron_paladin.png'),
  ('Fire Mage',         80,  25, 8,  'uncommon',   100, 'Ateş büyülerinin ustası. Düşmanlarını alevler içinde bırakır.',                '/assets/characters/fire_mage.png'),
  ('Plague Doctor',     95,  14, 12, 'rare',       150, 'Zehir ve hastalık uzmani. Düşmanlarını yavaşça eritir.',                       '/assets/characters/plague_doctor.png'),
  ('Blood Berserker',   110, 22, 6,  'epic',       300, 'Kanla beslenen vahşi bir savaşçı. Öfkesi arttıkça güçlenir.',                  '/assets/characters/blood_berserker.png'),
  ('Frost Witch',       85,  20, 10, 'uncommon',   100, 'Buzun kraliçesi. Düşmanlarını donduran büyüler kullanır.',                     '/assets/characters/frost_witch.png'),
  ('Ancient Dragon',    200, 30, 25, 'legendary',  500, 'Kadim bir ejderha. Efsanevi güce sahip yıkıcı bir yaratık.',                   '/assets/characters/ancient_dragon.png'),
  ('Rogue Assassin',    75,  28, 5,  'rare',       150, 'Gölgelerde hareket eden ölümcül bir suikastçı.',                               '/assets/characters/rogue_assassin.png'),
  ('Holy Cleric',       100, 10, 15, 'common',      50, 'İyileştirme büyüleriyle müttefiklerini koruyan bir rahip.',                    '/assets/characters/holy_cleric.png');

-- ============================================================
-- 8) SEED DATA – Başlangıç Güç Kartları
-- ============================================================

INSERT INTO public.powers (name, description, effect_type, effect_value, cost, rarity, image_placeholder) VALUES
  ('Fireball',          'Hedef alana büyük bir ateş topu fırlatır.',               'damage',  35, 20, 'rare',      '/assets/powers/fireball.png'),
  ('Healing Light',     'Müttefiki ışık huzmesiyle iyileştirir.',                   'heal',    25, 15, 'common',    '/assets/powers/healing_light.png'),
  ('Shield Wall',       'Kalkan duvarı oluşturarak savunmayı artırır.',             'buff',    15, 10, 'common',    '/assets/powers/shield_wall.png'),
  ('Poison Strike',     'Zehirli bir saldırı. Düşmana sürekli hasar verir.',        'damage',  20, 15, 'uncommon',  '/assets/powers/poison_strike.png'),
  ('War Cry',           'Savaş çığlığı ile müttefiklerin saldırısını artırır.',     'buff',    10, 10, 'common',    '/assets/powers/war_cry.png'),
  ('Ice Prison',        'Düşmanı buzdan bir hapishaneye hapseder.',                 'debuff',  0,  20, 'rare',      '/assets/powers/ice_prison.png'),
  ('Dark Curse',        'Karanlık lanet. Düşmanın savunmasını düşürür.',            'debuff',  12, 15, 'uncommon',  '/assets/powers/dark_curse.png'),
  ('Lightning Bolt',    'Gökten yıldırım çağırır.',                                'damage',  40, 25, 'epic',      '/assets/powers/lightning_bolt.png'),
  ('Resurrection',      'Düşmüş bir müttefiki hayata döndürür.',                   'heal',    50, 30, 'epic',      '/assets/powers/resurrection.png'),
  ('Divine Judgment',   'Tanrısal yargı. Tüm düşmanlara hasar verir.',             'damage',  60, 40, 'legendary', '/assets/powers/divine_judgment.png'),
  ('Teleport',          'Savaş alanında anında yer değiştirir.',                    'utility', 0,  15, 'uncommon',  '/assets/powers/teleport.png'),
  ('Berserk Rage',      'Kontrolsüz öfke. Saldırı artar, savunma düşer.',          'buff',    20, 10, 'rare',      '/assets/powers/berserk_rage.png');

-- ============================================================
-- 9) SEED DATA – Başlangıç Lootbox'lar
-- ============================================================

INSERT INTO public.lootboxes (name, gold_cost, description, drop_rates) VALUES
  ('Wooden Chest',     50,  'Basit bir ahşap sandık. Genelde sıradan eşyalar düşürür.',
    '{"common":60,"uncommon":25,"rare":12,"epic":2.5,"legendary":0.5}'),
  ('Iron Chest',       150, 'Demir sandık. Daha iyi ödüller barındırır.',
    '{"common":35,"uncommon":30,"rare":22,"epic":10,"legendary":3}'),
  ('Golden Chest',     300, 'Altın sandık. Nadir eşyalar şansı yüksek.',
    '{"common":15,"uncommon":20,"rare":30,"epic":25,"legendary":10}'),
  ('Dragon Hoard',     500, 'Ejderha hazinesi. Efsanevi eşya garantisi yüksek!',
    '{"common":5,"uncommon":10,"rare":25,"epic":35,"legendary":25}');

-- ============================================================
-- TAMAMLANDI – Tüm tablolar, ilişkiler, RLS ve seed data hazır.
-- ============================================================
