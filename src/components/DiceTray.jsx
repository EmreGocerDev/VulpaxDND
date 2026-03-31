import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const DICE_TYPES = [
  { sides: 4,  label: 'D4',  icon: '🔺' },
  { sides: 6,  label: 'D6',  icon: '🎲' },
  { sides: 8,  label: 'D8',  icon: '💎' },
  { sides: 10, label: 'D10', icon: '🔷' },
  { sides: 12, label: 'D12', icon: '⬡' },
  { sides: 20, label: 'D20', icon: '⭐' },
];

export default function DiceTray({ roomId, userId }) {
  const [rolling, setRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [selectedDice, setSelectedDice] = useState(null);

  const rollDice = async (sides) => {
    if (!userId) return;
    setRolling(true);
    setSelectedDice(sides);
    setAnimating(true);

    const result = Math.floor(Math.random() * sides) + 1;

    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: userId,
      action_type: 'dice_roll',
      action_value: {
        dice_type: `d${sides}`,
        result,
        is_critical: sides === 20 && result === 20,
        is_fumble: sides === 20 && result === 1,
      },
    });

    // Show result after animation
    setTimeout(() => {
      setLastResult({ sides, result });
      setAnimating(false);
      setRolling(false);
    }, 1200);
  };

  return (
    <div>
      <div className="dice-tray">
        {DICE_TYPES.map((dice) => (
          <button
            key={dice.sides}
            className="dice-btn"
            onClick={() => rollDice(dice.sides)}
            disabled={rolling}
            title={`${dice.label} zar at`}
          >
            <span className="dice-btn__icon">{dice.icon}</span>
            <span className="dice-btn__label">{dice.label}</span>
          </button>
        ))}
      </div>

      {/* 3D Dice Animation */}
      {animating && (
        <div className="dice3d-scene">
          <div className="dice3d-cube dice3d-cube--rolling">
            <div className="dice3d-face dice3d-face--front">{selectedDice}</div>
            <div className="dice3d-face dice3d-face--back">⚔</div>
            <div className="dice3d-face dice3d-face--right">🎲</div>
            <div className="dice3d-face dice3d-face--left">⚡</div>
            <div className="dice3d-face dice3d-face--top">🔥</div>
            <div className="dice3d-face dice3d-face--bottom">💀</div>
          </div>
        </div>
      )}

      {lastResult && !animating && (
        <div
          className="dice-result"
          style={{
            justifyContent: 'center',
            marginTop: 12,
            borderColor:
              lastResult.sides === 20 && lastResult.result === 20
                ? 'var(--gold)'
                : lastResult.sides === 20 && lastResult.result === 1
                ? 'var(--blood-red)'
                : 'var(--border-dark)',
          }}
        >
          <span>d{lastResult.sides} →</span>
          <span
            className="dice-result__value"
            style={{
              color:
                lastResult.sides === 20 && lastResult.result === 20
                  ? 'var(--gold-light)'
                  : lastResult.sides === 20 && lastResult.result === 1
                  ? 'var(--blood-red-glow)'
                  : 'var(--gold)',
            }}
          >
            {lastResult.result}
          </span>
          {lastResult.sides === 20 && lastResult.result === 20 && (
            <span style={{ color: 'var(--gold-light)' }}>🎉 KRİTİK!</span>
          )}
          {lastResult.sides === 20 && lastResult.result === 1 && (
            <span style={{ color: 'var(--blood-red-glow)' }}>💀 FUMBLE!</span>
          )}
        </div>
      )}
    </div>
  );
}
