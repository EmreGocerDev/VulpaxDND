import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import SimplePeer from 'simple-peer';

export const useVoiceStore = create((set, get) => ({
  // State
  connected: false,
  muted: false,
  deafened: false,
  localStream: null,
  peers: {},           // { peerId: { peer, stream, username, speaking } }
  signalingChannel: null,
  audioDevices: [],
  outputDevices: [],
  selectedInputDevice: '',
  selectedOutputDevice: '',
  inputVolume: 1.0,
  outputVolume: 1.0,
  noiseSuppressionEnabled: true,
  echoCancellationEnabled: true,
  autoGainControlEnabled: true,
  speakingThreshold: 0.02,
  showSettings: false,

  // ============================================================
  // DEVICE ENUMERATION
  // ============================================================
  enumerateDevices: async () => {
    try {
      // Kısa süreli stream al ki tarayıcı izinleri tetiklensin
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      set({
        audioDevices: audioInputs,
        outputDevices: audioOutputs,
        selectedInputDevice: audioInputs[0]?.deviceId || '',
        selectedOutputDevice: audioOutputs[0]?.deviceId || '',
      });
    } catch (err) {
      console.error('[Voice] Device enumeration failed:', err);
    }
  },

  setInputDevice: (deviceId) => {
    set({ selectedInputDevice: deviceId });
    // Eğer bağlıysa stream'i yeniden oluştur
    const state = get();
    if (state.connected && state.localStream) {
      get().restartLocalStream();
    }
  },

  setOutputDevice: (deviceId) => {
    set({ selectedOutputDevice: deviceId });
  },

  setInputVolume: (vol) => {
    set({ inputVolume: vol });
    const state = get();
    if (state.localStream && state.gainNode) {
      state.gainNode.gain.value = vol;
    }
  },

  setOutputVolume: (vol) => set({ outputVolume: vol }),
  setNoiseSuppression: (v) => set({ noiseSuppressionEnabled: v }),
  setEchoCancellation: (v) => set({ echoCancellationEnabled: v }),
  setAutoGainControl: (v) => set({ autoGainControlEnabled: v }),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

  // ============================================================
  // AUDIO STREAM (Mikrofon)
  // ============================================================
  getAudioConstraints: () => {
    const state = get();
    return {
      audio: {
        deviceId: state.selectedInputDevice ? { exact: state.selectedInputDevice } : undefined,
        noiseSuppression: state.noiseSuppressionEnabled,
        echoCancellation: state.echoCancellationEnabled,
        autoGainControl: state.autoGainControlEnabled,
        sampleRate: 48000,
        channelCount: 1,
      },
    };
  },

  startLocalStream: async () => {
    try {
      const constraints = get().getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Volume kontrolü için AudioContext kullan
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      const destination = audioCtx.createMediaStreamDestination();
      const analyser = audioCtx.createAnalyser();

      gainNode.gain.value = get().inputVolume;
      analyser.fftSize = 256;

      source.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(destination);

      set({
        localStream: destination.stream,
        rawStream: stream,
        audioContext: audioCtx,
        gainNode,
        analyser,
      });

      // Speaking detection
      get().startSpeakingDetection();

      return destination.stream;
    } catch (err) {
      console.error('[Voice] Microphone access failed:', err);
      throw err;
    }
  },

  restartLocalStream: async () => {
    const state = get();
    // Eski stream'i temizle
    if (state.rawStream) {
      state.rawStream.getTracks().forEach((t) => t.stop());
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close().catch(() => {});
    }

    const newStream = await get().startLocalStream();

    // Mevcut peerlara yeni track'i gönder
    Object.values(state.peers).forEach(({ peer }) => {
      if (peer && !peer.destroyed) {
        const oldTrack = peer.streams?.[0]?.getAudioTracks()?.[0];
        const newTrack = newStream.getAudioTracks()[0];
        if (oldTrack && newTrack) {
          peer.replaceTrack(oldTrack, newTrack, newStream);
        }
      }
    });
  },

  stopLocalStream: () => {
    const state = get();
    if (state.rawStream) {
      state.rawStream.getTracks().forEach((t) => t.stop());
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close().catch(() => {});
    }
    if (state.speakingInterval) {
      clearInterval(state.speakingInterval);
    }
    set({
      localStream: null,
      rawStream: null,
      audioContext: null,
      gainNode: null,
      analyser: null,
      speakingInterval: null,
    });
  },

  // ============================================================
  // SPEAKING DETECTION
  // ============================================================
  startSpeakingDetection: () => {
    const state = get();
    if (state.speakingInterval) clearInterval(state.speakingInterval);

    const interval = setInterval(() => {
      const analyser = get().analyser;
      if (!analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const isSpeaking = average > get().speakingThreshold * 255;

      set({ localSpeaking: isSpeaking });
    }, 100);

    set({ speakingInterval: interval });
  },

  // ============================================================
  // SIGNALING (Supabase Realtime Channel)
  // ============================================================
  connect: async (roomId, userId, username) => {
    const state = get();
    if (state.connected) return;

    try {
      // Mikrofonu başlat
      const stream = await get().startLocalStream();

      // Supabase Realtime channel – signaling için
      const channel = supabase.channel(`voice-${roomId}`, {
        config: { presence: { key: userId } },
      });

      // Presence ile diğer kullanıcıları takip et
      channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === userId) return;
        // Yeni katılan kişi için peer oluştur (biz initiator)
        get().createPeer(key, newPresences[0]?.username || 'Bilinmeyen', true, stream);
      });

      channel.on('presence', { event: 'leave' }, ({ key }) => {
        get().removePeer(key);
      });

      // Signaling mesajları
      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.target !== userId) return;

        const peers = get().peers;
        if (peers[payload.from]) {
          // Mevcut peer'a sinyal ilet
          peers[payload.from].peer.signal(payload.signal);
        } else {
          // Yeni peer oluştur (karşı taraf initiator)
          get().createPeer(
            payload.from,
            payload.username || 'Bilinmeyen',
            false,
            get().localStream,
            payload.signal
          );
        }
      });

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username, joinedAt: Date.now() });
        }
      });

      set({ connected: true, signalingChannel: channel, roomId, userId, username });
    } catch (err) {
      console.error('[Voice] Connection failed:', err);
      get().stopLocalStream();
      throw err;
    }
  },

  // ============================================================
  // PEER MANAGEMENT
  // ============================================================
  createPeer: (peerId, peerUsername, initiator, stream, incomingSignal) => {
    const state = get();

    // Zaten varsa oluşturma
    if (state.peers[peerId]) return;

    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      // Sinyal verisini Supabase üzerinden karşı tarafa gönder
      const ch = get().signalingChannel;
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            from: get().userId,
            target: peerId,
            signal,
            username: get().username,
          },
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      set((s) => ({
        peers: {
          ...s.peers,
          [peerId]: { ...s.peers[peerId], stream: remoteStream },
        },
      }));
    });

    peer.on('close', () => {
      get().removePeer(peerId);
    });

    peer.on('error', (err) => {
      console.error(`[Voice] Peer ${peerId} error:`, err);
      get().removePeer(peerId);
    });

    // Gelen sinyal varsa ilet
    if (incomingSignal) {
      peer.signal(incomingSignal);
    }

    set((s) => ({
      peers: {
        ...s.peers,
        [peerId]: { peer, stream: null, username: peerUsername, speaking: false },
      },
    }));
  },

  removePeer: (peerId) => {
    const state = get();
    const peerData = state.peers[peerId];
    if (peerData?.peer && !peerData.peer.destroyed) {
      peerData.peer.destroy();
    }
    const newPeers = { ...state.peers };
    delete newPeers[peerId];
    set({ peers: newPeers });
  },

  // ============================================================
  // MUTE / DEAFEN
  // ============================================================
  toggleMute: () => {
    const state = get();
    const newMuted = !state.muted;

    // Local stream'deki tüm audio track'ları kontrol et
    if (state.rawStream) {
      state.rawStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }

    set({ muted: newMuted });
  },

  toggleDeafen: () => {
    const state = get();
    const newDeafened = !state.deafened;
    set({ deafened: newDeafened });
    // Deafen olunca otomatik mute
    if (newDeafened && !state.muted) {
      get().toggleMute();
    }
    // Undeafen olunca unmute
    if (!newDeafened && state.muted) {
      get().toggleMute();
    }
  },

  // ============================================================
  // DISCONNECT
  // ============================================================
  disconnect: () => {
    const state = get();

    // Tüm peer bağlantılarını kapat
    Object.values(state.peers).forEach(({ peer }) => {
      if (peer && !peer.destroyed) peer.destroy();
    });

    // Signaling channel'ı kapat
    if (state.signalingChannel) {
      state.signalingChannel.untrack();
      supabase.removeChannel(state.signalingChannel);
    }

    // Local stream'i durdur
    get().stopLocalStream();

    set({
      connected: false,
      muted: false,
      deafened: false,
      peers: {},
      signalingChannel: null,
      localSpeaking: false,
    });
  },
}));
