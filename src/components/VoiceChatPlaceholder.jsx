import React, { useState } from 'react';

/**
 * Sesli Sohbet Yer Tutucu Bileşeni
 * İleride Agora.io veya Daily.co entegrasyonu yapılacak.
 * Şu an yer tutucu fonksiyonlarla hazır.
 */

// --- Placeholder API ---
// Bu fonksiyonlar ileride gerçek SDK fonksiyonlarıyla değiştirilecek

async function initVoiceEngine(/* roomId */) {
  // TODO: Agora.io / Daily.co SDK başlat
  console.log('[VoiceChat] Engine initialized (placeholder)');
  return { engineId: 'placeholder' };
}

async function joinVoiceChannel(/* engineId, roomId, token */) {
  // TODO: Sesli kanala katıl
  console.log('[VoiceChat] Joined voice channel (placeholder)');
  return true;
}

async function leaveVoiceChannel(/* engineId */) {
  // TODO: Sesli kanaldan ayrıl
  console.log('[VoiceChat] Left voice channel (placeholder)');
  return true;
}

async function toggleMute(/* engineId, muted */) {
  // TODO: Mikrofonu aç/kapat
  console.log('[VoiceChat] Mute toggled (placeholder)');
  return true;
}

async function toggleDeafen(/* engineId, deafened */) {
  // TODO: Sesi kapat/aç
  console.log('[VoiceChat] Deafen toggled (placeholder)');
  return true;
}

// --- Component ---

export default function VoiceChatPlaceholder({ roomId }) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const handleConnect = async () => {
    if (connected) {
      await leaveVoiceChannel();
      setConnected(false);
    } else {
      await initVoiceEngine();
      await joinVoiceChannel();
      setConnected(true);
    }
  };

  const handleMute = async () => {
    await toggleMute(!muted);
    setMuted(!muted);
  };

  const handleDeafen = async () => {
    await toggleDeafen(!deafened);
    setDeafened(!deafened);
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <span className="text-dim text-sm">
          {connected ? '🟢 Bağlı' : '🔴 Bağlı Değil'}
        </span>
        <span className="text-dim" style={{ fontSize: 10 }}>
          (Yer tutucu – ileride Agora/Daily.co)
        </span>
      </div>

      <div className="flex gap-md">
        <button
          className={`btn ${connected ? 'btn-ghost' : 'btn-primary'} btn-sm`}
          onClick={handleConnect}
          style={{ flex: 1 }}
        >
          {connected ? '🔌 Ayrıl' : '🔊 Katıl'}
        </button>

        {connected && (
          <>
            <button
              className={`btn btn-sm ${muted ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleMute}
            >
              {muted ? '🔇' : '🎤'}
            </button>
            <button
              className={`btn btn-sm ${deafened ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleDeafen}
            >
              {deafened ? '🔇' : '🔊'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
