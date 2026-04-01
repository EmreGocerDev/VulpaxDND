-- ============================================
-- Keycode / Promo Code System
-- Run this in Supabase SQL Editor
-- Admin email: emregocernew@gmail.com
-- ============================================

-- ============================================
-- 1) KEYCODES TABLE — admin creates codes
-- ============================================
CREATE TABLE IF NOT EXISTS keycodes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text NOT NULL UNIQUE,
  gold_reward integer NOT NULL DEFAULT 100,
  max_uses    integer NOT NULL DEFAULT 1,        -- max total redemptions
  used_count  integer NOT NULL DEFAULT 0,         -- current redemptions
  expires_at  timestamptz,                        -- null = never expires
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ============================================
-- 2) KEYCODE_REDEMPTIONS TABLE — tracks who used which code
-- ============================================
CREATE TABLE IF NOT EXISTS keycode_redemptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keycode_id  uuid NOT NULL REFERENCES keycodes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(keycode_id, user_id)  -- each user can redeem each code only once
);

-- ============================================
-- 3) RLS — keycodes table
-- ============================================
ALTER TABLE keycodes ENABLE ROW LEVEL SECURITY;

-- Everyone can read active keycodes (needed for redemption)
DROP POLICY IF EXISTS "keycodes_select_all" ON keycodes;
CREATE POLICY "keycodes_select_all"
  ON keycodes FOR SELECT
  USING (true);

-- Only admin can insert
DROP POLICY IF EXISTS "keycodes_insert_admin" ON keycodes;
CREATE POLICY "keycodes_insert_admin"
  ON keycodes FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Only admin can update
DROP POLICY IF EXISTS "keycodes_update_admin" ON keycodes;
CREATE POLICY "keycodes_update_admin"
  ON keycodes FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Only admin can delete
DROP POLICY IF EXISTS "keycodes_delete_admin" ON keycodes;
CREATE POLICY "keycodes_delete_admin"
  ON keycodes FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- ============================================
-- 4) RLS — keycode_redemptions table
-- ============================================
ALTER TABLE keycode_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can see their own redemptions
DROP POLICY IF EXISTS "redemptions_select_own" ON keycode_redemptions;
CREATE POLICY "redemptions_select_own"
  ON keycode_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can see all redemptions
DROP POLICY IF EXISTS "redemptions_select_admin" ON keycode_redemptions;
CREATE POLICY "redemptions_select_admin"
  ON keycode_redemptions FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'emregocernew@gmail.com'
  );

-- Authenticated users can insert their own redemption
DROP POLICY IF EXISTS "redemptions_insert_own" ON keycode_redemptions;
CREATE POLICY "redemptions_insert_own"
  ON keycode_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5) RPC — Atomic redeem function (prevents race conditions)
-- ============================================
CREATE OR REPLACE FUNCTION redeem_keycode(p_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_keycode keycodes%ROWTYPE;
  v_already keycode_redemptions%ROWTYPE;
  v_gold integer;
BEGIN
  -- Find the keycode
  SELECT * INTO v_keycode
  FROM keycodes
  WHERE code = p_code AND active = true
  FOR UPDATE;  -- lock the row

  IF v_keycode IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Geçersiz veya deaktif kod.');
  END IF;

  -- Check expiration
  IF v_keycode.expires_at IS NOT NULL AND v_keycode.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Bu kodun süresi dolmuş.');
  END IF;

  -- Check max uses
  IF v_keycode.used_count >= v_keycode.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Bu kod kullanım limitine ulaşmış.');
  END IF;

  -- Check if user already redeemed
  SELECT * INTO v_already
  FROM keycode_redemptions
  WHERE keycode_id = v_keycode.id AND user_id = p_user_id;

  IF v_already IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Bu kodu zaten kullandın.');
  END IF;

  -- All good — redeem!
  INSERT INTO keycode_redemptions (keycode_id, user_id)
  VALUES (v_keycode.id, p_user_id);

  UPDATE keycodes SET used_count = used_count + 1 WHERE id = v_keycode.id;

  UPDATE profiles SET gold_balance = gold_balance + v_keycode.gold_reward WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'gold_reward', v_keycode.gold_reward,
    'message', v_keycode.gold_reward || ' altın hesabına eklendi!'
  );
END;
$$;
