import React, { useEffect, useRef } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { useAuthStore } from '../stores/authStore';
import VoiceSettings from './VoiceSettings';

export default function VoiceChat({ roomId }) {
  const { profile } = useAuthStore();
  const {
    connected, muted, deafened, peers, localSpeaking,
    connect, disconnect, toggleMute, toggleDeafen,
    enumerateDevices, showSettings, toggleSettings,
    outputVolume, selectedOutputDevice,
  } = useVoiceStore();

  useEffect(() => {
    enumerateDevices();
  }, []);

  const handleConnect = async () => {
    if (!profile) return;
    if (connected) {
      disconnect();
    } else {
      try {
        await connect(roomId, profile.id, profile.username);
      } catch (err) {
        console.error('[Voice] Bağlantı hatası:', err);
      }
    }
  };

  const peerList = Object.entries(peers);

  return (
    <div className="voice-chat">
      {/* Bağlantı durumu */}
      <div className="voice-chat__status">
        <div className="flex items-center gap-sm">
          <span className={`voice-indicator ${connected ? 'voice-indicator--on' : ''}`} />
          <span className="text-sm">
            {connected ? `Bağlı (${peerList.length + 1} kişi)` : 'Bağlı Değil'}
          </span>
        </div>
        <button
          className="voice-settings-btn"
          onClick={toggleSettings}
          title="Ses Ayarları"
        >
          ⚙
        </button>
      </div>

      {/* Bağlı kullanıcılar */}
      {connected && (
        <div className="voice-chat__users">
          {/* Yerel kullanıcı */}
          <div className={`voice-user ${localSpeaking && !muted ? 'voice-user--speaking' : ''}`}>
            <div className="voice-user__avatar">
              {muted ? '🔇' : '🎤'}
            </div>
            <span className="voice-user__name">
              {profile?.username || 'Ben'} (sen)
            </span>
            {muted && <span className="voice-user__muted">🔇</span>}
          </div>

          {/* Uzak kullanıcılar */}
          {peerList.map(([peerId, peerData]) => (
            <RemotePeerAudio
              key={peerId}
              peerId={peerId}
              peerData={peerData}
              outputVolume={outputVolume}
              outputDevice={selectedOutputDevice}
              deafened={deafened}
            />
          ))}
        </div>
      )}

      {/* Kontrol butonları */}
      <div className="voice-chat__controls">
        <button
          className={`btn ${connected ? 'btn-ghost' : 'btn-primary'} btn-sm`}
          onClick={handleConnect}
          style={{ flex: 1 }}
        >
          {connected ? '🔌 Ayrıl' : '🔊 Sesli Kanala Katıl'}
        </button>

        {connected && (
          <>
            <button
              className={`voice-ctrl-btn ${muted ? 'voice-ctrl-btn--active' : ''}`}
              onClick={toggleMute}
              title={muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            >
              {muted ? '🔇' : '🎤'}
            </button>
            <button
              className={`voice-ctrl-btn ${deafened ? 'voice-ctrl-btn--active' : ''}`}
              onClick={toggleDeafen}
              title={deafened ? 'Sesi Aç' : 'Sesi Kapat'}
            >
              {deafened ? '🔇' : '🔊'}
            </button>
          </>
        )}
      </div>

      {/* Ayarlar paneli */}
      {showSettings && <VoiceSettings />}
    </div>
  );
}

// ============================================================
// REMOTE PEER AUDIO – Her uzak kullanıcı için ses elementleri
// ============================================================
function RemotePeerAudio({ peerId, peerData, outputVolume, outputDevice, deafened }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && peerData?.stream) {
      audioRef.current.srcObject = peerData.stream;
    }
  }, [peerData?.stream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = deafened ? 0 : outputVolume;
    }
  }, [outputVolume, deafened]);

  useEffect(() => {
    if (audioRef.current?.setSinkId && outputDevice) {
      audioRef.current.setSinkId(outputDevice).catch(() => {});
    }
  }, [outputDevice]);

  if (!peerData) return null;

  return (
    <div className={`voice-user ${peerData.speaking ? 'voice-user--speaking' : ''}`}>
      <div className="voice-user__avatar">👤</div>
      <span className="voice-user__name">{peerData.username || 'Bilinmeyen'}</span>
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}
