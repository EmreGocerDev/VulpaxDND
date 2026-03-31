import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useRoomStore = create((set, get) => ({
  rooms: [],
  currentRoom: null,
  members: [],
  actions: [],
  realtimeChannel: null,

  fetchRooms: async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*, profiles!rooms_dm_id_fkey(username), room_members(count)')
      .in('status', ['lobby', 'playing'])
      .order('created_at', { ascending: false });
    if (data) {
      // Auto-close rooms with 0 members
      const emptyRooms = data.filter(r => (r.room_members?.[0]?.count || 0) === 0);
      for (const room of emptyRooms) {
        await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id);
      }
      // Only show rooms with members
      set({ rooms: data.filter(r => (r.room_members?.[0]?.count || 0) > 0) });
    }
  },

  createRoom: async (roomName, dmId) => {
    if (!dmId) throw new Error('Oturum bulunamadı, tekrar giriş yapın');
    const { data, error } = await supabase
      .from('rooms')
      .insert({ room_name: roomName, dm_id: dmId })
      .select()
      .single();
    if (error) throw error;

    // DM otomatik olarak odaya katılır
    await supabase.from('room_members').insert({
      room_id: data.id,
      user_id: dmId,
    });

    return data;
  },

  joinRoom: async (roomId, userId) => {
    const { error } = await supabase
      .from('room_members')
      .upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id,user_id' });
    if (error) throw error;
  },

  joinRoomByCode: async (code, userId) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', code)
      .maybeSingle();
    if (!room) throw new Error('Oda bulunamadı');
    if (room.status === 'finished') throw new Error('Bu oda kapanmış');

    await get().joinRoom(room.id, userId);
    return room;
  },

  leaveRoom: async (roomId, userId) => {
    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    // Odada kimse kalmadıysa odayı kapat
    const { data: remaining } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId);
    if (!remaining || remaining.length === 0) {
      await supabase
        .from('rooms')
        .update({ status: 'finished' })
        .eq('id', roomId);
    }

    // Clear room state
    set({ currentRoom: null, members: [], actions: [] });
  },

  fetchRoomDetails: async (roomId) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();
    if (!room) return;

    const { data: members } = await supabase
      .from('room_members')
      .select('*, profiles(username, avatar_url), characters(*)')
      .eq('room_id', roomId);

    const { data: actions } = await supabase
      .from('room_actions')
      .select('*, profiles(username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(50);

    set({ currentRoom: room, members: members || [], actions: actions || [] });
  },

  // Realtime subscription
  subscribeToRoom: (roomId) => {
    // Clean up any existing subscription first to avoid duplicates
    const existing = get().realtimeChannel;
    if (existing) {
      supabase.removeChannel(existing);
    }

    // Use unique channel name to prevent collision when RoomScreen unmounts
    // while GameScreen is already subscribing
    const channelId = `room-${roomId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_actions', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data } = await supabase
            .from('room_actions')
            .select('*, profiles(username)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            set((s) => ({ actions: [data, ...s.actions] }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data: members } = await supabase
            .from('room_members')
            .select('*, profiles(username, avatar_url), characters(*)')
            .eq('room_id', roomId);
          if (members) set({ members });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          set({ currentRoom: payload.new });
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromRoom: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },

  // DM: Oyunu başlat
  startGame: async (roomId, gameMode = 'standard') => {
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'playing', game_mode: gameMode })
      .eq('id', roomId);
    // game_mode sütunu yoksa, sadece status güncelle
    if (error) {
      const { error: err2 } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);
      if (err2) throw err2;
    }
  },

  // DM: Oyunu bitir
  endGame: async (roomId) => {
    await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', roomId);
    set({ currentRoom: null, members: [], actions: [] });
  },

  // DM: Oyuncunun canını güncelle
  updateMemberHealth: async (memberId, newHealth) => {
    await supabase
      .from('room_members')
      .update({ current_health: newHealth })
      .eq('id', memberId);
  },

  // DM: Oyuncu durumunu güncelle
  updateMemberStatus: async (memberId, status) => {
    await supabase
      .from('room_members')
      .update({ status })
      .eq('id', memberId);
  },

  // Oyuncunun atak bonusunu güncelle
  updateMemberAttackBonus: async (memberId, bonus) => {
    await supabase
      .from('room_members')
      .update({ attack_bonus: bonus })
      .eq('id', memberId);
  },

  // Oyuncunun savunma bonusunu güncelle
  updateMemberDefenseBonus: async (memberId, bonus) => {
    await supabase
      .from('room_members')
      .update({ defense_bonus: bonus })
      .eq('id', memberId);
  },

  // Zehir bilgilerini güncelle
  updateMemberPoison: async (memberId, turns, value) => {
    await supabase
      .from('room_members')
      .update({ poison_turns: turns, poison_value: value })
      .eq('id', memberId);
  },

  // Sersemletme turunu güncelle
  updateMemberStun: async (memberId, turns) => {
    await supabase
      .from('room_members')
      .update({ stun_turns: turns })
      .eq('id', memberId);
  },
}));
