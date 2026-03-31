import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function getCharImage(char) {
  if (char?.image_placeholder) {
    return char.image_placeholder.startsWith('/') ? '.' + char.image_placeholder : char.image_placeholder;
  }
  return null;
}

export default function CharacterSelect({ userId, roomId, onSelected }) {
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSelectedMsg, setShowSelectedMsg] = useState(false);
  const [confirmedChar, setConfirmedChar] = useState(null);

  useEffect(() => {
    fetchOwnedCharacters();
  }, [userId]);

  const fetchOwnedCharacters = async () => {
    if (!userId) { setLoading(false); return; }
    // Envanterdeki karakter ID'lerini çek
    const { data: inventory } = await supabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_type', 'character');

    if (!inventory || inventory.length === 0) {
      setCharacters([]);
      setLoading(false);
      return;
    }

    const charIds = inventory.map((inv) => inv.item_id);
    const { data: chars } = await supabase
      .from('characters')
      .select('*')
      .in('id', charIds);

    setCharacters(chars || []);
    setLoading(false);
  };

  const confirmSelection = async () => {
    if (!selected) return;

    // room_members tablosunda character_id ve current_health güncelle
    const { error } = await supabase
      .from('room_members')
      .update({
        character_id: selected.id,
        current_health: selected.health,
      })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (!error) {
      // Broadcast character selection to all players
      await supabase.from('room_actions').insert({
        room_id: roomId,
        user_id: userId,
        action_type: 'dm_action',
        action_value: {
          message: `⚔ Karakter seçildi: ${selected.name}`,
          charSelected: true,
          charName: selected.name,
          charHealth: selected.health,
          charAttack: selected.attack,
          charDefense: selected.defense,
          charRarity: selected.rarity,
          charId: selected.id,
        },
      });

      setConfirmedChar(selected);
      setShowSelectedMsg(true);
      setTimeout(() => {
        setShowSelectedMsg(false);
        if (onSelected) onSelected(selected);
      }, 2500);
    }
  };

  if (loading) {
    return <p className="text-dim text-sm">Karakterler yükleniyor...</p>;
  }

  if (characters.length === 0) {
    return (
      <div className="text-center">
        <p className="text-dim text-sm mb-md">Hiç karakterin yok!</p>
        <p className="text-dim text-sm">Marketten bir karakter satın al.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-md text-center">⚔ Karakter Seç</h3>
      <div className="character-select-grid">
        {characters.map((char) => (
          <div
            key={char.id}
            className={`character-select-card ${selected?.id === char.id ? 'character-select-card--selected' : ''} card--${char.rarity}`}
            onClick={() => setSelected(char)}
          >
            <div
              className="character-select-card__image"
              style={getCharImage(char) ? { backgroundImage: `url(${getCharImage(char)})` } : { background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-dim)' }}
            >{!getCharImage(char) && '⚔️'}</div>
            <div className="character-select-card__info">
              <div className="card__title">{char.name}</div>
              <div className="card__stats">
                <span className="card__stat">❤️ {char.health}</span>
                <span className="card__stat">⚔️ {char.attack}</span>
                <span className="card__stat">🛡️ {char.defense}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <button
          className="btn btn-primary w-full"
          style={{ marginTop: 12 }}
          onClick={confirmSelection}
        >
          {selected.name} ile Savaş!
        </button>
      )}

      {/* Big character selected overlay */}
      {showSelectedMsg && confirmedChar && (
        <div className="char-selected-overlay">
          <div className="char-selected-overlay__content">
            <div
              className="char-selected-overlay__image"
              style={getCharImage(confirmedChar) ? { backgroundImage: `url(${getCharImage(confirmedChar)})` } : { background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--text-dim)' }}
            >{!getCharImage(confirmedChar) && '⚔️'}</div>
            <div className="char-selected-overlay__text">Bu Karakter Seçildi!</div>
            <div className="char-selected-overlay__name">{confirmedChar.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
