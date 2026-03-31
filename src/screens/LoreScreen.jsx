import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function LoreScreen() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [charStories, setCharStories] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoreData();
  }, []);

  const fetchLoreData = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: cs }] = await Promise.all([
      supabase.from('lore_stories').select('*').order('sort_order'),
      supabase.from('characters').select('*').order('name'),
      supabase.from('character_stories').select('*'),
    ]);
    setStories(s || []);
    setCharacters(c || []);
    setCharStories(cs || []);
    setLoading(false);
  };

  const getCharImage = (char) => {
    if (char?.image_placeholder) {
      return char.image_placeholder.startsWith('/') ? '.' + char.image_placeholder : char.image_placeholder;
    }
    return null;
  };

  const getCharStory = (charId) => charStories.find(cs => cs.character_id === charId);

  // Group characters by region
  const regions = {};
  characters.forEach(c => {
    const r = c.region || 'Bilinmeyen Diyar';
    if (!regions[r]) regions[r] = [];
    regions[r].push(c);
  });

  if (loading) {
    return (
      <div className="screen flex items-center justify-center">
        <p className="text-gold anim-glow">Tarih sayfaları açılıyor...</p>
      </div>
    );
  }

  return (
    <div className="screen" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="screen__header">
        <div className="flex items-center gap-md">
          <div style={{ fontSize: 32 }}>📜</div>
          <div>
            <h1 className="screen__title">Lor — Dünya Tarihi</h1>
            <p className="text-dim text-sm">Vulpax dünyasının hikayeleri ve efsaneleri</p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          ← Lobiye Dön
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 0 24px' }} className="vulpax-scroll">

        {/* World Map */}
        <div className="lore-map-section">
          <div className="lore-map-frame">
            <img src="./assest/map.png" alt="Dünya Haritası" className="lore-map-img" />
          </div>
          <div className="lore-map-title">⚜ Vulpax Dünyası Haritası ⚜</div>
        </div>

        {/* Main Lore Stories */}
        {stories.length > 0 && (
          <div className="lore-section">
            <h2 className="lore-section__heading">📖 Dünya Hikayeleri</h2>
            <div className="lore-stories-grid">
              {stories.map(story => (
                <div key={story.id} className="lore-story-card">
                  <div className="lore-story-card__header">
                    <span className="lore-story-card__ornament">⚜</span>
                    <h3 className="lore-story-card__title">{story.title}</h3>
                    <span className="lore-story-card__ornament">⚜</span>
                  </div>
                  <div className="lore-story-card__content">{story.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Characters by Region */}
        <div className="lore-section">
          <h2 className="lore-section__heading">⚔ Karakterler & Bölgeler</h2>
          {Object.entries(regions).map(([regionName, chars]) => (
            <div key={regionName} className="lore-region">
              <div className="lore-region__header">
                <div className="lore-region__line" />
                <span className="lore-region__name">🏰 {regionName}</span>
                <div className="lore-region__line" />
              </div>
              <div className="lore-chars-grid">
                {chars.map(char => {
                  const story = getCharStory(char.id);
                  const img = getCharImage(char);
                  return (
                    <div
                      key={char.id}
                      className={`lore-char-card ${selectedChar === char.id ? 'lore-char-card--active' : ''}`}
                      onClick={() => setSelectedChar(selectedChar === char.id ? null : char.id)}
                    >
                      <div className="lore-char-card__image" style={img ? { backgroundImage: `url(${img})` } : {}}>
                        <div className="lore-char-card__overlay">
                          <div className="lore-char-card__name">{char.name}</div>
                          <div className="lore-char-card__region">{char.region || 'Bilinmeyen'}</div>
                        </div>
                      </div>
                      {selectedChar === char.id && (
                        <div className="lore-char-card__story anim-slide">
                          <div className="lore-char-card__stats">
                            <span>❤️ {char.health}</span>
                            <span>⚔️ {char.attack}</span>
                            <span>🛡️ {char.defense}</span>
                            <span className="text-gold">{char.rarity?.toUpperCase()}</span>
                          </div>
                          {char.description && (
                            <p className="lore-char-card__desc">{char.description}</p>
                          )}
                          {story ? (
                            <div className="lore-char-card__lore">
                              <div className="lore-char-card__lore-title">📜 {story.title || 'Hikaye'}</div>
                              <p>{story.content}</p>
                            </div>
                          ) : (
                            <p className="text-dim" style={{ fontStyle: 'italic', fontSize: 12 }}>Bu karakterin hikayesi henüz yazılmamış...</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
