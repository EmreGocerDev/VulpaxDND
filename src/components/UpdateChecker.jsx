import React, { useEffect, useState } from 'react';

export default function UpdateChecker() {
  const [status, setStatus] = useState(null); // checking | available | downloading | downloaded | error | not-available
  const [info, setInfo] = useState({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((data) => {
      setStatus(data.status);
      setInfo(data);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  if (dismissed || !status || status === 'not-available' || status === 'checking') return null;

  return (
    <div className="update-banner">
      <div className="update-banner__content">
        <span className="update-banner__icon">
          {status === 'downloading' ? '⏬' : status === 'downloaded' ? '✅' : status === 'error' ? '⚠️' : '🔄'}
        </span>
        <div>
          {status === 'available' && (
            <strong>Yeni sürüm bulundu{info.version ? `: v${info.version}` : ''}! İndiriliyor...</strong>
          )}
          {status === 'downloading' && (
            <>
              <strong>Güncelleme indiriliyor... %{info.percent || 0}</strong>
              <div className="update-progress-bar">
                <div className="update-progress-bar__fill" style={{ width: `${info.percent || 0}%` }} />
              </div>
            </>
          )}
          {status === 'downloaded' && (
            <strong>Güncelleme hazır! Yüklemek için tıklayın.</strong>
          )}
          {status === 'error' && (
            <div>
              <strong>Güncelleme hatası</strong>
              <div className="text-dim text-sm">{info.message}</div>
            </div>
          )}
        </div>
      </div>
      <div className="update-banner__actions">
        {status === 'downloaded' && (
          <button
            className="btn btn-gold btn-sm"
            onClick={() => window.electronAPI?.installUpdate()}
          >
            Şimdi Yükle
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
    </div>
  );
}
