import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

const TRADE_ITEMS = [
  { name: 'Şifa İksiri', icon: '🧪', value: 25, effect: 'heal', amount: 20 },
  { name: 'Mana İksiri', icon: '💧', value: 30, effect: 'mana', amount: 15 },
  { name: 'Ateş Taşı', icon: '🔥', value: 50, effect: 'damage', amount: 30 },
  { name: 'Zırh Parçası', icon: '🛡️', value: 40, effect: 'defense', amount: 10 },
  { name: 'Hız Tılsımı', icon: '⚡', value: 35, effect: 'buff', amount: 5 },
  { name: 'Diriliş Taşı', icon: '💎', value: 100, effect: 'revive', amount: 1 },
];

export default function PartyLoot({ roomId, isDM }) {
  const { partyLoot, addPartyLoot, claimLoot, clearPartyLoot } = useGameStore();
  const { profile } = useAuthStore();
  const [showDropForm, setShowDropForm] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState(0);
  const [customName, setCustomName] = useState('');

  const handleAddLoot = async () => {
    if (!isDM) return;
    const item = TRADE_ITEMS[selectedDrop];
    if (item) {
      await addPartyLoot(roomId, profile?.id, item);
    }
  };

  const handleAddCustom = async () => {
    if (!isDM || !customName.trim()) return;
    await addPartyLoot(roomId, profile?.id, {
      name: customName.trim(),
      icon: '📦',
      value: 0,
      effect: 'custom',
      amount: 0,
    });
    setCustomName('');
  };

  const handleClaim = (lootId) => {
    claimLoot(lootId);
  };

  return (
    <div className="party-loot">
      <div className="party-loot__header">
        <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)', fontSize: 14 }}>
          💎 Parti Ganimetleri
        </h4>
        {isDM && (
          <div className="flex gap-sm">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDropForm(!showDropForm)}>
              {showDropForm ? '✕' : '➕ Ganimet Bırak'}
            </button>
            {partyLoot.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={clearPartyLoot}>
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* DM Drop Form */}
      {isDM && showDropForm && (
        <div className="party-loot__form">
          <div className="flex gap-sm items-center mb-sm">
            <select
              className="input input--sm"
              value={selectedDrop}
              onChange={(e) => setSelectedDrop(Number(e.target.value))}
              style={{ flex: 1 }}
            >
              {TRADE_ITEMS.map((item, i) => (
                <option key={i} value={i}>{item.icon} {item.name} ({item.value}g)</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAddLoot}>
              💰 Bırak
            </button>
          </div>
          <div className="flex gap-sm items-center">
            <input
              className="input input--sm"
              placeholder="Özel item adı..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={handleAddCustom} disabled={!customName.trim()}>
              📦 Ekle
            </button>
          </div>
        </div>
      )}

      {/* Loot List */}
      <div className="party-loot__list">
        {partyLoot.length === 0 ? (
          <p className="text-dim text-sm text-center" style={{ padding: 12 }}>
            Henüz ganimet yok.
          </p>
        ) : (
          partyLoot.map((item) => (
            <div key={item.id} className="loot-card">
              <span className="loot-card__icon">{item.icon}</span>
              <div className="loot-card__info">
                <div className="loot-card__name">{item.name}</div>
                {item.value > 0 && (
                  <div className="text-dim" style={{ fontSize: 10 }}>🪙 {item.value} altın değerinde</div>
                )}
              </div>
              <button className="btn btn-gold btn-sm" onClick={() => handleClaim(item.id)}>
                🤲 Al
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
