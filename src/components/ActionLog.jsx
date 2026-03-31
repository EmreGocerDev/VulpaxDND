import React from 'react';

function formatAction(action) {
  const username = action.profiles?.username || 'Bilinmeyen';
  const val = action.action_value || {};

  switch (action.action_type) {
    case 'dice_roll': {
      const critText = val.is_critical ? ' 🎉 KRİTİK!' : val.is_fumble ? ' 💀 FUMBLE!' : '';
      return {
        user: username,
        text: `${val.dice_type} attı → ${val.result}${critText}`,
        icon: '🎲',
      };
    }
    case 'card_use':
      return {
        user: username,
        text: `${val.card_name || 'Kart'} kullandı${val.target ? ` → ${val.target}` : ''}`,
        icon: '✨',
      };
    case 'dm_action':
      return {
        user: '👑 DM',
        text: val.message || 'Aksiyon gerçekleştirdi',
        icon: '⚜',
      };
    case 'chat_message':
      return {
        user: username,
        text: val.message || '',
        icon: '💬',
      };
    default:
      return { user: username, text: 'Bilinmeyen aksiyon', icon: '❓' };
  }
}

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}dk`;
  const hours = Math.floor(minutes / 60);
  return `${hours}sa`;
}

export default function ActionLog({ actions }) {
  if (!actions || actions.length === 0) {
    return <p className="text-dim text-sm text-center">Henüz eylem yok.</p>;
  }

  return (
    <div className="action-log">
      {actions.map((action) => {
        const { user, text, icon } = formatAction(action);
        return (
          <div key={action.id} className="action-log__entry anim-fade">
            <span>{icon}</span>
            <span className="action-log__user">{user}</span>
            <span className="action-log__text">{text}</span>
            <span className="action-log__time">{timeAgo(action.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
