import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthScreen from './screens/AuthScreen';
import LobbyScreen from './screens/LobbyScreen';
import MarketScreen from './screens/MarketScreen';
import RoomScreen from './screens/RoomScreen';
import GameScreen from './screens/GameScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import AdminScreen from './screens/AdminScreen';
import LoreScreen from './screens/LoreScreen';
import { ToastContainer } from './components/Toast';
import { initButtonSounds } from './lib/sounds';

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  if (loading) {
    return (
      <div className="screen flex flex-col items-center justify-center">
        <img src="./assest/logo.png" alt="Vulpax DnD" style={{ width: 80, height: 80, marginBottom: 16, borderRadius: '50%', boxShadow: '0 0 20px rgba(184,148,86,0.3)' }} />
        <h1 className="anim-glow">⚔ VULPAX DND ⚔</h1>
        <p className="text-dim" style={{ marginTop: 16 }}>Yükleniyor...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const audioRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    initialize();
    initButtonSounds();
  }, []);

  // Global background music (pause during game – DM controls music there)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (location.pathname.startsWith('/game/')) {
      audio.pause();
      return;
    }
    const applyVolume = () => {
      const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
      const v = (s.musicVolume ?? 50) / 100 * ((s.volume ?? 80) / 100);
      audio.volume = Math.max(0, Math.min(1, v));
    };
    applyVolume();
    audio.play().catch(() => {});
    window.addEventListener('storage', applyVolume);
    const interval = setInterval(applyVolume, 2000);
    return () => {
      audio.pause();
      window.removeEventListener('storage', applyVolume);
      clearInterval(interval);
    };
  }, [location.pathname]);

  return (
    <div className="app-container">
      <audio ref={audioRef} src="./assest/naturel.mp3" loop preload="auto" />
      <div className="app-bg" style={{ backgroundImage: 'url(./assest/main.png)' }} />
      <ToastContainer />
      <div className="app-content">
        <Routes>
          <Route path="/auth" element={<AuthScreen />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LobbyScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute>
                <MarketScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <RoomScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/:roomId"
            element={
              <ProtectedRoute>
                <GameScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lore"
            element={
              <ProtectedRoute>
                <LoreScreen />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
