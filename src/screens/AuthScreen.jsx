import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AuthScreen() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (username.trim().length < 3) {
          setError('Kullanıcı adı en az 3 karakter olmalı');
          setSubmitting(false);
          return;
        }
        await signUp(email, password, username.trim());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="screen flex flex-col items-center justify-center">
        <img src="./assest/logo.png" alt="Vulpax DnD" style={{ width: 80, height: 80, marginBottom: 16, borderRadius: '50%', boxShadow: '0 0 20px rgba(184,148,86,0.3)' }} />
        <h1 className="anim-glow">⚔ VULPAX DND ⚔</h1>
        <p className="text-dim" style={{ marginTop: 16 }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="screen flex flex-col items-center justify-center" style={{ gap: 32 }}>
      <div className="text-center anim-slide">
        <img src="./assest/logo.png" alt="Vulpax DnD" style={{ width: 120, height: 120, marginBottom: 12, borderRadius: '50%', boxShadow: '0 0 30px rgba(184,148,86,0.3)' }} />
        <h1 style={{ fontSize: 42, marginBottom: 8 }}>⚔ VULPAX DND ⚔</h1>
        <p className="text-dim">Karanlık diyarlara adım at</p>
      </div>

      <div className="parchment-panel parchment-panel--ornate anim-slide" style={{ width: 420, animationDelay: '0.1s' }}>
        <h2 className="text-center mb-md">{isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isLogin && (
            <input
              className="input"
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={30}
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && (
            <p className="text-red text-sm" style={{ textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={submitting}
            style={{ marginTop: 8 }}
          >
            {submitting ? '...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="divider" />

        <button
          className="btn btn-ghost w-full btn-sm"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
        >
          {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>
      </div>
    </div>
  );
}
