import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function InitiativeTracker({ roomId, members, isDM }) {
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [started, setStarted] = useState(false);

  const rollInitiative = () => {
    if (!members || members.length === 0) return;
    const order = members
      .filter((m) => m.status === 'alive' || m.status === 'active')
      .map((m) => ({
        ...m,
        initiative: Math.floor(Math.random() * 20) + 1,
      }))
      .sort((a, b) => b.initiative - a.initiative);

    if (order.length === 0) return;
    setTurnOrder(order);
    setCurrentTurnIdx(0);
    setStarted(true);

    supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: order[0]?.user_id,
      action_type: 'dm_action',
      action_value: {
        message: `⚔ İnisiyatif sırası belirlendi: ${order.map((m, i) => `${i + 1}. ${m.profiles?.username} (${m.initiative})`).join(', ')}`,
      },
    });
  };

  const nextTurn = async () => {
    if (turnOrder.length === 0) return;
    const nextIdx = (currentTurnIdx + 1) % turnOrder.length;
    setCurrentTurnIdx(nextIdx);
    const nextPlayer = turnOrder[nextIdx];
    if (!nextPlayer) return;

    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: nextPlayer.user_id,
      action_type: 'dm_action',
      action_value: {
        message: `🗡 Sıra ${nextPlayer.profiles?.username}'da! (Tur ${Math.floor((currentTurnIdx + 1) / turnOrder.length) + 1})`,
      },
    });
  };

  const endCombat = async () => {
    setStarted(false);
    setTurnOrder([]);
    setCurrentTurnIdx(0);
    if (!members || members.length === 0) return;

    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: members[0]?.user_id,
      action_type: 'dm_action',
      action_value: { message: '🏁 Savaş sona erdi!' },
    });
  };

  if (!started) {
    return (
      <div className="initiative-tracker">
        <div className="text-center">
          <p className="text-dim text-sm mb-md">Savaşı başlatmak için inisiyatif at</p>
          {isDM && (
            <button className="btn btn-primary" onClick={rollInitiative}>
              🎲 İnisiyatif At
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="initiative-tracker">
      <div className="initiative-list">
        {turnOrder.map((m, idx) => (
          <div
            key={m.id}
            className={`initiative-item ${idx === currentTurnIdx ? 'initiative-item--active' : ''} ${m.status === 'dead' ? 'initiative-item--dead' : ''}`}
          >
            <div className="initiative-item__rank">{idx + 1}</div>
            <div className="initiative-item__info">
              <span className="initiative-item__name">{m.profiles?.username}</span>
              <span className="initiative-item__roll">🎲 {m.initiative}</span>
            </div>
            <div className="initiative-item__health">
              ❤️ {m.current_health}
            </div>
            {idx === currentTurnIdx && (
              <span className="initiative-item__indicator">⚔</span>
            )}
          </div>
        ))}
      </div>

      {isDM && (
        <div className="flex gap-md mt-md" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={nextTurn}>
            Sonraki Tur →
          </button>
          <button className="btn btn-ghost btn-sm" onClick={rollInitiative}>
            🔄 Yeniden At
          </button>
          <button className="btn btn-danger btn-sm" onClick={endCombat}>
            Savaşı Bitir
          </button>
        </div>
      )}
    </div>
  );
}
