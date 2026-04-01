import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user });
        await get().fetchProfile();
      }
    } catch (err) {
      console.error('Auth initialize error:', err);
    } finally {
      set({ loading: false });
    }

    // IMPORTANT: Supabase docs warn that async callbacks with await on Supabase
    // calls cause deadlocks. Use setTimeout to dispatch async work.
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        set({ user: session.user });
        setTimeout(() => get().fetchProfile(), 0);
      } else {
        set({ user: null, profile: null });
      }
    });
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (data) set({ profile: data });
      if (error) console.error('fetchProfile error:', error.message);
    } catch (err) {
      console.error('fetchProfile exception:', err);
    }
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    if (data.session?.user) {
      set({ user: data.session.user });
      await get().fetchProfile();
    }
    return data;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session?.user) {
      set({ user: data.session.user });
      await get().fetchProfile();
    }
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'vulpax-dnd://auth-callback',
    });
    if (error) throw error;
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  updateGold: async (amount) => {
    const profile = get().profile;
    if (profile) {
      const newBalance = profile.gold_balance + amount;
      set({ profile: { ...profile, gold_balance: newBalance } });
      await supabase.from('profiles').update({ gold_balance: newBalance }).eq('id', profile.id);
    }
  },
}));
