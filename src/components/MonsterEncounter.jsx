import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

export default function MonsterEncounter({ roomId, isDM, onMonsterDamaged }) {
  const { monsters, activeEncounter, spawnMonsters, damageMonster, removeDeadMonsters, clearEncounter, addXp, addCombatEntry } = useGameStore();
  const { profile } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState('minion');
  const [spawnCount, setSpawnCount] = useState(1);
  const [attackTarget, setAttackTarget] = useState(null);
  const [attackDamage, setAttackDamage] = useState(10);

  const handleSpawn = async () => {
    if (!isDM) return;
    await spawnMonsters(roomId, profile?.id, selectedTier, spawnCount);
  };

  const handleAttack = () => {
    if (!attackTarget) return;
    damageMonster(attackTarget, attackDamage);
    const monster = monsters.find((m) => m.id === attackTarget);
    if (monster) {
      addCombatEntry({
        type: 'attack',
        attacker: profile?.username || 'Player',
        target: monster.name,
        damage: Math.max(0, attackDamage - monster.defense),
        icon: '⚔️',
      });
    }
    if (onMonsterDamaged) onMonsterDamaged(attackTarget, attackDamage);
  };

  const handleCleanup = async () => {
    const { dead, totalXp } = removeDeadMonsters();
    if (dead.length > 0 && profile?.id) {
      const result = await addXp(profile.id, totalXp);
      addCombatEntry({
        type: 'kill',
        attacker: 'Party',
        target: dead.map((d) => d.name).join(', '),
        xp: totalXp,
        icon: '💀',
      });
    }
  };

  if (!activeEncounter && !isDM) {
    return (
      <div className="text-center text-dim text-sm" style={{ padding: 12 }}>
        Aktif karşılaşma yok...
      </div>
    );
  }

  return (
    <div className="monster-encounter">
      {/* DM Spawn Controls */}
      {isDM && (
        <div className="monster-encounter__spawn">
          <div className="flex gap-sm items-center flex-wrap">
            <select
              className="input input--sm"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
            >
              <option value="minion">👺 Minion</option>
              <option value="standard">👹 Standard</option>
              <option value="elite">🧌 Elite</option>
              <option value="boss">👑 Boss</option>
            </select>
            <select
              className="input input--sm"
              value={spawnCount}
              onChange={(e) => setSpawnCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleSpawn}>
              ⚡ Canavar Çağır
            </button>
            {activeEncounter && (
              <button className="btn btn-danger btn-sm" onClick={clearEncounter}>
                🗑️ Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Monster List */}
      {monsters.length > 0 && (
        <div className="monster-encounter__list">
          {monsters.map((monster) => {
            const hpPercent = (monster.currentHealth / monster.health) * 100;
            const hpClass = hpPercent > 60 ? 'high' : hpPercent > 30 ? 'mid' : 'low';
            return (
              <div
                key={monster.id}
                className={`monster-card ${attackTarget === monster.id ? 'monster-card--targeted' : ''} ${monster.currentHealth <= 0 ? 'monster-card--dead' : ''}`}
                onClick={() => setAttackTarget(monster.id)}
              >
                <div className="monster-card__header">
                  <span className="monster-card__icon">{monster.icon}</span>
                  <div>
                    <div className="monster-card__name">{monster.name}</div>
                    <div className="monster-card__tier badge badge--{monster.tier}">
                      {monster.tier}
                    </div>
                  </div>
                </div>
                <div className="monster-card__stats">
                  <span>⚔ {monster.attack}</span>
                  <span>🛡 {monster.defense}</span>
                  <span>⭐ {monster.xpReward} XP</span>
                </div>
                <div className="health-bar" style={{ height: 6 }}>
                  <div
                    className={`health-bar__fill health-bar__fill--${hpClass}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
                <div className="text-dim" style={{ fontSize: 10, textAlign: 'right' }}>
                  ❤️ {monster.currentHealth}/{monster.health}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attack Controls */}
      {attackTarget && (
        <div className="monster-encounter__attack">
          <div className="flex gap-sm items-center">
            <span className="text-sm">🎯 Hedef: {monsters.find((m) => m.id === attackTarget)?.name}</span>
            <input
              type="number"
              className="input input--sm"
              style={{ width: 60 }}
              value={attackDamage}
              onChange={(e) => setAttackDamage(Number(e.target.value))}
              min={0}
              max={999}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAttack}>
              ⚔ Saldır
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCleanup}>
              💀 Ölüleri Kaldır
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
