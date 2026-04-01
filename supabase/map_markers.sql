-- ============================================================
-- MAP MARKERS — Harita üzerinde bıçak işaretleri (gerçek zamanlı)
-- ============================================================

CREATE TABLE IF NOT EXISTS map_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  x NUMERIC NOT NULL,  -- % cinsinden (0-100)
  y NUMERIC NOT NULL,  -- % cinsinden (0-100)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)  -- her kullanıcı tek işaret
);

-- RLS
ALTER TABLE map_markers ENABLE ROW LEVEL SECURITY;

-- Herkes odadaki işaretleri görebilir
CREATE POLICY "map_markers_select" ON map_markers FOR SELECT USING (true);

-- Kullanıcı kendi işaretini ekleyebilir
CREATE POLICY "map_markers_insert" ON map_markers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcı kendi işaretini güncelleyebilir
CREATE POLICY "map_markers_update" ON map_markers FOR UPDATE USING (auth.uid() = user_id);

-- Kullanıcı kendi işaretini silebilir
CREATE POLICY "map_markers_delete" ON map_markers FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_map_markers_room ON map_markers(room_id);

-- Realtime için
ALTER PUBLICATION supabase_realtime ADD TABLE map_markers;
