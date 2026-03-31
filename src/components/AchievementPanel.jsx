import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function AchievementPanel() {
  const { ACHIEVEMENTS, unlockedAchievements, xp, level, xpToNext } = useGameStore();
  const [showAll, setShowAll] = useState(false);

  const xpPercent = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;
  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <div className="achievement-panel">
      {/* XP & Level Section */}
      <div className="achievement-panel__xp">
        <div className="flex items-center justify-between mb-sm">
          <div>
            <span className="text-gold" style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
              ⭐ Seviye {level}
            </span>
          </div>
          <span className="text-dim text-sm">{xp} / {xpToNext} XP</span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar__fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      {/* Achievements */}
      <div className="achievement-panel__header">
        <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)', fontSize: 14 }}>
          🏆 Başarımlar ({unlockedCount}/{totalCount})
        </h4>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Kapat' : 'Tümünü Gör'}
        </button>
      </div>

      <div className="achievement-panel__grid">
        {(showAll ? ACHIEVEMENTS : ACHIEVEMENTS.slice(0, 6)).map((ach) => {
          const unlocked = unlockedAchievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`achievement-card ${unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}`}
              title={ach.desc}
            >
              <div className="achievement-card__icon">{unlocked ? ach.icon : '🔒'}</div>
              <div className="achievement-card__info">
                <div className="achievement-card__name">{unlocked ? ach.name : '???'}</div>
                <div className="achievement-card__desc">{unlocked ? ach.desc : 'Henüz kilidi açılmadı'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
