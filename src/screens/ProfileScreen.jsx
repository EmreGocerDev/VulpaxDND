import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMarketStore } from '../stores/marketStore';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/toastStore';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile, signOut } = useAuthStore();
  const { inventory, fetchInventory, characters, powers, titles, fetchMarketData } = useMarketStore();
  const toast = useToastStore();
  const [username, setUsername] = useState('');
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ games: 0, wins: 0 });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Password change
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile?.username || '');
      fetchInventory(profile.id);
      fetchMarketData();
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;
    try {
      const { count: games } = await supabase
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      setStats({ games: games || 0, wins: 0 });
    } catch (err) {
      console.error('fetchStats error:', err);
    }
  };

  const handleSaveUsername = async () => {
    if (!profile) return;
    if (!username.trim() || username.trim().length < 3) {
      toast.error('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', profile.id);

    if (error) {
      toast.error('Güncelleme başarısız: ' + error.message);
    } else {
      await fetchProfile();
      setEditing(false);
      toast.success('Profil güncellendi!');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece JPG, PNG, GIF, WEBP dosyaları yüklenebilir');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu en fazla 2 MB olabilir');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', profile.id);

      await fetchProfile();
      toast.success('Profil fotoğrafı güncellendi!');
    } catch (err) {
      toast.error('Yükleme başarısız: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Şifre başarıyla güncellendi!');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
    } catch (err) {
      toast.error('Şifre güncellenemedi: ' + err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const equippedTitle = profile?.equipped_title_id
    ? titles.find(t => t.id === profile.equipped_title_id)
    : null;

  const ownedCharacters = inventory
    .filter((i) => i.item_type === 'character')
    .map((i) => characters.find((c) => c.id === i.item_id))
    .filter(Boolean);

  const ownedPowers = inventory
    .filter((i) => i.item_type === 'power')
    .map((i) => powers.find((p) => p.id === i.item_id))
    .filter(Boolean);

  return (
    <div className="screen">
      <div className="screen__header">
        <div>
          <h1 className="screen__title">👤 Profil</h1>
          <p className="text-dim text-sm">Maceracı bilgilerin</p>
        </div>
        <div className="flex gap-md">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Lobiye Dön</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Profile Info */}
        <div className="flex flex-col gap-lg">
          <div className="parchment-panel parchment-panel--ornate">
            <div className="flex items-center gap-lg mb-lg">
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'var(--parchment-mid)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 40, border: '3px solid var(--gold)',
                  boxShadow: 'var(--shadow-glow-gold)',
                  cursor: 'pointer', overflow: 'hidden',
                  position: 'relative',
                }}
                title="Fotoğraf değiştirmek için tıkla"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '⚔'
                )}
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>
                    ...
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              <div>
                {editing ? (
                  <div className="flex gap-md">
                    <input
                      className="input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={30}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleSaveUsername}>Kaydet</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setUsername(profile?.username || ''); }}>İptal</button>
                  </div>
                ) : (
                  <>
                    <h2 style={{ color: 'var(--gold)' }}>
                      {profile?.username || 'Maceracı'}
                      {equippedTitle && (
                        <span style={{ color: '#9C27B0', fontSize: 16, marginLeft: 8 }}>&lt;{equippedTitle.name}&gt;</span>
                      )}
                    </h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Düzenle</button>
                  </>
                )}
              </div>
            </div>

            <div className="divider" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="text-center">
                <div style={{ fontSize: 28, color: 'var(--gold)' }}>🪙</div>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>
                  {profile?.gold_balance || 0}
                </div>
                <div className="text-dim text-sm">Altın</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 28 }}>🎮</div>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {stats.games}
                </div>
                <div className="text-dim text-sm">Oyun</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 28 }}>🎒</div>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {inventory.length}
                </div>
                <div className="text-dim text-sm">Eşya</div>
              </div>
            </div>
          </div>

          <div className="parchment-panel">
            <h3 className="mb-md">📧 Hesap</h3>
            <p className="text-dim text-sm mb-md">E-posta: {user?.email || '-'}</p>

            {/* Şifre Değiştir */}
            {!changingPassword ? (
              <div className="flex gap-md">
                <button className="btn btn-ghost btn-sm" onClick={() => setChangingPassword(true)}>
                  🔑 Şifre Değiştir
                </button>
                <button className="btn btn-danger btn-sm" onClick={signOut}>
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-sm" style={{ marginTop: 8 }}>
                <div className="divider" />
                <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', fontSize: 14 }}>🔑 Yeni Şifre</p>
                <input
                  className="input"
                  type="password"
                  placeholder="Yeni şifre (min. 6 karakter)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  maxLength={64}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Şifreyi tekrar gir"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  maxLength={64}
                />
                <div className="flex gap-md">
                  <button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={pwLoading}>
                    {pwLoading ? '...' : '✅ Kaydet'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}>
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Inventory Overview */}
        <div className="flex flex-col gap-lg">
          {/* Characters Slider */}
          <div className="parchment-panel">
            <h3 className="mb-md">⚔️ Karakterlerin ({ownedCharacters.length})</h3>
            {ownedCharacters.length === 0 ? (
              <p className="text-dim text-sm">Henüz karakter yok. Marketten satın al!</p>
            ) : (
              <div style={{
                display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
                scrollbarWidth: 'thin', scrollbarColor: 'var(--gold) var(--parchment-dark)'
              }}>
                {ownedCharacters.map((char) => {
                  const rarityColor = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', epic: '#9c27b0', legendary: '#ffc107' }[char.rarity] || 'var(--gold)';
                  return (
                    <div key={char.id} style={{
                      minWidth: 130, background: 'var(--parchment-dark)',
                      border: `2px solid ${rarityColor}`,
                      borderRadius: 10, padding: '12px 10px', textAlign: 'center',
                      boxShadow: `0 0 10px ${rarityColor}44`, flexShrink: 0,
                    }}>
                      <div style={{
                        width: 54, height: 54, borderRadius: '50%',
                        background: 'var(--parchment-mid)', margin: '0 auto 8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, border: `2px solid ${rarityColor}`,
                        overflow: 'hidden'
                      }}>
                        {char.image_path
                          ? <img src={`/assests/characters/${char.image_path}`} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; e.target.parentNode.textContent='⚔️'; }} />
                          : '⚔️'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-heading)', color: rarityColor, fontSize: 13, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {char.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[['❤️', char.health, '#e53935'], ['⚔️', char.attack, '#ffc107'], ['🛡️', char.defense, '#42a5f5']].map(([icon, val, color]) => (
                          <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11 }}>{icon}</span>
                            <div style={{ flex: 1, height: 5, background: 'var(--parchment-mid)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (val / 200) * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', minWidth: 20 }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Powers Slider */}
          <div className="parchment-panel">
            <h3 className="mb-md">✨ Güçlerin ({ownedPowers.length})</h3>
            {ownedPowers.length === 0 ? (
              <p className="text-dim text-sm">Henüz güç kartı yok. Marketten satın al!</p>
            ) : (
              <div style={{
                display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
                scrollbarWidth: 'thin', scrollbarColor: 'var(--gold) var(--parchment-dark)'
              }}>
                {ownedPowers.map((power) => {
                  const rarityColor = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', epic: '#9c27b0', legendary: '#ffc107' }[power.rarity] || 'var(--gold)';
                  const effectIcon = { saldiri: '⚔️', zehir: '☠️', sersemletme: '😵', diriltme: '💚', can: '❤️', savunma: '🛡️', atak: '💥', savunmakirici: '🔓', atakkirici: '💔' }[power.effect_type] || '✨';
                  return (
                    <div key={power.id} style={{
                      minWidth: 110, background: 'var(--parchment-dark)',
                      border: `2px solid ${rarityColor}`,
                      borderRadius: 10, padding: '12px 10px', textAlign: 'center',
                      boxShadow: `0 0 10px ${rarityColor}44`, flexShrink: 0,
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>{effectIcon}</div>
                      <div style={{ fontFamily: 'var(--font-heading)', color: rarityColor, fontSize: 12, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {power.name}
                      </div>
                      <div style={{
                        background: `${rarityColor}22`, border: `1px solid ${rarityColor}66`,
                        borderRadius: 6, padding: '3px 6px', fontSize: 11, color: rarityColor, marginBottom: 4
                      }}>
                        {power.effect_type}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>+{power.effect_value}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
