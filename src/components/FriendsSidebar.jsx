import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function FriendsSidebar() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [tab, setTab] = useState('friends'); // friends | pending | search
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    fetchFriends();
    fetchPendingRequests();

    const channel = supabase
      .channel('friends-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchFriends();
        fetchPendingRequests();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_messages' }, (payload) => {
        if (payload.new.from_id === activeChat || payload.new.to_id === activeChat) {
          setChatMessages((prev) => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile, activeChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchFriends = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_user_id_fkey(id, username), receiver:profiles!friendships_friend_id_fkey(id, username)')
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
      .eq('status', 'accepted');
    if (data) {
      const mapped = data.map((f) => {
        const friendProfile = f.user_id === profile.id ? f.receiver : f.requester;
        return { ...f, friendProfile };
      });
      setFriends(mapped);
    }
  };

  const fetchPendingRequests = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_user_id_fkey(id, username)')
      .eq('friend_id', profile.id)
      .eq('status', 'pending');
    if (data) setPendingRequests(data);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', profile.id)
      .limit(10);
    setSearchResults(data || []);
  };

  const sendFriendRequest = async (friendId) => {
    await supabase.from('friendships').insert({
      user_id: profile.id,
      friend_id: friendId,
      status: 'pending',
    });
    setSearchResults((prev) => prev.filter((u) => u.id !== friendId));
  };

  const acceptRequest = async (friendshipId) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchFriends();
    fetchPendingRequests();
  };

  const rejectRequest = async (friendshipId) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchPendingRequests();
  };

  const openChat = async (friendId) => {
    setActiveChat(friendId);
    const { data } = await supabase
      .from('friend_messages')
      .select('*')
      .or(`and(from_id.eq.${profile.id},to_id.eq.${friendId}),and(from_id.eq.${friendId},to_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
      .limit(50);
    setChatMessages(data || []);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeChat) return;
    await supabase.from('friend_messages').insert({
      from_id: profile.id,
      to_id: activeChat,
      content: chatInput.trim(),
    });
    setChatInput('');
  };

  const inviteToRoom = async (friendId, roomId) => {
    await supabase.from('friend_messages').insert({
      from_id: profile.id,
      to_id: friendId,
      content: `🎮 Oyuna davet! Oda kodu ile katıl.`,
    });
  };

  const activeFriend = friends.find((f) => f.friendProfile?.id === activeChat);

  return (
    <div className="friends-sidebar">
      <div className="friends-sidebar__header">
        <img src="./assest/logo.png" alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
        <h3 style={{ fontSize: 14, color: 'var(--gold)', margin: 0 }}>Arkadaşlar</h3>
        {pendingRequests.length > 0 && (
          <span className="friends-badge">{pendingRequests.length}</span>
        )}
      </div>

      {/* Tab bar */}
      <div className="friends-tabs">
        <button className={`friends-tab ${tab === 'friends' ? 'friends-tab--active' : ''}`} onClick={() => { setTab('friends'); setActiveChat(null); }}>
          👥 Liste
        </button>
        <button className={`friends-tab ${tab === 'pending' ? 'friends-tab--active' : ''}`} onClick={() => { setTab('pending'); setActiveChat(null); }}>
          📩 İstek {pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}
        </button>
        <button className={`friends-tab ${tab === 'search' ? 'friends-tab--active' : ''}`} onClick={() => { setTab('search'); setActiveChat(null); }}>
          🔍 Ara
        </button>
      </div>

      {/* Chat overlay */}
      {activeChat && activeFriend && (
        <div className="friends-chat">
          <div className="friends-chat__header">
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveChat(null)} style={{ padding: '2px 6px', fontSize: 12 }}>←</button>
            <span className="text-gold text-sm">{activeFriend.friendProfile?.username}</span>
          </div>
          <div className="friends-chat__messages">
            {chatMessages.map((msg, i) => (
              <div key={msg.id || i} className={`friends-msg ${msg.from_id === profile.id ? 'friends-msg--mine' : ''}`}>
                <span className="friends-msg__text">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="friends-chat__input">
            <input
              className="input input--sm"
              placeholder="Mesaj..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button className="btn btn-primary btn-sm" onClick={sendMessage} style={{ padding: '4px 8px', fontSize: 11 }}>
              Gönder
            </button>
          </div>
        </div>
      )}

      {/* Friends list */}
      {tab === 'friends' && !activeChat && (
        <div className="friends-list">
          {friends.length === 0 ? (
            <div className="text-center text-dim text-sm" style={{ padding: 20 }}>
              Henüz arkadaşın yok.<br />Arama ile ekle!
            </div>
          ) : (
            friends.map((f) => (
              <div key={f.id} className="friends-item">
                <div className="friends-item__info">
                  <span className="friends-item__name">{f.friendProfile?.username}</span>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-ghost btn-sm" onClick={() => openChat(f.friendProfile?.id)} style={{ padding: '2px 6px', fontSize: 11 }} title="Mesaj">
                    💬
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending requests */}
      {tab === 'pending' && (
        <div className="friends-list">
          {pendingRequests.length === 0 ? (
            <div className="text-center text-dim text-sm" style={{ padding: 20 }}>Bekleyen istek yok</div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="friends-item">
                <span className="friends-item__name">{req.requester?.username}</span>
                <div className="flex gap-sm">
                  <button className="btn btn-primary btn-sm" onClick={() => acceptRequest(req.id)} style={{ padding: '2px 8px', fontSize: 11 }}>✓</button>
                  <button className="btn btn-danger btn-sm" onClick={() => rejectRequest(req.id)} style={{ padding: '2px 8px', fontSize: 11 }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Search */}
      {tab === 'search' && (
        <div className="friends-list">
          <div className="flex gap-sm" style={{ padding: '0 8px 8px' }}>
            <input
              className="input input--sm"
              placeholder="Kullanıcı adı..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button className="btn btn-gold btn-sm" onClick={handleSearch} style={{ padding: '4px 8px', fontSize: 11 }}>Ara</button>
          </div>
          {searchResults.map((user) => (
            <div key={user.id} className="friends-item">
              <span className="friends-item__name">{user.username}</span>
              <button className="btn btn-primary btn-sm" onClick={() => sendFriendRequest(user.id)} style={{ padding: '2px 8px', fontSize: 11 }}>
                + Ekle
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
