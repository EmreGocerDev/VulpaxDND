import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useMarketStore = create((set, get) => ({
  characters: [],
  powers: [],
  lootboxes: [],
  titles: [],
  inventory: [],
  loading: false,

  fetchMarketData: async () => {
    set({ loading: true });
    const [charRes, powRes, lootRes, titleRes] = await Promise.all([
      supabase.from('characters').select('*').order('rarity'),
      supabase.from('powers').select('*').order('rarity'),
      supabase.from('lootboxes').select('*').order('gold_cost'),
      supabase.from('titles').select('*').order('name'),
    ]);
    set({
      characters: charRes.data || [],
      powers: powRes.data || [],
      lootboxes: lootRes.data || [],
      titles: titleRes.data || [],
      loading: false,
    });
  },

  fetchInventory: async (userId) => {
    const { data } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', userId);
    if (data) set({ inventory: data });
  },

  buyCharacter: async (userId, character) => {
    if (!userId) throw new Error('Oturum bulunamadı');
    // Altın kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('gold_balance')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || profile.gold_balance < character.gold_cost) {
      throw new Error('Yeterli altın yok!');
    }

    // Envanterde var mı kontrolü
    const { data: existing } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', character.id)
      .eq('item_type', 'character')
      .maybeSingle();

    if (existing) throw new Error('Bu karakter zaten envanterde!');

    // Altın düş + envantere ekle
    await supabase
      .from('profiles')
      .update({ gold_balance: profile.gold_balance - character.gold_cost })
      .eq('id', userId);

    await supabase
      .from('user_inventory')
      .insert({ user_id: userId, item_id: character.id, item_type: 'character' });

    await get().fetchInventory(userId);
    return true;
  },

  buyPower: async (userId, power) => {
    if (!userId) throw new Error('Oturum bulunamadı');
    // Check if already owned
    const { data: existing } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', power.id)
      .eq('item_type', 'power')
      .maybeSingle();

    if (existing) throw new Error('Bu güç zaten envanterde!');

    const { data: profile } = await supabase
      .from('profiles')
      .select('gold_balance')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || profile.gold_balance < power.cost) {
      throw new Error('Yeterli altın yok!');
    }

    await supabase
      .from('profiles')
      .update({ gold_balance: profile.gold_balance - power.cost })
      .eq('id', userId);

    await supabase
      .from('user_inventory')
      .insert({ user_id: userId, item_id: power.id, item_type: 'power', quantity: 1 });

    await get().fetchInventory(userId);
    return true;
  },

  openLootbox: async (userId, lootbox) => {
    if (!userId) throw new Error('Oturum bulunamadı');
    const { data: profile } = await supabase
      .from('profiles')
      .select('gold_balance')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || profile.gold_balance < lootbox.gold_cost) {
      throw new Error('Yeterli altın yok!');
    }

    // Drop rates'e göre rarity belirle
    const rates = lootbox.drop_rates;
    const roll = Math.random() * 100;
    let rarity = 'common';
    let cumulative = 0;

    for (const [r, chance] of Object.entries(rates)) {
      cumulative += chance;
      if (roll <= cumulative) {
        rarity = r;
        break;
      }
    }

    // Rastgele item tipi (karakter veya güç)
    const isCharacter = Math.random() > 0.5;
    const table = isCharacter ? 'characters' : 'powers';

    const { data: items } = await supabase
      .from(table)
      .select('*')
      .eq('rarity', rarity);

    if (!items || items.length === 0) {
      // Fallback: common item
      const { data: fallback } = await supabase
        .from(table)
        .select('*')
        .eq('rarity', 'common');
      if (fallback && fallback.length > 0) {
        const item = fallback[Math.floor(Math.random() * fallback.length)];
        return { item, type: isCharacter ? 'character' : 'power', rarity: 'common' };
      }
      throw new Error('Loot bulunamadı');
    }

    const item = items[Math.floor(Math.random() * items.length)];

    // Altın düş
    await supabase
      .from('profiles')
      .update({ gold_balance: profile.gold_balance - lootbox.gold_cost })
      .eq('id', userId);

    // Envantere ekle
    await supabase
      .from('user_inventory')
      .upsert(
        {
          user_id: userId,
          item_id: item.id,
          item_type: isCharacter ? 'character' : 'power',
          quantity: 1,
        },
        { onConflict: 'user_id,item_id,item_type' }
      );

    await get().fetchInventory(userId);
    return { item, type: isCharacter ? 'character' : 'power', rarity };
  },

  toggleEquip: async (invId, userId, currentEquipped) => {
    // Enforce max 10 equipped power cards
    if (!currentEquipped) {
      const inv = get().inventory;
      const item = inv.find(i => i.id === invId);
      if (item && item.item_type === 'power') {
        const equippedPowers = inv.filter(i => i.item_type === 'power' && i.equipped);
        if (equippedPowers.length >= 10) {
          throw new Error('En fazla 10 güç kartı kuşanabilirsin!');
        }
      }
    }
    await supabase
      .from('user_inventory')
      .update({ equipped: !currentEquipped })
      .eq('id', invId);
    await get().fetchInventory(userId);
  },

  buyTitle: async (userId, title) => {
    if (!userId) throw new Error('Oturum bulunamadı');
    const { data: profile } = await supabase
      .from('profiles')
      .select('gold_balance')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || profile.gold_balance < title.gold_cost) {
      throw new Error('Yeterli altın yok!');
    }

    // Check if already owned
    const { data: existing } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', title.id)
      .eq('item_type', 'title')
      .maybeSingle();

    if (existing) throw new Error('Bu ünvan zaten envanterde!');

    await supabase
      .from('profiles')
      .update({ gold_balance: profile.gold_balance - title.gold_cost })
      .eq('id', userId);

    await supabase
      .from('user_inventory')
      .insert({ user_id: userId, item_id: title.id, item_type: 'title' });

    await get().fetchInventory(userId);
    return true;
  },

  equipTitle: async (userId, titleId) => {
    // Set equipped_title_id on profile (only 1 title at a time)
    await supabase
      .from('profiles')
      .update({ equipped_title_id: titleId })
      .eq('id', userId);
  },

  unequipTitle: async (userId) => {
    await supabase
      .from('profiles')
      .update({ equipped_title_id: null })
      .eq('id', userId);
  },
}));
