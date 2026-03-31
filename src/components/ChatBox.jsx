import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function ChatBox({ roomId }) {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('room_actions')
      .select('*, profiles(username)')
      .eq('room_id', roomId)
      .eq('action_type', 'chat_message')
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    channelRef.current = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_actions',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          if (payload.new.action_type !== 'chat_message') return;
          const { data } = await supabase
            .from('room_actions')
            .select('*, profiles(username)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !profile || sending) return;

    const msg = input.trim();
    setInput('');
    setSending(true);

    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: profile.id,
      action_type: 'chat_message',
      action_value: { message: msg },
    });

    setSending(false);
  };

  return (
    <div className="chatbox">
      <div className="chatbox__messages">
        {messages.length === 0 && (
          <p className="text-dim text-sm text-center" style={{ padding: 12 }}>
            Henüz mesaj yok. İlk mesajı sen gönder!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === profile?.id;
          return (
            <div key={msg.id} className={`chatbox__msg ${isMe ? 'chatbox__msg--me' : ''}`}>
              <span className="chatbox__msg-user">
                {msg.profiles?.username || 'Bilinmeyen'}
              </span>
              <span className="chatbox__msg-text">{msg.action_value?.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="chatbox__input-row" onSubmit={sendMessage}>
        <input
          className="input chatbox__input"
          placeholder="Mesaj yaz..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !input.trim()}>
          Gönder
        </button>
      </form>
    </div>
  );
}
