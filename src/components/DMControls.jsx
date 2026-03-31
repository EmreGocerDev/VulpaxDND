import React, { useState } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { supabase } from '../lib/supabase';

export default function DMControls({ roomId, members }) {
  const { updateMemberHealth, updateMemberStatus } = useRoomStore();
  const [selectedMember, setSelectedMember] = useState('');
  const [healthDelta, setHealthDelta] = useState(0);
  const [newStatus, setNewStatus] = useState('alive');
  const [dmMessage, setDmMessage] = useState('');

  const member = members.find((m) => m.id === selectedMember);

  const handleHealthUpdate = async () => {
    if (!member) return;
    const newHealth = Math.max(0, member.current_health + healthDelta);
    await updateMemberHealth(member.id, newHealth);

    // Action log'a kaydet
    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: member.user_id,
      action_type: 'dm_action',
      action_value: {
        message: `DM, ${member.profiles?.username}'in canını ${healthDelta > 0 ? '+' : ''}${healthDelta} yaptı (${newHealth} HP)`,
      },
    });

    setHealthDelta(0);
  };

  const handleStatusUpdate = async () => {
    if (!member) return;
    await updateMemberStatus(member.id, newStatus);

    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: member.user_id,
      action_type: 'dm_action',
      action_value: {
        message: `DM, ${member.profiles?.username}'in durumunu '${newStatus}' yaptı`,
      },
    });
  };

  const handleSendMessage = async () => {
    if (!dmMessage.trim() || !members || members.length === 0) return;
    const dmMember = members[0];
    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: dmMember?.user_id,
      action_type: 'dm_action',
      action_value: { message: dmMessage.trim() },
    });
    setDmMessage('');
  };

  return (
    <div className="flex flex-col gap-md">
      {/* Oyuncu Seçimi */}
      <div>
        <label className="text-dim text-sm">Oyuncu Seç:</label>
        <select
          className="input"
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          style={{ marginTop: 4 }}
        >
          <option value="">-- Oyuncu seç --</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.profiles?.username} ({m.current_health} HP - {m.status})
            </option>
          ))}
        </select>
      </div>

      {member && (
        <>
          {/* Can Güncelleme */}
          <div className="flex gap-md items-center">
            <label className="text-dim text-sm" style={{ minWidth: 80 }}>Can:</label>
            <input
              type="number"
              className="input"
              value={healthDelta}
              onChange={(e) => setHealthDelta(parseInt(e.target.value) || 0)}
              style={{ width: 80 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleHealthUpdate}>
              Güncelle
            </button>
            <span className="text-dim text-sm">
              Şu an: {member.current_health} HP → {Math.max(0, member.current_health + healthDelta)} HP
            </span>
          </div>

          {/* Durum Güncelleme */}
          <div className="flex gap-md items-center">
            <label className="text-dim text-sm" style={{ minWidth: 80 }}>Durum:</label>
            <select
              className="input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="alive">Canlı</option>
              <option value="dead">Ölü</option>
              <option value="stunned">Sersemletilmiş</option>
              <option value="poisoned">Zehirlenmiş</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate}>
              Uygula
            </button>
          </div>
        </>
      )}

      {/* DM Mesajı */}
      <div className="divider" />
      <div className="flex gap-md">
        <input
          className="input"
          placeholder="DM mesajı / senaryo notu..."
          value={dmMessage}
          onChange={(e) => setDmMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          maxLength={500}
        />
        <button className="btn btn-gold btn-sm" onClick={handleSendMessage}>
          Gönder
        </button>
      </div>
    </div>
  );
}
