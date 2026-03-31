import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PatchNotesModal({ onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      setVersions(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="parchment-panel parchment-panel--ornate anim-slide patch-notes-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="patch-notes-header">
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>📜 Sürüm Notları</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="patch-notes-body vulpax-scroll">
          {loading && <p className="text-dim text-center">Yükleniyor...</p>}
          {!loading && versions.length === 0 && (
            <p className="text-dim text-center">Henüz sürüm notu yok.</p>
          )}
          {versions.map((v) => (
            <div key={v.id} className="patch-note-entry">
              <div className="patch-note-version-row">
                <span className="patch-note-version">v{v.version}</span>
                <span className="patch-note-date">
                  {new Date(v.created_at).toLocaleDateString('tr-TR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              </div>
              <div className="patch-note-content">{v.release_notes}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
