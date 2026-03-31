import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function DMNotes() {
  const { dmNotes, addDmNote, removeDmNote, togglePinNote } = useGameStore();
  const [noteText, setNoteText] = useState('');
  const [filter, setFilter] = useState('all'); // all | pinned

  const handleAdd = () => {
    if (!noteText.trim()) return;
    addDmNote(noteText.trim());
    setNoteText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const sortedNotes = [...dmNotes]
    .filter((n) => filter === 'all' || n.pinned)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="dm-notes">
      <div className="dm-notes__header">
        <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>📋 DM Notları</h4>
        <div className="flex gap-sm">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            Tümü ({dmNotes.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'pinned' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setFilter('pinned')}
          >
            📌 Sabitler
          </button>
        </div>
      </div>

      {/* New Note Input */}
      <div className="dm-notes__input">
        <textarea
          className="input"
          placeholder="Yeni not ekle... (Senaryo, ipucu, vb.)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          style={{ resize: 'vertical', width: '100%' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!noteText.trim()}>
          ➕ Ekle
        </button>
      </div>

      {/* Notes List */}
      <div className="dm-notes__list">
        {sortedNotes.length === 0 ? (
          <p className="text-dim text-sm text-center" style={{ padding: 12 }}>
            Henüz not yok. Senaryo notlarını buraya ekleyebilirsiniz.
          </p>
        ) : (
          sortedNotes.map((note) => (
            <div key={note.id} className={`dm-note-card ${note.pinned ? 'dm-note-card--pinned' : ''}`}>
              <div className="dm-note-card__text">{note.text}</div>
              <div className="dm-note-card__footer">
                <span className="text-dim" style={{ fontSize: 10 }}>
                  {new Date(note.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex gap-sm">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => togglePinNote(note.id)}
                    title={note.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                  >
                    {note.pinned ? '📌' : '📍'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeDmNote(note.id)}
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
