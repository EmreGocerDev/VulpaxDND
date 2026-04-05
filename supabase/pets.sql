-- ============================================================
-- PET SİSTEMİ: user_inventory item_type güncelle – pet desteği
-- ============================================================
ALTER TABLE public.user_inventory DROP CONSTRAINT IF EXISTS user_inventory_item_type_check;
ALTER TABLE public.user_inventsadasory ADD CONSTRAINT user_inventory_item_type_check
  CHECK (item_type IN ('character', 'power', 'title', 'pet'));
