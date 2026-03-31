import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export default function UpdateChecker() {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const latest = data[0];
        if (compareVersions(latest.version, APP_VERSION) > 0) {
          setUpdate(latest);
        }
      }
    })();
  }, []);

  if (!update || dismissed) return null;

  return (
    <div className="update-banner">
      <div className="update-banner__content">
        <span className="update-banner__icon">🔄</span>
        <div>
          <strong>Yeni sürüm mevcut: v{update.version}</strong>
          <div className="text-dim text-sm" style={{ marginTop: 2 }}>
            {update.release_notes?.substring(0, 100)}{update.release_notes?.length > 100 ? '...' : ''}
          </div>
        </div>
      </div>
      <div className="update-banner__actions">
        {update.download_url && (
          <button
            className="btn btn-gold btn-sm"
            onClick={() => {
              if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(update.download_url);
              } else {
                window.open(update.download_url, '_blank');
              }
            }}
          >
            İndir
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
    </div>
  );
}
