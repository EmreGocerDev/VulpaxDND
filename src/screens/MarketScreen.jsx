import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMarketStore } from '../stores/marketStore';
import { useToastStore } from '../stores/toastStore';

const RARITY_ICONS = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
};

function getItemImage(item) {
  if (item?.image_placeholder) {
    // DB stores /assets/... — prepend . for relative path
    const path = item.image_placeholder.startsWith('/') ? '.' + item.image_placeholder : item.image_placeholder;
    return path;
  }
  return null;
}



export default function MarketScreen() {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuthStore();
  const { characters, powers, lootboxes, titles, inventory, fetchMarketData, fetchInventory, buyCharacter, buyPower, openLootbox, toggleEquip, buyTitle, equipTitle, unequipTitle } = useMarketStore();
  const [tab, setTab] = useState('characters');
  const [message, setMessage] = useState('');
  const [lootResult, setLootResult] = useState(null);
  const [purchaseOverlay, setPurchaseOverlay] = useState(null); // { name }
  const purchaseSfxRef = useRef(null);
  const toast = useToastStore();

  const [invSearch, setInvSearch] = useState('');
  const [invFilter, setInvFilter] = useState('all'); // all | character | power | title

  useEffect(() => {
    fetchMarketData();
    if (profile) fetchInventory(profile.id);
  }, [profile]);

  const showPurchaseAnim = (name) => {
    setPurchaseOverlay({ name });
    try {
      if (!purchaseSfxRef.current) {
        purchaseSfxRef.current = new Audio('./assest/sounds/levelbegining.mp3');
      }
      purchaseSfxRef.current.currentTime = 0;
      purchaseSfxRef.current.volume = 0.7;
      purchaseSfxRef.current.play().catch(() => {});
    } catch {}
    setTimeout(() => setPurchaseOverlay(null), 3000);
  };

  const handleBuyCharacter = async (char) => {
    if (!profile) return;
    try {
      await buyCharacter(profile.id, char);
      await fetchProfile();
      showPurchaseAnim(char.name);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBuyPower = async (power) => {
    if (!profile) return;
    try {
      await buyPower(profile.id, power);
      await fetchProfile();
      showPurchaseAnim(power.name);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBuyTitle = async (title) => {
    if (!profile) return;
    try {
      await buyTitle(profile.id, title);
      await fetchProfile();
      showPurchaseAnim(title.name);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEquipTitle = async (titleId) => {
    if (!profile) return;
    try {
      await equipTitle(profile.id, titleId);
      await fetchProfile();
      toast.success('Ünvan takıldı!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUnequipTitle = async () => {
    if (!profile) return;
    try {
      await unequipTitle(profile.id);
      await fetchProfile();
      toast.success('Ünvan çıkarıldı!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenLootbox = async (lootbox) => {
    if (!profile) return;
    try {
      const result = await openLootbox(profile.id, lootbox);
      await fetchProfile();
      setLootResult(result);
      setMessage('');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const ownsItem = (itemId, type) =>
    inventory.some((inv) => inv.item_id === itemId && inv.item_type === type);

  return (
    <div className="screen" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="screen__header">
        <div>
          <h1 className="screen__title">🏪 Market</h1>
          <p className="text-dim text-sm">Güçlen, donan, fethe çık!</p>
        </div>
        <div className="flex items-center gap-md">
          <div className="gold-display">
            <span className="gold-display__icon">🪙</span>
            <span>{profile?.gold_balance || 0}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            ← Lobiye Dön
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-md mb-lg" style={{ flexShrink: 0 }}>
        {[
          { key: 'characters', label: '⚔ Karakterler' },
          { key: 'powers', label: '✨ Güçler' },
          { key: 'titles', label: '🏅 Ünvanlar' },
          { key: 'lootboxes', label: '📦 Kasalar' },
          { key: 'inventory', label: '🎒 Envanter' },
        ].map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => { setTab(t.key); setLootResult(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && <p className="text-gold text-sm mb-md">{message}</p>}

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

      {/* Loot Result Modal */}
      {lootResult && (
        <div className="modal-overlay" onClick={() => setLootResult(null)}>
          <div className="parchment-panel parchment-panel--ornate anim-slide text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-md">🎉 Loot Açıldı!</h2>
            <div className={`card card--${lootResult.rarity}`} style={{ maxWidth: 250, margin: '0 auto 16px' }}>
              <div className="card__image" style={getItemImage(lootResult.item) ? { backgroundImage: `url(${getItemImage(lootResult.item)})` } : {}} />
              <div className="card__body">
                <div className="card__title">{lootResult.item.name}</div>
                <div className="card__rarity" style={{ color: getRarityColor(lootResult.rarity) }}>
                  {RARITY_ICONS[lootResult.rarity]} {lootResult.rarity.toUpperCase()}
                </div>
              </div>
            </div>
            <button className="btn btn-gold" onClick={() => setLootResult(null)}>Harika!</button>
          </div>
        </div>
      )}

      {/* Characters Tab */}
      {tab === 'characters' && (
        <div className="grid-4">
          {characters.map((char) => (
            <div key={char.id} className={`card card--${char.rarity}`}>
              <div className="card__image" style={getItemImage(char) ? { backgroundImage: `url(${getItemImage(char)})` } : {}} />
              <div className="card__body">
                <div className="card__title">{char.name}</div>
                <div className="card__rarity" style={{ color: getRarityColor(char.rarity) }}>
                  {RARITY_ICONS[char.rarity]} {char.rarity}
                </div>
                <div className="card__stats">
                  <span className="card__stat">❤️ {char.health}</span>
                  <span className="card__stat">⚔️ {char.attack}</span>
                  <span className="card__stat">🛡️ {char.defense}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {ownsItem(char.id, 'character') ? (
                    <span className="badge badge--alive">Sahipsin</span>
                  ) : (
                    <button
                      className="btn btn-gold btn-sm w-full"
                      onClick={() => handleBuyCharacter(char)}
                    >
                      🪙 {char.gold_cost} Altın
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Powers Tab */}
      {tab === 'powers' && (
        <div className="grid-4">
          {powers.map((power) => (
            <div key={power.id} className={`card card--${power.rarity}`}>
              <div className="card__image" style={getItemImage(power) ? { backgroundImage: `url(${getItemImage(power)})` } : {}} />
              <div className="card__body">
                <div className="card__title">{power.name}</div>
                <div className="card__rarity" style={{ color: getRarityColor(power.rarity) }}>
                  {RARITY_ICONS[power.rarity]} {power.rarity}
                </div>
                <div className="card__stats">
                  <span className="card__stat">💥 {power.effect_type}</span>
                  <span className="card__stat">⚡ {power.effect_value}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {ownsItem(power.id, 'power') ? (
                    <span className="badge badge--alive">Sahipsin</span>
                  ) : (
                    <button
                      className="btn btn-gold btn-sm w-full"
                      onClick={() => handleBuyPower(power)}
                    >
                      🪙 {power.cost} Altın
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Titles Tab */}
      {tab === 'titles' && (
        <div className="grid-4">
          {titles.map((title) => {
            const owned = inventory.some((inv) => inv.item_id === title.id && inv.item_type === 'title');
            const isEquipped = profile?.equipped_title_id === title.id;
            return (
              <div key={title.id} className="card card--title-style" style={{ textAlign: 'center' }}>
                <div className="card--title-frame">
                  <div className="card--title-frame__name">&lt;{title.name}&gt;</div>
                </div>
                <div className="card__body">
                  <div className="card__title">&lt;{title.name}&gt;</div>
                  <p className="text-dim text-sm" style={{ margin: '6px 0' }}>{title.description}</p>
                  <div style={{ marginTop: 10 }}>
                    {owned ? (
                      isEquipped ? (
                        <button className="btn btn-gold btn-sm w-full" onClick={handleUnequipTitle}>✅ Takılı — Çıkar</button>
                      ) : (
                        <button className="btn btn-primary btn-sm w-full" onClick={() => handleEquipTitle(title.id)}>🏅 Tak</button>
                      )
                    ) : (
                      <button className="btn btn-gold btn-sm w-full" onClick={() => handleBuyTitle(title)}>
                        🪙 {title.gold_cost} Altın
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lootboxes Tab */}
      {tab === 'lootboxes' && (
        <div className="grid-3">
          {lootboxes.map((box) => (
            <div key={box.id} className="card card--rare" style={{ textAlign: 'center' }}>
              <div className="card__image" style={{ fontSize: 64 }}>📦</div>
              <div className="card__body">
                <div className="card__title">{box.name}</div>
                <p className="text-dim text-sm" style={{ margin: '8px 0' }}>{box.description}</p>
                <div className="text-sm mb-sm" style={{ color: 'var(--text-secondary)' }}>
                  {Object.entries(box.drop_rates).map(([rarity, rate]) => (
                    <span key={rarity} style={{ marginRight: 8 }}>
                      {RARITY_ICONS[rarity]} {rate}%
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => handleOpenLootbox(box)}
                >
                  🪙 {box.gold_cost} Altın ile Aç
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div>
          {(() => {
            const equippedPowers = inventory.filter(i => i.item_type === 'power' && i.equipped);
            return (
              <h3 className="mb-md">Envanterin ({inventory.length} eşya) — Kuşanılmış Kartlar: {equippedPowers.length}/10</h3>
            );
          })()}

          {/* Search & Filter Bar */}
          <div className="flex gap-md mb-md items-center" style={{ flexWrap: 'wrap' }}>
            <input
              className="input input--sm"
              placeholder="🔍 Eşya ara..."
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            {[
              { key: 'all', label: 'Tümü' },
              { key: 'character', label: '⚔ Karakter' },
              { key: 'power', label: '✨ Güç' },
              { key: 'title', label: '🏅 Ünvan' },
            ].map((f) => (
              <button
                key={f.key}
                className={`btn ${invFilter === f.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                onClick={() => setInvFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {inventory.length === 0 ? (
            <div className="parchment-panel text-center">
              <p className="text-dim">Envanterin boş. Marketten eşya satın al!</p>
            </div>
          ) : (
            <div className="grid-4">
              {inventory.filter((inv) => {
                if (invFilter !== 'all' && inv.item_type !== invFilter) return false;
                if (invSearch.trim()) {
                  let item;
                  if (inv.item_type === 'character') item = characters.find(c => c.id === inv.item_id);
                  else if (inv.item_type === 'power') item = powers.find(p => p.id === inv.item_id);
                  else if (inv.item_type === 'title') item = titles.find(t => t.id === inv.item_id);
                  if (!item || !item.name.toLowerCase().includes(invSearch.toLowerCase())) return false;
                }
                return true;
              }).map((inv) => {
                let item;
                let typeLabel;
                if (inv.item_type === 'character') {
                  item = characters.find((c) => c.id === inv.item_id);
                  typeLabel = 'Karakter';
                } else if (inv.item_type === 'power') {
                  item = powers.find((p) => p.id === inv.item_id);
                  typeLabel = 'Güç';
                } else if (inv.item_type === 'title') {
                  item = titles.find((t) => t.id === inv.item_id);
                  typeLabel = 'Ünvan';
                }
                if (!item) return null;

                // For title items, show equipped status from profile
                if (inv.item_type === 'title') {
                  const isEquipped = profile?.equipped_title_id === inv.item_id;
                  return (
                    <div key={inv.id} className="card card--title-style">
                      <div className="card--title-frame">
                        <div className="card--title-frame__name">&lt;{item.name}&gt;</div>
                      </div>
                      <div className="card__body">
                        <div className="card__title">&lt;{item.name}&gt;</div>
                        <div className="text-dim text-sm">{typeLabel}</div>
                        {isEquipped ? (
                          <button className="btn btn-gold btn-sm w-full" style={{ marginTop: 8 }} onClick={handleUnequipTitle}>✅ Takılı — Çıkar</button>
                        ) : (
                          <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 8 }} onClick={() => handleEquipTitle(inv.item_id)}>🏅 Tak</button>
                        )}
                      </div>
                    </div>
                  );
                }

                const handleToggle = async () => {
                  try {
                    await toggleEquip(inv.id, profile.id, inv.equipped);
                  } catch (err) {
                    toast.error(err.message);
                  }
                };

                return (
                  <div key={inv.id} className={`card card--${item.rarity || 'common'}`}>
                    <div className="card__image" style={getItemImage(item) ? { backgroundImage: `url(${getItemImage(item)})` } : {}} />
                    <div className="card__body">
                      <div className="card__title">{item.name}</div>
                      <div className="card__rarity" style={{ color: getRarityColor(item.rarity) }}>
                        {RARITY_ICONS[item.rarity]} {item.rarity}
                      </div>
                      <div className="text-dim text-sm">{typeLabel}</div>
                      <button
                        className={`btn ${inv.equipped ? 'btn-gold' : 'btn-ghost'} btn-sm w-full`}
                        style={{ marginTop: 8 }}
                        onClick={handleToggle}
                      >
                        {inv.equipped ? '✅ Kuşanıldı' : 'Kuşan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Purchase Celebration Overlay */}
      {purchaseOverlay && (
        <div className="turn-announce-overlay" onClick={() => setPurchaseOverlay(null)}>
          <div className="turn-announce-overlay__content">
            <div className="turn-announce-overlay__name">{purchaseOverlay.name}</div>
            <div className="turn-announce-overlay__label">✅ Satın Alındı!</div>
            <img src="./assest/logo.png" alt="" className="turn-announce-overlay__logo" />
          </div>
        </div>
      )}
    </div>
  );
}

function getRarityColor(rarity) {
  const colors = {
    common: '#a89278',
    uncommon: '#2d6b3f',
    rare: '#2c4a6b',
    epic: '#6b2d8b',
    legendary: '#b89456',
  };
  return colors[rarity] || colors.common;
}
