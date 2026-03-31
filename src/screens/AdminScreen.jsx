import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'emregocernew@gmail.com';

export default function AdminScreen() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [tab, setTab] = useState('characters'); // characters | powers | titles | lore | charstories
  const [characters, setCharacters] = useState([]);
  const [powers, setPowers] = useState([]);
  const [titles, setTitles] = useState([]);
  const [loreStories, setLoreStories] = useState([]);
  const [charStories, setCharStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingChar, setEditingChar] = useState(null);
  const [editingPower, setEditingPower] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingLore, setEditingLore] = useState(null);
  const [editingCharStory, setEditingCharStory] = useState(null);

  // Auth guard
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="screen flex items-center justify-center">
        <div className="parchment-panel" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: 'var(--blood-red-light)' }}>Erişim Engellendi</h2>
          <p className="text-dim" style={{ marginTop: 8 }}>Bu sayfaya sadece yönetici erişebilir.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginTop: 16 }}>← Lobiye Dön</button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: chars }, { data: pows }, { data: tits }, { data: lore }, { data: cstories }] = await Promise.all([
      supabase.from('characters').select('*').order('created_at', { ascending: false }),
      supabase.from('powers').select('*').order('created_at', { ascending: false }),
      supabase.from('titles').select('*').order('created_at', { ascending: false }),
      supabase.from('lore_stories').select('*').order('sort_order'),
      supabase.from('character_stories').select('*'),
    ]);
    setCharacters(chars || []);
    setPowers(pows || []);
    setTitles(tits || []);
    setLoreStories(lore || []);
    setCharStories(cstories || []);
    setLoading(false);
  };

  // ========== CHARACTER CRUD ==========
  const emptyChar = {
    name: '', health: 100, attack: 10, defense: 10, intelligence: 10, charisma: 10,
    rarity: 'common', gold_cost: 50, description: '', image_placeholder: '/assets/characters/default.png',
    region: '',
  };

  const handleSaveChar = async () => {
    if (!editingChar?.name?.trim()) return;
    setLoading(true);
    if (editingChar.id) {
      const { id, created_at, ...updates } = editingChar;
      await supabase.from('characters').update(updates).eq('id', id);
    } else {
      await supabase.from('characters').insert(editingChar);
    }
    setEditingChar(null);
    await fetchData();
    setLoading(false);
  };

  const handleDeleteChar = async (id) => {
    if (!confirm('Bu karakteri silmek istediğine emin misin?')) return;
    await supabase.from('characters').delete().eq('id', id);
    await fetchData();
  };

  // ========== POWER CRUD ==========
  const emptyPower = {
    name: '', description: '', effect_type: 'saldiri', effect_value: 5,
    cost: 10, rarity: 'common', image_placeholder: '/assets/powers/default.png',
  };

  const EFFECT_TYPES = ['zehir', 'diriltme', 'sersemletme', 'savunma', 'atak', 'can', 'savunmakirici', 'atakkirici', 'saldiri'];
  const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  const handleSavePower = async () => {
    if (!editingPower?.name?.trim()) return;
    setLoading(true);
    if (editingPower.id) {
      const { id, created_at, ...updates } = editingPower;
      await supabase.from('powers').update(updates).eq('id', id);
    } else {
      await supabase.from('powers').insert(editingPower);
    }
    setEditingPower(null);
    await fetchData();
    setLoading(false);
  };

  const handleDeletePower = async (id) => {
    if (!confirm('Bu güç kartını silmek istediğine emin misin?')) return;
    await supabase.from('powers').delete().eq('id', id);
    await fetchData();
  };

  // ========== TITLE CRUD ==========
  const emptyTitle = { name: '', description: '', gold_cost: 200 };

  const handleSaveTitle = async () => {
    if (!editingTitle?.name?.trim()) return;
    setLoading(true);
    if (editingTitle.id) {
      const { id, created_at, ...updates } = editingTitle;
      await supabase.from('titles').update(updates).eq('id', id);
    } else {
      await supabase.from('titles').insert(editingTitle);
    }
    setEditingTitle(null);
    await fetchData();
    setLoading(false);
  };

  const handleDeleteTitle = async (id) => {
    if (!confirm('Bu ünvanı silmek istediğine emin misin?')) return;
    await supabase.from('titles').delete().eq('id', id);
    await fetchData();
  };

  // ========== LORE STORIES CRUD ==========
  const emptyLore = { title: '', content: '', sort_order: 0 };

  const handleSaveLore = async () => {
    if (!editingLore?.title?.trim()) return;
    setLoading(true);
    if (editingLore.id) {
      const { id, created_at, updated_at, ...updates } = editingLore;
      await supabase.from('lore_stories').update(updates).eq('id', id);
    } else {
      await supabase.from('lore_stories').insert(editingLore);
    }
    setEditingLore(null);
    await fetchData();
    setLoading(false);
  };

  const handleDeleteLore = async (id) => {
    if (!confirm('Bu hikayeyi silmek istediğine emin misin?')) return;
    await supabase.from('lore_stories').delete().eq('id', id);
    await fetchData();
  };

  // ========== CHARACTER STORIES CRUD ==========
  const emptyCharStory = { character_id: '', title: '', content: '' };

  const handleSaveCharStory = async () => {
    if (!editingCharStory?.character_id || !editingCharStory?.content?.trim()) return;
    setLoading(true);
    if (editingCharStory.id) {
      const { id, created_at, updated_at, ...updates } = editingCharStory;
      await supabase.from('character_stories').update(updates).eq('id', id);
    } else {
      await supabase.from('character_stories').insert(editingCharStory);
    }
    setEditingCharStory(null);
    await fetchData();
    setLoading(false);
  };

  const handleDeleteCharStory = async (id) => {
    if (!confirm('Bu karakter hikayesini silmek istediğine emin misin?')) return;
    await supabase.from('character_stories').delete().eq('id', id);
    await fetchData();
  };

  const rarityColor = (r) => {
    switch (r) {
      case 'common': return 'var(--text-dim)';
      case 'uncommon': return '#4CAF50';
      case 'rare': return '#2196F3';
      case 'epic': return '#9C27B0';
      case 'legendary': return '#FF9800';
      default: return 'var(--text-dim)';
    }
  };

  return (
    <div className="screen" style={{ padding: '16px 24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="screen__header" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-md">
          <img src="./assest/logo.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>🛡 Admin Paneli</h2>
            <span className="text-dim text-sm">{user.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Lobiye Dön</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-sm" style={{ marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${tab === 'characters' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('characters')}
        >
          ⚔ Karakterler ({characters.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'powers' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('powers')}
        >
          ✨ Güç Kartları ({powers.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'titles' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('titles')}
        >
          🏅 Ünvanlar ({titles.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'lore' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('lore')}
        >
          📖 Hikayeler ({loreStories.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'charstories' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('charstories')}
        >
          📜 Karakter Hikayeleri ({charStories.length})
        </button>
      </div>

      {/* Content */}
      <div className="parchment-panel vulpax-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && <p className="text-dim text-center">Yükleniyor...</p>}

        {/* ======= CHARACTERS TAB ======= */}
        {tab === 'characters' && !loading && (
          <>
            <div className="flex items-center justify-between mb-md">
              <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Karakter Listesi</h3>
              <button className="btn btn-gold btn-sm" onClick={() => setEditingChar({ ...emptyChar })}>+ Yeni Karakter</button>
            </div>

            {/* Edit Form */}
            {editingChar && (
              <div className="parchment-panel" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--gold-dim)' }}>
                <h4 style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingChar.id ? '✏ Düzenle' : '+ Yeni Karakter'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">İsim</span>
                    <input className="input input--sm" value={editingChar.name} onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Açıklama</span>
                    <input className="input input--sm" value={editingChar.description || ''} onChange={(e) => setEditingChar({ ...editingChar, description: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Can</span>
                    <input type="number" className="input input--sm" value={editingChar.health} onChange={(e) => setEditingChar({ ...editingChar, health: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Saldırı</span>
                    <input type="number" className="input input--sm" value={editingChar.attack} onChange={(e) => setEditingChar({ ...editingChar, attack: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Savunma</span>
                    <input type="number" className="input input--sm" value={editingChar.defense} onChange={(e) => setEditingChar({ ...editingChar, defense: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Zeka</span>
                    <input type="number" className="input input--sm" value={editingChar.intelligence} onChange={(e) => setEditingChar({ ...editingChar, intelligence: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Karizma</span>
                    <input type="number" className="input input--sm" value={editingChar.charisma} onChange={(e) => setEditingChar({ ...editingChar, charisma: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Nadirlik</span>
                    <select className="input input--sm" value={editingChar.rarity} onChange={(e) => setEditingChar({ ...editingChar, rarity: e.target.value })}>
                      {RARITIES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Altın Maliyeti</span>
                    <input type="number" className="input input--sm" value={editingChar.gold_cost} onChange={(e) => setEditingChar({ ...editingChar, gold_cost: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Görsel Yolu</span>
                    <input className="input input--sm" placeholder="/assets/characters/dosya.png" value={editingChar.image_placeholder || ''} onChange={(e) => setEditingChar({ ...editingChar, image_placeholder: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Bölge</span>
                    <input className="input input--sm" placeholder="Kuzey Diyarları" value={editingChar.region || ''} onChange={(e) => setEditingChar({ ...editingChar, region: e.target.value })} />
                  </label>
                </div>
                <div className="flex gap-sm" style={{ marginTop: 12 }}>
                  <button className="btn btn-gold btn-sm" onClick={handleSaveChar}>💾 Kaydet</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingChar(null)}>İptal</button>
                </div>
              </div>
            )}

            {/* Character Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-dim)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>İsim</th>
                    <th>❤️</th><th>⚔</th><th>🛡</th><th>🧠</th><th>👑</th>
                    <th>Nadirlik</th><th>💰</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--parchment-mid)' }}>
                      <td style={{ padding: '6px', fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>{c.name}</td>
                      <td style={{ textAlign: 'center' }}>{c.health}</td>
                      <td style={{ textAlign: 'center' }}>{c.attack}</td>
                      <td style={{ textAlign: 'center' }}>{c.defense}</td>
                      <td style={{ textAlign: 'center' }}>{c.intelligence ?? '-'}</td>
                      <td style={{ textAlign: 'center' }}>{c.charisma ?? '-'}</td>
                      <td style={{ textAlign: 'center', color: rarityColor(c.rarity), fontWeight: 700 }}>{c.rarity}</td>
                      <td style={{ textAlign: 'center' }}>{c.gold_cost}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-xs" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditingChar({ ...c })}>✏</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleDeleteChar(c.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ======= POWERS TAB ======= */}
        {tab === 'powers' && !loading && (
          <>
            <div className="flex items-center justify-between mb-md">
              <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Güç Kartları</h3>
              <button className="btn btn-gold btn-sm" onClick={() => setEditingPower({ ...emptyPower })}>+ Yeni Kart</button>
            </div>

            {/* Edit Form */}
            {editingPower && (
              <div className="parchment-panel" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--gold-dim)' }}>
                <h4 style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingPower.id ? '✏ Düzenle' : '+ Yeni Güç Kartı'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">İsim</span>
                    <input className="input input--sm" value={editingPower.name} onChange={(e) => setEditingPower({ ...editingPower, name: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Açıklama</span>
                    <input className="input input--sm" value={editingPower.description} onChange={(e) => setEditingPower({ ...editingPower, description: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Efekt Tipi</span>
                    <select className="input input--sm" value={editingPower.effect_type} onChange={(e) => setEditingPower({ ...editingPower, effect_type: e.target.value })}>
                      {EFFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Efekt Değeri</span>
                    <input type="number" className="input input--sm" value={editingPower.effect_value} onChange={(e) => setEditingPower({ ...editingPower, effect_value: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Maliyet</span>
                    <input type="number" className="input input--sm" value={editingPower.cost} onChange={(e) => setEditingPower({ ...editingPower, cost: Number(e.target.value) })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Nadirlik</span>
                    <select className="input input--sm" value={editingPower.rarity} onChange={(e) => setEditingPower({ ...editingPower, rarity: e.target.value })}>
                      {RARITIES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Görsel Yolu</span>
                    <input className="input input--sm" placeholder="/assets/powers/dosya.png" value={editingPower.image_placeholder || ''} onChange={(e) => setEditingPower({ ...editingPower, image_placeholder: e.target.value })} />
                  </label>
                </div>
                <div className="flex gap-sm" style={{ marginTop: 12 }}>
                  <button className="btn btn-gold btn-sm" onClick={handleSavePower}>💾 Kaydet</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingPower(null)}>İptal</button>
                </div>
              </div>
            )}

            {/* Powers Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-dim)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>İsim</th>
                    <th>Tip</th><th>Değer</th><th>Nadirlik</th><th>💰</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {powers.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--parchment-mid)' }}>
                      <td style={{ padding: '6px', fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>
                        {p.name}
                        <div className="text-dim" style={{ fontSize: 10 }}>{p.description}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 11 }}>{p.effect_type}</td>
                      <td style={{ textAlign: 'center' }}>{p.effect_value}</td>
                      <td style={{ textAlign: 'center', color: rarityColor(p.rarity), fontWeight: 700 }}>{p.rarity}</td>
                      <td style={{ textAlign: 'center' }}>{p.cost}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-xs" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditingPower({ ...p })}>✏</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleDeletePower(p.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ======= TITLES TAB ======= */}
        {tab === 'titles' && !loading && (
          <>
            <div className="flex items-center justify-between mb-md">
              <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Ünvan Listesi</h3>
              <button className="btn btn-gold btn-sm" onClick={() => setEditingTitle({ ...emptyTitle })}>+ Yeni Ünvan</button>
            </div>

            {/* Edit Form */}
            {editingTitle && (
              <div className="parchment-panel" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--gold-dim)' }}>
                <h4 style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingTitle.id ? '✏ Düzenle' : '+ Yeni Ünvan'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">İsim</span>
                    <input className="input input--sm" value={editingTitle.name} onChange={(e) => setEditingTitle({ ...editingTitle, name: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Açıklama</span>
                    <input className="input input--sm" value={editingTitle.description || ''} onChange={(e) => setEditingTitle({ ...editingTitle, description: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Altın Maliyeti</span>
                    <input type="number" className="input input--sm" value={editingTitle.gold_cost} onChange={(e) => setEditingTitle({ ...editingTitle, gold_cost: Number(e.target.value) })} />
                  </label>
                </div>
                <div className="flex gap-sm" style={{ marginTop: 12 }}>
                  <button className="btn btn-gold btn-sm" onClick={handleSaveTitle}>💾 Kaydet</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingTitle(null)}>İptal</button>
                </div>
              </div>
            )}

            {/* Titles Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-dim)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Ünvan</th>
                    <th>Açıklama</th><th>💰</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {titles.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--parchment-mid)' }}>
                      <td style={{ padding: '6px', fontFamily: 'var(--font-heading)', color: '#9C27B0' }}>&lt;{t.name}&gt;</td>
                      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>{t.description}</td>
                      <td style={{ textAlign: 'center' }}>{t.gold_cost}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-xs" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditingTitle({ ...t })}>✏</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleDeleteTitle(t.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ======= LORE STORIES TAB ======= */}
        {tab === 'lore' && !loading && (
          <>
            <div className="flex items-center justify-between mb-md">
              <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Dünya Hikayeleri</h3>
              <button className="btn btn-gold btn-sm" onClick={() => setEditingLore({ ...emptyLore })}>+ Yeni Hikaye</button>
            </div>

            {editingLore && (
              <div className="parchment-panel" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--gold-dim)' }}>
                <h4 style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingLore.id ? '✏ Düzenle' : '+ Yeni Hikaye'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Başlık</span>
                    <input className="input input--sm" value={editingLore.title} onChange={(e) => setEditingLore({ ...editingLore, title: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Sıralama</span>
                    <input type="number" className="input input--sm" value={editingLore.sort_order} onChange={(e) => setEditingLore({ ...editingLore, sort_order: Number(e.target.value) })} />
                  </label>
                </div>
                <label className="flex flex-col gap-xs" style={{ marginTop: 10 }}>
                  <span className="text-dim text-sm">İçerik</span>
                  <textarea className="input input--sm" rows={6} value={editingLore.content} onChange={(e) => setEditingLore({ ...editingLore, content: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                </label>
                <div className="flex gap-sm" style={{ marginTop: 12 }}>
                  <button className="btn btn-gold btn-sm" onClick={handleSaveLore}>💾 Kaydet</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingLore(null)}>İptal</button>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-dim)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Başlık</th>
                    <th>Sıra</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {loreStories.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--parchment-mid)' }}>
                      <td style={{ padding: '6px', fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>
                        {s.title}
                        <div className="text-dim" style={{ fontSize: 10 }}>{s.content?.substring(0, 80)}...</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{s.sort_order}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-xs" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditingLore({ ...s })}>✏</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleDeleteLore(s.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ======= CHARACTER STORIES TAB ======= */}
        {tab === 'charstories' && !loading && (
          <>
            <div className="flex items-center justify-between mb-md">
              <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Karakter Hikayeleri</h3>
              <button className="btn btn-gold btn-sm" onClick={() => setEditingCharStory({ ...emptyCharStory })}>+ Yeni Karakter Hikayesi</button>
            </div>

            {editingCharStory && (
              <div className="parchment-panel" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--gold-dim)' }}>
                <h4 style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingCharStory.id ? '✏ Düzenle' : '+ Yeni Karakter Hikayesi'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Karakter</span>
                    <select className="input input--sm" value={editingCharStory.character_id || ''} onChange={(e) => setEditingCharStory({ ...editingCharStory, character_id: e.target.value })}>
                      <option value="">Karakter seç...</option>
                      {characters.map(c => <option key={c.id} value={c.id}>{c.name} {c.region ? `(${c.region})` : ''}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-xs">
                    <span className="text-dim text-sm">Başlık</span>
                    <input className="input input--sm" value={editingCharStory.title || ''} onChange={(e) => setEditingCharStory({ ...editingCharStory, title: e.target.value })} />
                  </label>
                </div>
                <label className="flex flex-col gap-xs" style={{ marginTop: 10 }}>
                  <span className="text-dim text-sm">Hikaye İçeriği</span>
                  <textarea className="input input--sm" rows={6} value={editingCharStory.content || ''} onChange={(e) => setEditingCharStory({ ...editingCharStory, content: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                </label>
                <div className="flex gap-sm" style={{ marginTop: 12 }}>
                  <button className="btn btn-gold btn-sm" onClick={handleSaveCharStory}>💾 Kaydet</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingCharStory(null)}>İptal</button>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-dim)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Karakter</th>
                    <th style={{ textAlign: 'left' }}>Başlık</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {charStories.map(cs => {
                    const char = characters.find(c => c.id === cs.character_id);
                    return (
                      <tr key={cs.id} style={{ borderBottom: '1px solid var(--parchment-mid)' }}>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>
                          {char?.name || 'Bilinmeyen'}
                          <div className="text-dim" style={{ fontSize: 10 }}>{char?.region || ''}</div>
                        </td>
                        <td style={{ padding: '6px' }}>
                          {cs.title}
                          <div className="text-dim" style={{ fontSize: 10 }}>{cs.content?.substring(0, 60)}...</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex gap-xs" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditingCharStory({ ...cs })}>✏</button>
                            <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleDeleteCharStory(cs.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
