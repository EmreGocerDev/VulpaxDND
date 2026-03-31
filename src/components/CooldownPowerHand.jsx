import React, { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function CooldownPowerHand({ roomId, powers, onUsePower }) {
  const { usePowerWithCooldown, getCooldownRemaining } = useGameStore();
  const [cooldownTimers, setCooldownTimers] = useState({});
  const [message, setMessage] = useState('');

  // Update cooldown timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const timers = {};
      powers.forEach((p) => {
        timers[p.id] = getCooldownRemaining(p.id);
      });
      setCooldownTimers(timers);
    }, 1000);
    return () => clearInterval(interval);
  }, [powers, getCooldownRemaining]);

  const handleUse = (power) => {
    const cooldownMs = getCooldownMs(power.rarity);
    const result = usePowerWithCooldown(power.id, cooldownMs);
    if (!result.canUse) {
      setMessage(`⏳ ${power.name} bekleme süresi: ${result.remaining}s`);
      return;
    }
    setMessage(`✨ ${power.name} kullanıldı!`);
    if (onUsePower) onUsePower(power);
  };

  return (
    <div>
      {message && <p className="text-gold text-sm mb-sm text-center">{message}</p>}
      <div className="power-hand">
        {powers.map((power) => {
          const remaining = cooldownTimers[power.id] || 0;
          const onCooldown = remaining > 0;
          return (
            <button
              key={power.id}
              className={`power-card power-card--${power.rarity} ${onCooldown ? 'power-card--cooldown' : ''}`}
              onClick={() => handleUse(power)}
              disabled={onCooldown}
              title={`${power.description}${onCooldown ? ` (${remaining}s)` : ''}`}
            >
              {onCooldown && (
                <div className="power-card__cooldown-overlay">
                  <span className="power-card__cooldown-timer">{remaining}s</span>
                </div>
              )}
              <div className="power-card__icon">
                {getEffectIcon(power.effect_type)}
              </div>
              <div className="power-card__name">{power.name}</div>
              <div className="power-card__value">
                {power.effect_value > 0 ? power.effect_value : ''}
                {power.effect_type === 'damage' ? ' DMG' :
                 power.effect_type === 'heal' ? ' HP' :
                 power.effect_type === 'buff' ? ' BUFF' :
                 power.effect_type === 'debuff' ? ' DEBUFF' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getCooldownMs(rarity) {
  switch (rarity) {
    case 'common': return 15000;
    case 'rare': return 30000;
    case 'epic': return 45000;
    case 'legendary': return 60000;
    default: return 20000;
  }
}

function getEffectIcon(type) {
  switch (type) {
    case 'damage': return '🔥';
    case 'heal': return '💚';
    case 'buff': return '⬆️';
    case 'debuff': return '⬇️';
    case 'utility': return '✨';
    default: return '⚡';
  }
}
