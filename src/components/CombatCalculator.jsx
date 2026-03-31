import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function CombatCalculator() {
  const { calculateDamage, addCombatEntry } = useGameStore();
  const [attackStat, setAttackStat] = useState(15);
  const [defenseStat, setDefenseStat] = useState(10);
  const [diceRoll, setDiceRoll] = useState(10);
  const [powerBonus, setPowerBonus] = useState(0);
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const res = calculateDamage(attackStat, defenseStat, diceRoll, powerBonus);
    setResult(res);
    addCombatEntry({
      type: 'calc',
      icon: '🧮',
      attacker: 'Hesaplama',
      target: '-',
      damage: res.total,
      detail: `ATK:${attackStat} DEF:${defenseStat} Zar:${diceRoll} Bonus:${powerBonus}`,
    });
  };

  const handleQuickRoll = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setDiceRoll(roll);
  };

  return (
    <div className="combat-calculator">
      <h4 className="text-gold mb-sm" style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>🧮 Hasar Hesaplayıcı</h4>

      <div className="combat-calculator__grid">
        <div className="combat-calculator__field">
          <label className="text-dim text-sm">⚔ Saldırı</label>
          <input
            type="number"
            className="input input--sm"
            value={attackStat}
            onChange={(e) => setAttackStat(Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="combat-calculator__field">
          <label className="text-dim text-sm">🛡 Savunma</label>
          <input
            type="number"
            className="input input--sm"
            value={defenseStat}
            onChange={(e) => setDefenseStat(Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="combat-calculator__field">
          <label className="text-dim text-sm">🎲 Zar (1-20)</label>
          <div className="flex gap-sm items-center">
            <input
              type="number"
              className="input input--sm"
              value={diceRoll}
              onChange={(e) => setDiceRoll(Math.min(20, Math.max(1, Number(e.target.value))))}
              min={1}
              max={20}
            />
            <button className="btn btn-ghost btn-sm" onClick={handleQuickRoll} title="Hızlı Zar At">
              🎲
            </button>
          </div>
        </div>
        <div className="combat-calculator__field">
          <label className="text-dim text-sm">✨ Güç Bonusu</label>
          <input
            type="number"
            className="input input--sm"
            value={powerBonus}
            onChange={(e) => setPowerBonus(Number(e.target.value))}
            min={0}
          />
        </div>
      </div>

      <button className="btn btn-primary btn-sm" onClick={handleCalculate} style={{ width: '100%', marginTop: 8 }}>
        ⚡ Hesapla
      </button>

      {result && (
        <div className={`combat-calculator__result ${result.isCritical ? 'combat-calculator__result--critical' : ''} ${result.isFumble ? 'combat-calculator__result--fumble' : ''}`}>
          <div className="combat-calculator__result-value">
            {result.isCritical && <span className="text-gold">💥 KRİTİK! </span>}
            {result.isFumble && <span style={{ color: 'var(--blood-red-light)' }}>💨 Fumble! </span>}
            <span style={{ fontSize: 24, fontFamily: 'var(--font-display)' }}>{result.total}</span>
            <span className="text-dim text-sm"> hasar</span>
          </div>
          <div className="text-dim" style={{ fontSize: 11 }}>
            Temel: {result.baseDamage} × Çarpan: {result.diceMultiplier}x
          </div>
        </div>
      )}
    </div>
  );
}
