import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import FriendsSidebar from '../components/FriendsSidebar';
import PatchNotesModal from '../components/PatchNotesModal';
import UpdateChecker from '../components/UpdateChecker';
import GuideBook from '../components/GuideBook';
import CoatOfArmsSlider from '../components/CoatOfArmsSlider';

export default function LobbyScreen() {
  const navigate = useNavigate();
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const { rooms, fetchRooms, createRoom, joinRoom, joinRoomByCode } = useRoomStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [showGuideBook, setShowGuideBook] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(null); // roomId for password prompt
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
      const room = await createRoom(roomName.trim(), profile.id, roomPassword);
      setShowCreate(false);
      setRoomName('');
      setRoomPassword('');
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || !profile) return;
    try {
      const room = await joinRoomByCode(joinCode.trim(), profile.id, joinPassword);
      if (room.status === 'playing') {
        navigate(`/game/${room.id}`);
      } else {
        navigate(`/room/${room.id}`);
      }
    } catch (err) {
      if (err.message === 'ROOM_PASSWORD_REQUIRED') {
        setError('Bu oda şifre korumalı. Lütfen şifreyi girin.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleJoinRoom = async (roomId, password = null) => {
    if (!profile) return;
    try {
      await joinRoom(roomId, profile.id, password);
      const room = rooms.find(r => r.id === roomId);
      if (room?.status === 'playing') {
        navigate(`/game/${roomId}`);
      } else {
        navigate(`/room/${roomId}`);
      }
    } catch (err) {
      if (err.message === 'ROOM_PASSWORD_REQUIRED') {
        setShowPasswordPrompt(roomId);
        setJoinPassword('');
      } else {
        setError(err.message);
      }
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
          <form onSubmit={handleCreateRoom} className="flex flex-col gap-md">
            <div className="flex gap-md items-center">
              <input
                className="input"
                placeholder="Oda adı..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={50}
                required
                style={{ flex: 1 }}
              />
            </div>
            <div className="flex gap-md items-center">
              <input
                className="input"
                type="password"
                placeholder="Oda şifresi (opsiyonel)"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                maxLength={30}
                style={{ flex: 1 }}
              />
              <span className="text-dim text-sm" style={{ whiteSpace: 'nowrap' }}>🔒</span>
            </div>
            <div className="flex gap-md">
              <button type="submit" className="btn btn-primary" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>Oluştur</button>
              <button type="button" className="btn btn-ghost" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }} onClick={() => { setShowCreate(false); setRoomPassword(''); }}>İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Join by Code */}
      {showJoinCode && (
        <div className="parchment-panel mb-lg anim-slide" style={{ maxWidth: 500 }}>
          <h3 className="mb-md">Oda Kodunu Gir</h3>
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-md">
            <div className="flex gap-md">
              <input
                className="input"
                placeholder="Oda kodu..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={8}
                required
              />
            </div>
            <div className="flex gap-md">
              <input
                className="input"
                type="password"
                placeholder="Oda şifresi (varsa)"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="flex gap-md">
              <button type="submit" className="btn btn-gold">Katıl</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowJoinCode(false); setJoinPassword(''); }}>İptal</button>
            </div>
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
                <div className="room-card__name">
                  {room.room_password && <span title="Şifre korumalı">🔒 </span>}
                  {room.room_name}
                </div>
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

      {/* Ülke Armaları Slider - Sadece Sol Kısımda */}
      <CoatOfArmsSlider />

      {/* Room Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="modal-overlay" onClick={() => setShowPasswordPrompt(null)}>
          <div className="parchment-panel parchment-panel--ornate anim-slide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '32px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 8 }}>Oda Şifresi Gerekli</h2>
            <p className="text-dim text-sm" style={{ marginBottom: 16 }}>Bu oda şifre korumalı. Girmek için şifreyi yaz.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleJoinRoom(showPasswordPrompt, joinPassword);
              setShowPasswordPrompt(null);
            }} className="flex flex-col gap-md">
              <input
                className="input"
                type="password"
                placeholder="Oda şifresi..."
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                autoFocus
                required
              />
              {error && <p className="text-red text-sm">{error}</p>}
              <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                <button type="submit" className="btn btn-primary">Katıl</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowPasswordPrompt(null); setJoinPassword(''); }}>İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Version Footer */}
      <div className="version-footer">
        <span className="version-footer__copyright">Vulpax © 2026</span>
        <span className="version-footer__version">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</span>
        <button className="version-footer__patch-btn" onClick={() => setShowPatchNotes(true)} title="Sürüm Notları">
          📋
        </button>
      </div>

      {/* Patch Notes Modal */}
      {showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}

      {/* Floating Guide Book Button */}
      <button 
        className="floating-guidebook-btn" 
        onClick={() => setShowGuideBook(true)}
        title="Rehber"
      >
        <img src="./assest/book/book.png" alt="Rehber" />
      </button>

      {/* Guide Book */}
      {showGuideBook && <GuideBook onClose={() => setShowGuideBook(false)} />}

      {/* Update Checker */}
      <UpdateChecker />
    </div>
  );
}
