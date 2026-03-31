import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import FriendsSidebar from '../components/FriendsSidebar';

export default function LobbyScreen() {
  const navigate = useNavigate();
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const { rooms, fetchRooms, createRoom, joinRoom, joinRoomByCode } = useRoomStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRooms();
    fetchProfile();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !profile) return;
    try {
      const room = await createRoom(roomName.trim(), profile.id);
      setShowCreate(false);
      setRoomName('');
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || !profile) return;
    try {
      const room = await joinRoomByCode(joinCode.trim(), profile.id);
      if (room.status === 'playing') {
        navigate(`/game/${room.id}`);
      } else {
        navigate(`/room/${room.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!profile) return;
    try {
      await joinRoom(roomId, profile.id);
      // Check room status to navigate correctly
      const room = rooms.find(r => r.id === roomId);
      if (room?.status === 'playing') {
        navigate(`/game/${roomId}`);
      } else {
        navigate(`/room/${roomId}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="screen lobby-screen">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0, flex: 1, minHeight: 0, position: 'relative', zIndex: 1 }}>
        {/* Main Content */}
        <div style={{ overflowY: 'auto', padding: '0 24px 24px' }}>
          {/* Header */}
          <div className="screen__header">
            <div className="flex items-center gap-md">
              <img src="./assest/logo.png" alt="Vulpax" style={{ width: 48, height: 48, borderRadius: '50%', boxShadow: '0 0 20px rgba(184,148,86,0.3)' }} />
              <div>
                <h1 className="screen__title">⚔ Macera Salonu</h1>
                <p className="text-dim text-sm">Hoş geldin, {profile?.username || 'Maceracı'}</p>
              </div>
            </div>
            <div className="flex items-center gap-md">
              <div className="gold-display">
                <span className="gold-display__icon">🪙</span>
                <span>{profile?.gold_balance || 0}</span>
              </div>
              <button className="btn btn-gold btn-sm" onClick={() => navigate('/market')}>
                Market
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/lore')}>
                📜 Lor
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>
                👤 Profil
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>
                ⚙ Ayarlar
              </button>
              {user?.email === 'emregocernew@gmail.com' && (
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ color: 'var(--blood-red-light)' }}>
                  🛡 Admin
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExitModal(true)}>
                Çıkış
              </button>
            </div>
          </div>

      {/* Actions */}
      <div className="flex gap-md mb-lg">
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setShowJoinCode(false); }}>
          + Oda Oluştur
        </button>
        <button className="btn btn-gold" onClick={() => { setShowJoinCode(true); setShowCreate(false); }}>
          Kod ile Katıl
        </button>
      </div>

      {error && <p className="text-red text-sm mb-md">{error}</p>}

      {/* Create Room Modal */}
      {showCreate && (
        <div className="parchment-panel mb-lg anim-slide" style={{ maxWidth: 500 }}>
          <h3 className="mb-md">Yeni Oda Oluştur</h3>
          <form onSubmit={handleCreateRoom} className="flex gap-md items-center">
            <input
              className="input"
              placeholder="Oda adı..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>Oluştur</button>
            <button type="button" className="btn btn-ghost" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }} onClick={() => setShowCreate(false)}>İptal</button>
          </form>
        </div>
      )}

      {/* Join by Code */}
      {showJoinCode && (
        <div className="parchment-panel mb-lg anim-slide" style={{ maxWidth: 500 }}>
          <h3 className="mb-md">Oda Kodunu Gir</h3>
          <form onSubmit={handleJoinByCode} className="flex gap-md">
            <input
              className="input"
              placeholder="Oda kodu..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={8}
              required
            />
            <button type="submit" className="btn btn-gold">Katıl</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowJoinCode(false)}>İptal</button>
          </form>
        </div>
      )}

      {/* Room List */}
      <div className="divider--ornate divider mb-lg" />
      <h2 className="mb-md">Açık Odalar</h2>

      {rooms.length === 0 ? (
        <div className="parchment-panel text-center">
          <p className="text-dim">Henüz açık oda yok. İlk odayı sen oluştur!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {rooms.map((room) => (
            <div key={room.id} className="room-card">
              <div>
                <div className="room-card__name">{room.room_name}</div>
                <div className="room-card__info">
                  <span>DM: {room.profiles?.username || '?'}</span>
                  <span>Kod: {room.room_code}</span>
                  <span>👥 {room.room_members?.[0]?.count || 0}/{room.max_players}</span>
                </div>
              </div>
              <div className="flex items-center gap-md">
                <span className={`badge badge--${room.status}`}>
                  {room.status === 'lobby' ? 'Lobide' : room.status === 'playing' ? 'Oyunda' : 'Bitti'}
                </span>
                {(room.status === 'lobby' || room.status === 'playing') && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleJoinRoom(room.id)}>
                    Katıl
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>

        {/* Friends Sidebar */}
        <FriendsSidebar />
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="modal-overlay" onClick={() => setShowExitModal(false)}>
          <div className="parchment-panel parchment-panel--ornate anim-slide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '32px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚔</div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 8 }}>Ne yapmak istersin?</h2>
            <p className="text-dim text-sm" style={{ marginBottom: 24 }}>Yolculuğuna ara mı veriyorsun?</p>
            <div className="flex flex-col gap-md">
              <button
                className="btn btn-primary w-full"
                style={{ padding: '12px 0', fontSize: 15 }}
                onClick={() => { setShowExitModal(false); window.electronAPI?.close(); }}
              >
                🏰 Oyundan Çık
              </button>
              <button
                className="btn btn-gold w-full"
                style={{ padding: '12px 0', fontSize: 15 }}
                onClick={() => { setShowExitModal(false); signOut(); }}
              >
                🚪 Hesaptan Çık
              </button>
              <button
                className="btn btn-ghost w-full"
                onClick={() => setShowExitModal(false)}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
