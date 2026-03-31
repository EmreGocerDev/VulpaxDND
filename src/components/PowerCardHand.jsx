import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function PowerCardHand({ roomId }) {
  const { profile } = useAuthStore();
  const [powers, setPowers] = useState([]);
  const [using, setUsing] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!profile) return;
    fetchPlayerPowers();
  }, [profile]);

  const fetchPlayerPowers = async () => {
    if (!profile) return;
    // Envanterdeki güç kartlarını çek
    const { data: inventory } = await supabase
      .from('user_inventory')
      .select('item_id, quantity')
      .eq('user_id', profile.id)
      .eq('item_type', 'power');

    if (!inventory || inventory.length === 0) {
      setPowers([]);
      return;
    }

    const powerIds = inventory.map((inv) => inv.item_id);
    const { data: powerData } = await supabase
      .from('powers')
      .select('*')
      .in('id', powerIds);

    if (powerData) setPowers(powerData);
  };

  const usePower = async (power) => {
    if (!profile || using) return;
    setUsing(power.id);
    setMessage('');

    try {
      // Aksiyon olarak kaydet
      await supabase.from('room_actions').insert({
        room_id: roomId,
        user_id: profile.id,
        action_type: 'card_use',
        action_value: {
          card_name: power.name,
          effect_type: power.effect_type,
          effect_value: power.effect_value,
          description: power.description,
        },
      });

      setMessage(`${power.name} kullanıldı!`);
    } catch (err) {
      setMessage('Hata: ' + err.message);
    } finally {
      setUsing(null);
    }
  };

  if (powers.length === 0) {
    return (
      <div className="text-center text-dim text-sm" style={{ padding: 8 }}>
        Güç kartın yok. Marketten satın al!
      </div>
    );
  }

  return (
    <div>
      {message && <p className="text-gold text-sm mb-sm text-center">{message}</p>}
      <div className="power-hand">
        {powers.map((power) => (
          <button
            key={power.id}
            className={`power-card power-card--${power.rarity}`}
            onClick={() => usePower(power)}
            disabled={using === power.id}
            title={power.description}
          >
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
        ))}
      </div>
    </div>
  );
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
