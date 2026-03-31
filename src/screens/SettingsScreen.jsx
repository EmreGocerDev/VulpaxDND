import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const [settings, setSettings] = useState(() => loadSettings());

  function loadSettings() {
    try {
      const saved = localStorage.getItem('vulpax_settings');
      return saved ? JSON.parse(saved) : getDefaults();
    } catch {
      return getDefaults();
    }
  }

  function getDefaults() {
    return {
      volume: 80,
      musicVolume: 50,
      sfxVolume: 70,
      voiceVolume: 100,
      language: 'tr',
      theme: 'dark-medieval',
      showHealthBars: true,
      showDamageNumbers: true,
      chatFontSize: 14,
      notificationsEnabled: true,
      autoRollInitiative: false,
      reducedAnimations: false,
      diceAnimation: true,
    };
  }

  const updateSetting = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('vulpax_settings', JSON.stringify(settings));
  };

  const handleReset = () => {
    const defaults = getDefaults();
    setSettings(defaults);
    localStorage.setItem('vulpax_settings', JSON.stringify(defaults));
  };

  // Auto-save on change
  useEffect(() => {
    localStorage.setItem('vulpax_settings', JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="screen" style={{ padding: '24px 48px', overflowY: 'auto' }}>
      <div className="screen__header mb-lg">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>⚙ Ayarlar</h2>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Geri</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900, margin: '0 auto' }}>
        {/* Audio Settings */}
        <div className="parchment-panel" style={{ padding: 20 }}>
          <h3 className="text-gold mb-md" style={{ fontSize: 16 }}>🔊 Ses Ayarları</h3>

          <SettingSlider label="Ana Ses" value={settings.volume} onChange={(v) => updateSetting('volume', v)} icon="🔊" />
          <SettingSlider label="Müzik" value={settings.musicVolume} onChange={(v) => updateSetting('musicVolume', v)} icon="🎵" />
          <SettingSlider label="Efekt Sesleri" value={settings.sfxVolume} onChange={(v) => updateSetting('sfxVolume', v)} icon="🔔" />
          <SettingSlider label="Sesli Sohbet" value={settings.voiceVolume} onChange={(v) => updateSetting('voiceVolume', v)} icon="🎙️" />
        </div>

        {/* Display Settings */}
        <div className="parchment-panel" style={{ padding: 20 }}>
          <h3 className="text-gold mb-md" style={{ fontSize: 16 }}>🎨 Görüntü Ayarları</h3>

          <SettingToggle label="Sağlık Çubukları" value={settings.showHealthBars} onChange={(v) => updateSetting('showHealthBars', v)} />
          <SettingToggle label="Hasar Sayıları" value={settings.showDamageNumbers} onChange={(v) => updateSetting('showDamageNumbers', v)} />
          <SettingToggle label="Zar Animasyonu" value={settings.diceAnimation} onChange={(v) => updateSetting('diceAnimation', v)} />
          <SettingToggle label="Azaltılmış Animasyonlar" value={settings.reducedAnimations} onChange={(v) => updateSetting('reducedAnimations', v)} />
          <SettingToggle label="Tam Ekran" value={settings.fullscreen || false} onChange={(v) => {
            updateSetting('fullscreen', v);
            if (window.electronAPI?.fullscreen) {
              window.electronAPI.fullscreen();
            } else {
              if (v) document.documentElement.requestFullscreen?.();
              else document.exitFullscreen?.();
            }
          }} />

          <div className="setting-row">
            <label className="text-sm">Sohbet Yazı Boyutu</label>
            <select
              className="input input--sm"
              value={settings.chatFontSize}
              onChange={(e) => updateSetting('chatFontSize', Number(e.target.value))}
            >
              <option value={12}>Küçük</option>
              <option value={14}>Normal</option>
              <option value={16}>Büyük</option>
              <option value={18}>Çok Büyük</option>
            </select>
          </div>
        </div>

        {/* Game Settings */}
        <div className="parchment-panel" style={{ padding: 20 }}>
          <h3 className="text-gold mb-md" style={{ fontSize: 16 }}>🎮 Oyun Ayarları</h3>

          <SettingToggle label="Bildirimler" value={settings.notificationsEnabled} onChange={(v) => updateSetting('notificationsEnabled', v)} />
          <SettingToggle label="Otomatik İnisiyatif Atma" value={settings.autoRollInitiative} onChange={(v) => updateSetting('autoRollInitiative', v)} />

          <div className="setting-row">
            <label className="text-sm">Dil / Language</label>
            <select
              className="input input--sm"
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
            >
              <option value="tr">🇹🇷 Türkçe</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>

        {/* Account Info */}
        <div className="parchment-panel" style={{ padding: 20 }}>
          <h3 className="text-gold mb-md" style={{ fontSize: 16 }}>👤 Hesap Bilgileri</h3>
          <div className="setting-row">
            <span className="text-dim text-sm">Kullanıcı Adı</span>
            <span className="text-sm">{profile?.username || '-'}</span>
          </div>
          <div className="setting-row">
            <span className="text-dim text-sm">E-posta</span>
            <span className="text-sm">{user?.email || '-'}</span>
          </div>
          <div className="setting-row">
            <span className="text-dim text-sm">Altın</span>
            <span className="text-gold text-sm">🪙 {profile?.gold_balance || 0}</span>
          </div>
          <div className="setting-row">
            <span className="text-dim text-sm">Kayıt Tarihi</span>
            <span className="text-sm">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-md mt-lg" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave}>💾 Kaydet</button>
        <button className="btn btn-ghost" onClick={handleReset}>🔄 Varsayılana Dön</button>
      </div>
    </div>
  );
}

function SettingSlider({ label, value, onChange, icon }) {
  return (
    <div className="setting-row">
      <label className="text-sm">{icon} {label}</label>
      <div className="flex items-center gap-sm">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="settings-slider"
        />
        <span className="text-dim text-sm" style={{ width: 32, textAlign: 'right' }}>{value}%</span>
      </div>
    </div>
  );
}

function SettingToggle({ label, value, onChange }) {
  return (
    <div className="setting-row">
      <label className="text-sm">{label}</label>
      <button
        className={`settings-toggle ${value ? 'settings-toggle--on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="settings-toggle__knob" />
      </button>
    </div>
  );
}
