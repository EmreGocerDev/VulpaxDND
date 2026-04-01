import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AuthScreen() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading, resetPassword, updatePassword } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Deep link'ten gelen şifre sıfırlama hash'ini kontrol et
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsLogin(false);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isForgotPassword) {
        // Şifre sıfırlama e-postası gönder
        await resetPassword(email.trim());
        setResetEmailSent(true);
        setSubmitting(false);
        return;
      } else if (isResetPassword) {
        // Yeni şifre belirle
        if (newPassword !== confirmPassword) {
          setError('Şifreler eşleşmiyor');
          setSubmitting(false);
          return;
        }
        if (newPassword.length < 6) {
          setError('Şifre en az 6 karakter olmalı');
          setSubmitting(false);
          return;
        }
        await updatePassword(newPassword);
        // Başarılı - hash'i temizle ve giriş ekranına dön
        window.location.hash = '';
        setIsResetPassword(false);
        setIsLogin(true);
        setError('');
        setSubmitting(false);
        return;
      } else if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        if (username.trim().length < 3) {
          setError('Kullanıcı adı en az 3 karakter olmalı');
          setSubmitting(false);
          return;
        }
        const emailTrimmed = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
          setError('Geçerli bir e-posta adresi girin');
          setSubmitting(false);
          return;
        }
        const result = await signUp(emailTrimmed, password, username.trim());
        if (!result.session) {
          setSignUpSuccess(true);
          setSubmitting(false);
          return;
        }
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

      {signUpSuccess && (
        <div className="parchment-panel parchment-panel--ornate anim-slide" style={{ width: 460, animationDelay: '0.1s', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📜✉️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 12 }}>Mektup Yola Çıktı!</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15 }}>
            Cesur maceracı, krallığımıza hoş geldin!<br />
            Senin için büyülü bir onay mektubu gönderdik.<br />
            <strong style={{ color: 'var(--gold)' }}>E-posta kutunu kontrol et</strong> ve mektubu onaylayarak
            diyarlara adımını at.
          </p>
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'rgba(184,148,86,0.1)', border: '1px solid rgba(184,148,86,0.25)', fontSize: 13, color: 'var(--text-secondary)' }}>
            ⚔ Spam klasörünü de kontrol etmeyi unutma, mektup bazen karanlık diyarlara düşebilir.
          </div>
          <button
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: 20 }}
            onClick={() => { setSignUpSuccess(false); setIsLogin(true); }}
          >
            ⚔ Giriş Ekranına Dön
          </button>
        </div>
      )}

      {resetEmailSent && (
        <div className="parchment-panel parchment-panel--ornate anim-slide" style={{ width: 460, animationDelay: '0.1s', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📜🔑</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 12 }}>Şifre Sıfırlama Mektubu Gönderildi!</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15 }}>
            E-posta kutunu kontrol et.<br />
            <strong style={{ color: 'var(--gold)' }}>Mektupdaki bağlantıya tıklayarak</strong><br />
            yeni şifreni belirleyebilirsin.
          </p>
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'rgba(184,148,86,0.1)', border: '1px solid rgba(184,148,86,0.25)', fontSize: 13, color: 'var(--text-secondary)' }}>
            ⚔ Birkaç dakika içinde gelmezse spam klasörünü kontrol et.
          </div>
          <button
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: 20 }}
            onClick={() => { setResetEmailSent(false); setIsForgotPassword(false); setIsLogin(true); }}
          >
            ⚔ Giriş Ekranına Dön
          </button>
        </div>
      )}

      {!signUpSuccess && !resetEmailSent && isResetPassword && (
        <div className="parchment-panel parchment-panel--ornate anim-slide" style={{ width: 420, animationDelay: '0.1s' }}>
          <h2 className="text-center mb-md">🔑 Yeni Şifre Belirle</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="password"
              placeholder="Yeni Şifre"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              className="input"
              type="password"
              placeholder="Yeni Şifre (Tekrar)"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {submitting ? '...' : 'Şifreyi Değiştir'}
            </button>
          </form>
        </div>
      )}

      {!signUpSuccess && !resetEmailSent && !isResetPassword && isForgotPassword && (
        <div className="parchment-panel parchment-panel--ornate anim-slide" style={{ width: 420, animationDelay: '0.1s' }}>
          <h2 className="text-center mb-md">🔑 Şifremi Unuttum</h2>

          <p className="text-dim text-sm text-center" style={{ marginBottom: 16 }}>
            E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              {submitting ? '...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>

          <div className="divider" />

          <button
            className="btn btn-ghost w-full btn-sm"
            onClick={() => { setIsForgotPassword(false); setIsLogin(true); setError(''); }}
          >
            ← Giriş ekranına dön
          </button>
        </div>
      )}

      {!signUpSuccess && !resetEmailSent && !isResetPassword && !isForgotPassword && (
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

        {isLogin && (
          <button
            className="btn btn-ghost w-full btn-sm"
            style={{ marginBottom: 8 }}
            onClick={() => { setIsForgotPassword(true); setIsLogin(false); setError(''); }}
          >
            🔑 Şifremi Unuttum
          </button>
        )}

        <button
          className="btn btn-ghost w-full btn-sm"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
        >
          {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>
      </div>
      )}
    </div>
  );
}
