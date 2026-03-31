import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import ActionLog from '../components/ActionLog';
import VoiceChat from '../components/VoiceChat';
import CharacterSelect from '../components/CharacterSelect';
import ChatBox from '../components/ChatBox';

export default function RoomScreen() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const {
    currentRoom, members, actions,
    fetchRoomDetails, subscribeToRoom,
    leaveRoom, startGame,
  } = useRoomStore();
  const [error, setError] = useState('');
  const [gameMode, setGameMode] = useState('simple'); // simple | test

  const isDM = currentRoom?.dm_id === profile?.id;

  useEffect(() => {
    fetchRoomDetails(roomId);
    subscribeToRoom(roomId);
    // Don't unsubscribe on cleanup — GameScreen will re-subscribe with its own channel.
    // Unsubscribing here would kill GameScreen's channel due to the shared store.
  }, [roomId]);

  useEffect(() => {
    if (currentRoom?.status === 'playing') {
      navigate(`/game/${roomId}`, { replace: true });
    }
  }, [currentRoom?.status, roomId, navigate]);

  const handleLeave = async () => {
    if (!profile) return;
    try {
      await leaveRoom(roomId, profile.id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartGame = async () => {
    // Check all non-DM members have selected a character
    const nonDmMembers = members.filter(m => m.user_id !== currentRoom.dm_id);
    const unready = nonDmMembers.filter(m => !m.character_id);
    if (unready.length > 0) {
      const names = unready.map(m => m.profiles?.username || 'Bilinmeyen').join(', ');
      setError(`Şu oyuncular henüz karakter seçmedi: ${names}`);
      return;
    }
    try {
      await startGame(roomId, gameMode);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!currentRoom || !profile) {
    return (
      <div className="screen flex items-center justify-center">
        <p className="text-dim">Oda yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen__header">
        <div className="flex items-center gap-md">
          <img src="./assest/logo.png" alt="" style={{ width: 40, height: 40, borderRadius: '50%', boxShadow: '0 0 16px rgba(184,148,86,0.3)' }} />
          <h1 className="screen__title">🏰 {currentRoom.room_name}</h1>
          <p className="text-dim text-sm">
            Oda Kodu: <strong style={{ color: 'var(--gold)' }}>{currentRoom.room_code}</strong>
            {' | '}
            <span className={`badge badge--${currentRoom.status}`}>
              {currentRoom.status === 'lobby' ? 'Lobide' : 'Oyunda'}
            </span>
          </p>
        </div>
        <div className="flex gap-md">
          {isDM && currentRoom.status === 'lobby' && (
            <div className="flex items-center gap-md">
              <select
                className="input"
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value)}
                style={{ width: 200 }}
              >
                <option value="simple">🧠 Hayal Gücü Modu</option>
                <option value="test">🧪 Test Modu (Tek Kişi)</option>
              </select>
              <button className="btn btn-primary" onClick={handleStartGame}>
                ⚔ Oyunu Başlat
              </button>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLeave}>
            Odadan Ayrıl
          </button>
        </div>
      </div>

      {error && <p className="text-red text-sm mb-md">{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        {/* Left: Players + Dice */}
        <div className="flex flex-col gap-lg">
          {/* Player List */}
          <div className="parchment-panel">
            <h3 className="mb-md">⚔ Oyuncular ({members.length}/{currentRoom.max_players})</h3>
            <div className="flex flex-col gap-md">
              {members.map((member) => (
                <div key={member.id} className="room-card">
                  <div className="flex items-center gap-md">
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--parchment-mid)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, border: '2px solid var(--border-dark)',
                      }}
                    >
                      ⚔
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>
                        {member.profiles?.username || 'Bilinmeyen'}
                      </div>
                      <div className="text-dim text-sm">
                        {member.characters?.name || 'Karakter seçilmedi'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-md">
                    {member.user_id === currentRoom.dm_id && (
                      <span className="badge badge--dm">DM</span>
                    )}
                    <span className={`badge badge--${member.status}`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Character Select */}
          <div className="parchment-panel">
            <CharacterSelect
              userId={profile.id}
              roomId={roomId}
              onSelected={() => fetchRoomDetails(roomId)}
            />
          </div>
        </div>

        {/* Right Sidebar: Chat + Action Log + Voice */}
        <div className="flex flex-col gap-lg">
          <div className="parchment-panel" style={{ flex: 1 }}>
            <h3 className="mb-md">💬 Sohbet</h3>
            <ChatBox roomId={roomId} />
          </div>

          <div className="parchment-panel">
            <h3 className="mb-md">📜 Eylem Kaydı</h3>
            <ActionLog actions={actions} />
          </div>

          <div className="parchment-panel" style={{ position: 'relative' }}>
            <h3 className="mb-md">🎙 Sesli Sohbet</h3>
            <VoiceChat roomId={roomId} />
          </div>
        </div>
      </div>
    </div>
  );
}
