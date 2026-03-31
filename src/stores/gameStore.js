import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ============================================================
// GAME STORE – XP, Level, Achievements, Cooldowns, Monsters
// ============================================================
export const useGameStore = create((set, get) => ({
  // XP & Level
  xp: 0,
  level: 1,
  xpToNext: 100,

  // Cooldowns: { powerId: { usedAt, cooldownMs } }
  cooldowns: {},

  // Monsters in current encounter
  monsters: [],
  activeEncounter: false,

  // DM Notes
  dmNotes: [],

  // Achievements
  achievements: [],
  unlockedAchievements: [],

  // Combat Log
  combatLog: [],

  // Party Inventory (shared loot)
  partyLoot: [],

  // ============================================================
  // XP & LEVEL SYSTEM
  // ============================================================
  getXpForLevel: (level) => Math.floor(100 * Math.pow(1.5, level - 1)),

  addXp: async (userId, amount) => {
    const state = get();
    let newXp = state.xp + amount;
    let newLevel = state.level;
    let xpToNext = state.xpToNext;

    // Level up check
    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      newLevel += 1;
      xpToNext = get().getXpForLevel(newLevel);
    }

    set({ xp: newXp, level: newLevel, xpToNext });

    // Persist to profile
    if (userId) {
      await supabase
        .from('profiles')
        .update({ xp: newXp, level: newLevel })
        .eq('id', userId);
    }

    return { newLevel, newXp, leveledUp: newLevel > state.level };
  },

  loadProgress: async (userId) => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      const level = data.level || 1;
      set({
        xp: data.xp || 0,
        level,
        xpToNext: get().getXpForLevel(level),
      });
    }
  },

  // ============================================================
  // COOLDOWN SYSTEM
  // ============================================================
  usePowerWithCooldown: (powerId, cooldownMs = 30000) => {
    const now = Date.now();
    const cd = get().cooldowns[powerId];
    if (cd && now - cd.usedAt < cd.cooldownMs) {
      const remaining = Math.ceil((cd.cooldownMs - (now - cd.usedAt)) / 1000);
      return { canUse: false, remaining };
    }
    set((s) => ({
      cooldowns: {
        ...s.cooldowns,
        [powerId]: { usedAt: now, cooldownMs },
      },
    }));
    return { canUse: true, remaining: 0 };
  },

  getCooldownRemaining: (powerId) => {
    const cd = get().cooldowns[powerId];
    if (!cd) return 0;
    const remaining = cd.cooldownMs - (Date.now() - cd.usedAt);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },

  // ============================================================
  // MONSTER / NPC ENCOUNTER SYSTEM
  // ============================================================
  MONSTER_TEMPLATES: [
    { name: 'Goblin', health: 30, attack: 8, defense: 4, xpReward: 15, icon: '👺', tier: 'minion' },
    { name: 'Skeleton Warrior', health: 45, attack: 12, defense: 8, xpReward: 25, icon: '💀', tier: 'minion' },
    { name: 'Orc Brute', health: 80, attack: 18, defense: 10, xpReward: 40, icon: '👹', tier: 'standard' },
    { name: 'Dark Sorcerer', health: 60, attack: 22, defense: 6, xpReward: 50, icon: '🧙', tier: 'standard' },
    { name: 'Dire Wolf', health: 55, attack: 16, defense: 8, xpReward: 30, icon: '🐺', tier: 'minion' },
    { name: 'Troll', health: 120, attack: 20, defense: 14, xpReward: 60, icon: '🧌', tier: 'elite' },
    { name: 'Vampire Lord', health: 100, attack: 25, defense: 12, xpReward: 80, icon: '🧛', tier: 'elite' },
    { name: 'Lich King', health: 150, attack: 30, defense: 20, xpReward: 120, icon: '👑', tier: 'boss' },
    { name: 'Dragon Whelp', health: 90, attack: 24, defense: 16, xpReward: 70, icon: '🐉', tier: 'elite' },
    { name: 'Shadow Demon', health: 110, attack: 28, defense: 10, xpReward: 90, icon: '😈', tier: 'boss' },
    { name: 'Giant Spider', health: 40, attack: 14, defense: 6, xpReward: 20, icon: '🕷️', tier: 'minion' },
    { name: 'Minotaur', health: 130, attack: 26, defense: 18, xpReward: 100, icon: '🐂', tier: 'boss' },
    { name: 'Wraith', health: 50, attack: 20, defense: 4, xpReward: 35, icon: '👻', tier: 'standard' },
    { name: 'Bandit Captain', health: 65, attack: 15, defense: 10, xpReward: 30, icon: '🏴‍☠️', tier: 'standard' },
    { name: 'Fire Elemental', health: 70, attack: 22, defense: 8, xpReward: 55, icon: '🔥', tier: 'elite' },
  ],

  spawnMonsters: async (roomId, userId, tier, count = 1) => {
    const templates = get().MONSTER_TEMPLATES.filter((m) => m.tier === tier);
    if (templates.length === 0) return;

    const spawned = [];
    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      spawned.push({
        ...template,
        id: `monster-${Date.now()}-${i}`,
        currentHealth: template.health,
      });
    }

    set((s) => ({
      monsters: [...s.monsters, ...spawned],
      activeEncounter: true,
    }));

    // Log to room
    if (roomId && userId) {
      const names = spawned.map((m) => `${m.icon} ${m.name}`).join(', ');
      await supabase.from('room_actions').insert({
        room_id: roomId,
        user_id: userId,
        action_type: 'dm_action',
        action_value: { message: `⚠ Karşılaşma! ${names} ortaya çıktı!` },
      });
    }

    return spawned;
  },

  damageMonster: (monsterId, damage) => {
    set((s) => ({
      monsters: s.monsters.map((m) =>
        m.id === monsterId
          ? { ...m, currentHealth: Math.max(0, m.currentHealth - Math.max(0, damage - m.defense)) }
          : m
      ),
    }));
  },

  removeDeadMonsters: () => {
    const dead = get().monsters.filter((m) => m.currentHealth <= 0);
    const totalXp = dead.reduce((sum, m) => sum + m.xpReward, 0);
    set((s) => ({
      monsters: s.monsters.filter((m) => m.currentHealth > 0),
      activeEncounter: s.monsters.filter((m) => m.currentHealth > 0).length > 0,
    }));
    return { dead, totalXp };
  },

  clearEncounter: () => {
    set({ monsters: [], activeEncounter: false });
  },

  // ============================================================
  // COMBAT DAMAGE CALCULATOR
  // ============================================================
  calculateDamage: (attackStat, defenseStat, diceRoll, powerBonus = 0) => {
    const baseDamage = Math.max(1, attackStat - defenseStat / 2);
    const diceMultiplier = diceRoll === 20 ? 2.0 : diceRoll === 1 ? 0.5 : 1.0;
    const total = Math.floor((baseDamage + powerBonus) * diceMultiplier);
    return {
      total,
      baseDamage,
      diceMultiplier,
      isCritical: diceRoll === 20,
      isFumble: diceRoll === 1,
    };
  },

  // ============================================================
  // DM NOTES & SCENARIO SYSTEM
  // ============================================================
  addDmNote: (note) => {
    set((s) => ({
      dmNotes: [
        ...s.dmNotes,
        { id: Date.now(), text: note, createdAt: new Date().toISOString(), pinned: false },
      ],
    }));
  },

  removeDmNote: (noteId) => {
    set((s) => ({ dmNotes: s.dmNotes.filter((n) => n.id !== noteId) }));
  },

  togglePinNote: (noteId) => {
    set((s) => ({
      dmNotes: s.dmNotes.map((n) =>
        n.id === noteId ? { ...n, pinned: !n.pinned } : n
      ),
    }));
  },

  // ============================================================
  // ACHIEVEMENT SYSTEM
  // ============================================================
  ACHIEVEMENTS: [
    { id: 'first_blood', name: 'İlk Kan', desc: 'İlk düşmanını yendin!', icon: '🗡️', condition: 'kill_1' },
    { id: 'dice_master', name: 'Zar Ustası', desc: '50 zar attın.', icon: '🎲', condition: 'rolls_50' },
    { id: 'critical_king', name: 'Kritik Kral', desc: '5 doğal 20 attın!', icon: '👑', condition: 'crits_5' },
    { id: 'gold_hoarder', name: 'Altın Biriktirici', desc: '1000 altın biriktirdin.', icon: '💰', condition: 'gold_1000' },
    { id: 'team_player', name: 'Takım Oyuncusu', desc: '10 oyuna katıldın.', icon: '🤝', condition: 'games_10' },
    { id: 'shopaholic', name: 'Alışveriş Bağımlısı', desc: '10 item satın aldın.', icon: '🛒', condition: 'purchases_10' },
    { id: 'dragon_slayer', name: 'Ejderha Avcısı', desc: 'Boss tier düşman yendin.', icon: '🐉', condition: 'boss_kill' },
    { id: 'healer', name: 'Şifacı', desc: '100 HP iyileştirdin.', icon: '💚', condition: 'heal_100' },
    { id: 'survivor', name: 'Hayatta Kalan', desc: 'Savaşta 10 HP altında kaldın.', icon: '🩸', condition: 'low_hp' },
    { id: 'veteran', name: 'Savaş Gazisi', desc: 'Seviye 10\'a ulaştın.', icon: '⭐', condition: 'level_10' },
    { id: 'loot_lucky', name: 'Şanslı Avcı', desc: 'Legendary item buldun!', icon: '🍀', condition: 'legendary_loot' },
    { id: 'chat_master', name: 'Sohbet Ustası', desc: '100 mesaj gönderdin.', icon: '💬', condition: 'messages_100' },
  ],

  unlockAchievement: (achievementId) => {
    const state = get();
    if (state.unlockedAchievements.includes(achievementId)) return false;
    set((s) => ({
      unlockedAchievements: [...s.unlockedAchievements, achievementId],
    }));
    return true;
  },

  // ============================================================
  // PARTY LOOT (Shared inventory in room)
  // ============================================================
  addPartyLoot: async (roomId, userId, item) => {
    set((s) => ({
      partyLoot: [...s.partyLoot, { ...item, id: `loot-${Date.now()}`, addedBy: userId }],
    }));
    if (roomId && userId) {
      await supabase.from('room_actions').insert({
        room_id: roomId,
        user_id: userId,
        action_type: 'dm_action',
        action_value: { message: `💎 Ganimet bulundu: ${item.name}!` },
      });
    }
  },

  claimLoot: (lootId) => {
    set((s) => ({ partyLoot: s.partyLoot.filter((l) => l.id !== lootId) }));
  },

  clearPartyLoot: () => set({ partyLoot: [] }),

  // ============================================================
  // COMBAT LOG (local, detailed)
  // ============================================================
  addCombatEntry: (entry) => {
    set((s) => ({
      combatLog: [
        { ...entry, id: Date.now(), timestamp: new Date().toISOString() },
        ...s.combatLog,
      ].slice(0, 100),
    }));
  },
}));
