import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useGameStore } from '../stores/gameStore';
import { supabase } from '../lib/supabase';
import DiceTray from '../components/DiceTray';
import ActionLog from '../components/ActionLog';
import DMControls from '../components/DMControls';
import VoiceChat from '../components/VoiceChat';
import PowerCardHand from '../components/PowerCardHand';
import CharacterSelect from '../components/CharacterSelect';
import ChatBox from '../components/ChatBox';
import InitiativeTracker from '../components/InitiativeTracker';
import BattleMap from '../components/BattleMap';
import MonsterEncounter from '../components/MonsterEncounter';
import DMNotes from '../components/DMNotes';
import CombatCalculator from '../components/CombatCalculator';
import AchievementPanel from '../components/AchievementPanel';
import PartyLoot from '../components/PartyLoot';

export default function GameScreen() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { profile, updateGold } = useAuthStore();
  const {
    currentRoom, members, actions,
    fetchRoomDetails, subscribeToRoom, unsubscribeFromRoom, endGame,
  } = useRoomStore();

  const [characterSelected, setCharacterSelected] = useState(false);
  const [centerTab, setCenterTab] = useState('battle'); // battle | monsters | calculator | loot | achievements | notes
  const isDM = currentRoom?.dm_id === profile?.id;
  const isSimpleMode = true; // Standard mode removed – only simple & test
  const { monsters, loadProgress } = useGameStore();

  useEffect(() => {
    fetchRoomDetails(roomId);
    subscribeToRoom(roomId);
    if (profile?.id) loadProgress(profile.id);
    return () => unsubscribeFromRoom();
  }, [roomId]);

  // Karakter seçilmiş mi kontrol et
  useEffect(() => {
    if (members.length > 0 && profile) {
      const me = members.find((m) => m.user_id === profile.id);
      if (me?.character_id || isDM) setCharacterSelected(true);
    }
  }, [members, profile, isDM]);

  useEffect(() => {
    if (currentRoom?.status === 'finished') {
      navigate('/', { replace: true });
    }
  }, [currentRoom?.status, navigate]);

  const handleEndGame = async () => {
    await endGame(roomId);
    navigate('/', { replace: true });
  };

  // Game timer: elapsed seconds
  const [elapsed, setElapsed] = useState(0);
  const [goldAnim, setGoldAnim] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const coinSfxRef = useRef(new Audio('./assest/coin.mp3'));

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Every 30 seconds give +5 gold
  useEffect(() => {
    if (elapsed > 0 && elapsed % 30 === 0) {
      updateGold(5);
      const coin = coinSfxRef.current;
      const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
      coin.volume = (s.gameSfxVolume ?? 50) / 100;
      coin.currentTime = 0;
      coin.play().catch(() => {});
      setGoldAnim(true);
      setTimeout(() => setGoldAnim(false), 1200);
    }
  }, [elapsed]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (!currentRoom || !profile) {
    return (
      <div className="screen flex items-center justify-center">
        <p className="text-dim">Oyun yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="screen" style={{ padding: '16px 24px', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div className="screen__header" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-md">
          <img src="./assest/logo.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>
              ⚔ {currentRoom.room_name}
            </h2>
            <div className="flex gap-sm items-center">
              <span className="badge badge--playing">Aktif Savaş</span>
              {isSimpleMode && <span className="badge badge--dm">🧠 Hayal Gücü</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="game-timer" style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-secondary)', background: 'var(--darker-bg)', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--border-dark)' }}>
            ⏱ {formatTime(elapsed)}
          </div>
          <div className="gold-display" style={{ position: 'relative' }}>
            <span className="gold-display__icon">🪙</span>
            <span>{profile?.gold_balance || 0}</span>
            {goldAnim && (
              <div className="gold-float-anim">+5 🪙</div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExitConfirm(true)}>
            🚪 Oyundan Çık
          </button>
          {isDM && (
            <button className="btn btn-danger btn-sm" onClick={handleEndGame}>
              🏁 Oyunu Bitir
            </button>
          )}
        </div>
      </div>

      {/* Exit Game Confirm Modal */}
      {showExitConfirm && (
        <div className="card-detail-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="card-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚪</div>
            <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
              Oyundan Çık
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Oyundan çıkmak istediğine emin misin?
            </p>
            <div className="flex gap-md" style={{ justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={() => { setShowExitConfirm(false); navigate('/', { replace: true }); }}>
                ✅ Evet, Çık
              </button>
              <button className="btn btn-ghost" onClick={() => setShowExitConfirm(false)}>
                ❌ İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== SIMPLE MODE =================== */}
      {isSimpleMode ? (
        <SimpleGameMode
          roomId={roomId}
          profile={profile}
          currentRoom={currentRoom}
          members={members}
          actions={actions}
          isDM={isDM}
        />
      ) : (
      /* =================== STANDARD MODE =================== */
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 320px', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Left Panel: Player List */}
        <div className="parchment-panel flex flex-col gap-md" style={{ overflowY: 'auto', padding: 16 }}>
          <h3 style={{ fontSize: 16 }}>⚔ Savaşçılar</h3>
          {members.map((member) => {
            const healthPercent = member.characters
              ? Math.max(0, (member.current_health / member.characters.health) * 100)
              : 100;
            const healthClass = healthPercent > 60 ? 'high' : healthPercent > 30 ? 'mid' : 'low';

            return (
              <div
                key={member.id}
                style={{
                  padding: 12,
                  background: 'var(--darker-bg)',
                  borderRadius: 6,
                  border: '1px solid var(--border-dark)',
                }}
              >
                <div className="flex items-center justify-between mb-sm">
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--gold)' }}>
                    {member.profiles?.username}
                  </span>
                  <div className="flex gap-sm">
                    {member.user_id === currentRoom.dm_id && (
                      <span className="badge badge--dm" style={{ fontSize: 9, padding: '1px 6px' }}>DM</span>
                    )}
                    <span className={`badge badge--${member.status}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                      {member.status}
                    </span>
                  </div>
                </div>
                <div className="text-dim" style={{ fontSize: 11, marginBottom: 6 }}>
                  {member.characters?.name || 'Karakter yok'}
                </div>
                <div className="health-bar">
                  <div
                    className={`health-bar__fill health-bar__fill--${healthClass}`}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
                <div className="text-dim" style={{ fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                  ❤️ {member.current_health}{member.characters ? `/${member.characters.health}` : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Battle Area + Dice */}
        <div className="flex flex-col gap-md" style={{ minHeight: 0 }}>
          {/* Character Select or Battle Area */}
          {!characterSelected && !isDM ? (
            <div className="parchment-panel" style={{ flex: 1 }}>
              <CharacterSelect
                userId={profile.id}
                roomId={roomId}
                onSelected={() => {
                  setCharacterSelected(true);
                  fetchRoomDetails(roomId);
                }}
              />
            </div>
          ) : (
            <>
              {/* Initiative Tracker */}
              <div className="parchment-panel" style={{ padding: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8, textAlign: 'center' }}>⚔ Sıra Takibi</h3>
                <InitiativeTracker roomId={roomId} members={members} isDM={isDM} />
              </div>

              {/* Tab Bar */}
              <div className="game-tab-bar">
                <button className={`game-tab ${centerTab === 'battle' ? 'game-tab--active' : ''}`} onClick={() => setCenterTab('battle')}>🗺️ Harita</button>
                <button className={`game-tab ${centerTab === 'monsters' ? 'game-tab--active' : ''}`} onClick={() => setCenterTab('monsters')}>👹 Canavarlar</button>
                <button className={`game-tab ${centerTab === 'calculator' ? 'game-tab--active' : ''}`} onClick={() => setCenterTab('calculator')}>🧮 Hesap</button>
                <button className={`game-tab ${centerTab === 'loot' ? 'game-tab--active' : ''}`} onClick={() => setCenterTab('loot')}>💎 Ganimet</button>
                <button className={`game-tab ${centerTab === 'achievements' ? 'game-tab--active' : ''}`} onClick={() => setCenterTab('achievements')}>🏆 Başarım</button>
                {isDM && <button className={`game-tab ${centerTab === 'notes' ? 'game-tab--active' : ''}`} onClick={() => setCenterTab('notes')}>📋 Notlar</button>}
              </div>

              {/* Tab Content */}
              <div className="parchment-panel" style={{ flex: 1, overflow: 'auto', position: 'relative', padding: centerTab === 'battle' ? 8 : 16 }}>
                {centerTab === 'battle' && (
                  <BattleMap members={members} monsters={monsters} isDM={isDM} />
                )}
                {centerTab === 'monsters' && (
                  <MonsterEncounter roomId={roomId} isDM={isDM} />
                )}
                {centerTab === 'calculator' && (
                  <CombatCalculator />
                )}
                {centerTab === 'loot' && (
                  <PartyLoot roomId={roomId} isDM={isDM} />
                )}
                {centerTab === 'achievements' && (
                  <AchievementPanel />
                )}
                {centerTab === 'notes' && isDM && (
                  <DMNotes />
                )}
              </div>

              {/* Power Cards */}
              <div className="parchment-panel" style={{ padding: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8, textAlign: 'center' }}>✨ Güç Kartları</h3>
                <PowerCardHand roomId={roomId} />
              </div>
            </>
          )}

          {/* Dice Tray */}
          <div className="parchment-panel" style={{ padding: 16 }}>
            <DiceTray roomId={roomId} userId={profile.id} />
          </div>

          {/* DM Controls */}
          {isDM && (
            <div className="parchment-panel" style={{ padding: 16 }}>
              <h3 className="mb-md" style={{ fontSize: 15 }}>👑 DM Kontrolleri</h3>
              <DMControls roomId={roomId} members={members} />
            </div>
          )}
        </div>

        {/* Right Panel: Chat + Action Log + Voice */}
        <div className="flex flex-col gap-md" style={{ minHeight: 0 }}>
          <div className="parchment-panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 15, marginBottom: 12, flexShrink: 0 }}>💬 Sohbet</h3>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <ChatBox roomId={roomId} />
            </div>
          </div>
          <div className="parchment-panel" style={{ maxHeight: 250, overflowY: 'auto', padding: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>📜 Eylem Kaydı</h3>
            <ActionLog actions={actions} />
          </div>
          <div className="parchment-panel" style={{ padding: 16, position: 'relative' }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>🎙 Sesli Sohbet</h3>
            <VoiceChat roomId={roomId} />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

/* ============================================================
   SIMPLE GAME MODE – Hayal Gücü Modu
   DM controls everything manually. Pure text-RPG style.
   Cards: DM assigns turn → player can use power cards with flip animation → DM approves/rejects
   ============================================================ */
function SimpleGameMode({ roomId, profile, currentRoom, members, actions, isDM }) {
  const [turnPlayer, setTurnPlayer] = useState('');
  const [currentTurnId, setCurrentTurnId] = useState(null); // who has the turn right now
  const [dmNarration, setDmNarration] = useState('');
  const [damageAmount, setDamageAmount] = useState(0);
  const [healAmount, setHealAmount] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [allPowers, setAllPowers] = useState([]);
  const [flippingCard, setFlippingCard] = useState(null); // card being flipped
  const [pendingCard, setPendingCard] = useState(null); // card awaiting DM approval
  const [usedCards, setUsedCards] = useState([]); // already used card IDs this session
  const [viewingCard, setViewingCard] = useState(null); // card detail popup for DM
  const [showDmNotes, setShowDmNotes] = useState(false); // DM notes popup
  const [dmNotesText, setDmNotesText] = useState(() => localStorage.getItem(`dm_notes_${roomId}`) || '');
  const [viewingCharacter, setViewingCharacter] = useState(null); // character detail popup
  const [charSelectOverlay, setCharSelectOverlay] = useState(null); // broadcast char select
  const [diceOverlay, setDiceOverlay] = useState(null); // broadcast dice roll fullscreen
  const [seenActionIds, setSeenActionIds] = useState(new Set()); // track processed actions
  const seenSfxIds = useRef(new Set()); // track SFX-processed actions (ref to avoid re-render loops)
  const { updateMemberHealth, updateMemberStatus, updateMemberAttackBonus, updateMemberDefenseBonus, updateMemberPoison, updateMemberStun } = useRoomStore();

  // Card system v2 states
  const [cardConfirm, setCardConfirm] = useState(null); // {power, step:'confirm'|'target'}
  const [cardTarget, setCardTarget] = useState(''); // selected target member id for card
  const [cardUsedThisTurn, setCardUsedThisTurn] = useState(false); // only 1 card per turn
  const [processedApprovals, setProcessedApprovals] = useState(new Set()); // hide approve/reject buttons

  // Turn announcement overlay
  const [turnOverlay, setTurnOverlay] = useState(null); // { name, title, charImage, charName, charRarity, avatarUrl }
  const [titleMap, setTitleMap] = useState({}); // userId → title name
  const [avatarMap, setAvatarMap] = useState({}); // userId → avatar_url

  const cardHandRef = useRef(null);
  const musicRef = useRef(null);
  const fadeRef = useRef(null);
  const currentMusicRef = useRef(null);
  const musicVolumeRef = useRef(50);
  const sfxVolumeRef = useRef(50);
  const [currentMusic, setCurrentMusic] = useState(null);
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [musicVolume, setMusicVolume] = useState(() => {
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    return s.gameMusicVolume ?? 50;
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    return s.gameSfxVolume ?? 50;
  });
  const [musicTracks, setMusicTracks] = useState([]);

  // SFX map – event sounds from assest/
  const SFX = useRef({
    alive: new Audio('./assest/alive.mp3'),
    card: new Audio('./assest/card.mp3'),
    diceZar: new Audio('./assest/diceZar.mp3'),
    die: new Audio('./assest/die.mp3'),
    levelBegining: new Audio('./assest/levelbegining.mp3'),
    potion: new Audio('./assest/potion.mp3'),
    stun: new Audio('./assest/stun.mp3'),
    sword: new Audio('./assest/sword.mp3'),
    coin: new Audio('./assest/coin.mp3'),
  });

  const playSfx = (name) => {
    const audio = SFX.current[name];
    if (!audio) return;
    audio.volume = sfxVolumeRef.current / 100;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  // Get card image from DB image_placeholder field
  const getCardImage = (item) => {
    if (item?.image_placeholder) {
      return item.image_placeholder.startsWith('/') ? '.' + item.image_placeholder : item.image_placeholder;
    }
    return null;
  };

  // Arrow key navigation for card carousel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!cardHandRef.current) return;
      const container = cardHandRef.current;
      const scrollAmount = 120;
      if (e.key === 'ArrowRight') {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowLeft') {
        if (container.scrollLeft <= 10) {
          container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const targetMember = members.find((m) => m.id === selectedTarget);
  const isMyTurn = currentTurnId === profile.id;

  // Fetch titles for all members (for display)
  useEffect(() => {
    const fetchTitles = async () => {
      const userIds = members.map(m => m.user_id);
      if (userIds.length === 0) return;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, equipped_title_id, avatar_url')
        .in('id', userIds);
      if (!profiles) return;
      // Build avatar map
      const aMap = {};
      for (const p of profiles) {
        if (p.avatar_url) aMap[p.id] = p.avatar_url;
      }
      setAvatarMap(aMap);
      const equippedTitleIds = profiles.map(p => p.equipped_title_id).filter(Boolean);
      if (equippedTitleIds.length === 0) { setTitleMap({}); return; }
      const { data: titlesData } = await supabase
        .from('titles')
        .select('id, name')
        .in('id', equippedTitleIds);
      if (!titlesData) return;
      const tMap = {};
      for (const p of profiles) {
        if (p.equipped_title_id) {
          const t = titlesData.find(t => t.id === p.equipped_title_id);
          if (t) tMap[p.id] = t.name;
        }
      }
      setTitleMap(tMap);
    };
    fetchTitles();
  }, [members]);

  // Detect turn from actions
  useEffect(() => {
    const turnAction = actions.find((a) =>
      a.action_type === 'dm_action' && a.action_value?.message?.startsWith('🔄 Sıra:')
    );
    if (turnAction?.action_value?.turnUserId) {
      const newTurnId = turnAction.action_value.turnUserId;
      if (newTurnId !== currentTurnId) {
        setCurrentTurnId(newTurnId);
        setCardUsedThisTurn(false);
        setPendingCard(null);
        setCardConfirm(null);

        // Show turn announcement overlay (skip if skipOverlay flag is set)
        if (!turnAction.action_value.skipOverlay) {
          const turnMember = members.find(m => m.user_id === newTurnId);
          if (turnMember) {
            const playerName = turnMember.profiles?.username || 'Oyuncu';
            const playerTitle = titleMap[newTurnId] || null;
            const charImage = turnMember.characters?.image_placeholder ? `.${turnMember.characters.image_placeholder}` : null;
            const charName = turnMember.characters?.name || null;
            const charRarity = turnMember.characters?.rarity || 'common';
            const playerAvatar = avatarMap[newTurnId] || null;
            setTurnOverlay({ name: playerName, title: playerTitle, charImage, charName, charRarity, avatarUrl: playerAvatar });
            playSfx('levelBegining');
            setTimeout(() => setTurnOverlay(null), 3000);
          }
        }
      }
    }
  }, [actions]);

  // Fetch only equipped power cards for current user (max 10)
  useEffect(() => {
    if (!profile?.id) return;
    const fetchPowers = async () => {
      // Everyone (including DM) sees only their own equipped powers
      const { data: invData } = await supabase
        .from('user_inventory')
        .select('item_id')
        .eq('user_id', profile.id)
        .eq('item_type', 'power')
        .eq('equipped', true);
      if (invData && invData.length > 0) {
        const ids = invData.map(i => i.item_id);
        const { data } = await supabase.from('powers').select('*').in('id', ids);
        if (data) setAllPowers(data);
      } else {
        setAllPowers([]);
      }
    };
    fetchPowers();
  }, [profile?.id, currentTurnId]);

  // Listen for card approval/rejection from DM (effect applied via broadcast)
  useEffect(() => {
    const approvalAction = actions.find((a) =>
      a.action_type === 'dm_action' && a.action_value?.cardApproval && !seenActionIds.has(a.id)
    );
    if (approvalAction) {
      setSeenActionIds(prev => new Set([...prev, approvalAction.id]));
      setProcessedApprovals(prev => new Set([...prev, approvalAction.action_value?.originalActionId]));
      // Only mark card as used for the player who actually submitted it
      const originalAction = actions.find(a => a.id === approvalAction.action_value?.originalActionId);
      const cardOwnerId = originalAction?.user_id;
      if (cardOwnerId === profile?.id) {
        if (approvalAction.action_value.approved) {
          setUsedCards((prev) => [...prev, approvalAction.action_value.cardId]);
          setFlippingCard(null);
        }
        setPendingCard(null);
        setCardUsedThisTurn(true);
      }
    }
  }, [actions]);

  // Listen for card reset broadcast from DM
  useEffect(() => {
    const resetAction = actions.find((a) =>
      a.action_type === 'dm_action' && a.action_value?.resetCards && !seenActionIds.has(a.id)
    );
    if (resetAction) {
      setSeenActionIds(prev => new Set([...prev, resetAction.id]));
      setUsedCards([]);
      setFlippingCard(null);
      setPendingCard(null);
    }
  }, [actions]);

  // Watch for character selection broadcasts (show to everyone)
  useEffect(() => {
    const charAction = actions.find((a) =>
      a.action_type === 'dm_action' && a.action_value?.charSelected && !seenActionIds.has(a.id)
    );
    if (charAction) {
      setSeenActionIds(prev => new Set([...prev, charAction.id]));
      playSfx('alive');
      setCharSelectOverlay({
        username: charAction.profiles?.username || 'Oyuncu',
        charName: charAction.action_value.charName,
        charHealth: charAction.action_value.charHealth,
        charAttack: charAction.action_value.charAttack,
        charDefense: charAction.action_value.charDefense,
        charRarity: charAction.action_value.charRarity,
        charId: charAction.action_value.charId,
      });
      setTimeout(() => setCharSelectOverlay(null), 3500);
    }
  }, [actions]);

  // Watch for dice roll broadcasts (show fullscreen to everyone)
  useEffect(() => {
    const diceAction = actions.find((a) =>
      a.action_type === 'dice_roll' && !seenActionIds.has(a.id)
    );
    if (diceAction) {
      setSeenActionIds(prev => new Set([...prev, diceAction.id]));
      playSfx('diceZar');
      setDiceOverlay({
        username: diceAction.profiles?.username || 'Oyuncu',
        dice_type: diceAction.action_value?.dice_type || 'd20',
        result: diceAction.action_value?.result,
        is_critical: diceAction.action_value?.is_critical,
        is_fumble: diceAction.action_value?.is_fumble,
      });
      setTimeout(() => setDiceOverlay(null), 2500);
    }
  }, [actions]);

  // Load available music tracks from filesystem
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const tracks = await window.electronAPI?.listMusicFiles();
        if (tracks?.length) { setMusicTracks(tracks); return; }
      } catch {}
      // Fallback: hardcoded track list
      setMusicTracks([
        { file: './assest/music/Clash%20of%20Kings.mp3', name: 'Clash of Kings' },
        { file: './assest/music/Quiet%20Hall%20Of%20Amber%20Light.mp3', name: 'Quiet Hall Of Amber Light' },
        { file: './assest/music/Ta%C5%9F%20Duvarlar%20Aras%C4%B1nda.mp3', name: 'Taş Duvarlar Arasında' },
        { file: './assest/music/Zindan%C4%B1n%20Nefesi.mp3', name: 'Zindanın Nefesi' },
        { file: './assest/music/soundreality-horror-rumble-winds-253834.mp3', name: 'Horror Rumble Winds' },
      ]);
    };
    loadTracks();
  }, []);

  // Keep volume refs in sync
  useEffect(() => { musicVolumeRef.current = musicVolume; }, [musicVolume]);
  useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

  // Play level beginning SFX on game mount + initialize seen SFX IDs
  useEffect(() => {
    // Mark all existing actions as already-seen for SFX so they don't replay
    actions.forEach(a => seenSfxIds.current.add(a.id));
    playSfx('levelBegining');
  }, []);

  // Watch for SFX-triggering actions (plays for EVERYONE, only NEW actions)
  useEffect(() => {
    for (const action of actions) {
      if (seenSfxIds.current.has(action.id)) continue;
      seenSfxIds.current.add(action.id);
      const msg = action.action_value?.message || '';
      if (action.action_type === 'dm_action') {
        if (msg.includes('öldü')) playSfx('die');
        else if (msg.includes('hayata döndü')) playSfx('alive');
        else if (msg.includes('sersemledi')) playSfx('stun');
        else if (msg.includes('zehirlendi')) playSfx('potion');
        else if (msg.includes('hasar aldı')) playSfx('sword');
        else if (msg.includes('onaylandı') && action.action_value?.cardApproval) playSfx('card');
        else if (action.action_value?.resetCards) playSfx('card');
      }
    }
  }, [actions]);

  // Fade helper
  const fadeToTrack = (newTrack) => {
    const audio = musicRef.current;
    if (!audio) return;
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; }
    const doFadeIn = () => {
      if (!newTrack) {
        setCurrentMusic(null);
        currentMusicRef.current = null;
        return;
      }
      audio.src = newTrack;
      audio.loop = true;
      audio.volume = 0;
      setCurrentMusic(newTrack);
      currentMusicRef.current = newTrack;
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(() => {});
      const target = Math.max(0.01, musicVolumeRef.current / 100);
      fadeRef.current = setInterval(() => {
        const next = audio.volume + 0.05;
        if (next >= target) {
          audio.volume = target;
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        } else {
          audio.volume = next;
        }
      }, 50);
    };
    if (!audio.paused && audio.volume > 0) {
      fadeRef.current = setInterval(() => {
        const next = audio.volume - 0.05;
        if (next <= 0.01) {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeRef.current);
          fadeRef.current = null;
          doFadeIn();
        } else {
          audio.volume = next;
        }
      }, 50);
    } else {
      audio.pause();
      doFadeIn();
    }
  };

  // Watch for DM music selection broadcast
  useEffect(() => {
    const musicActions = actions.filter((a) =>
      a.action_type === 'dm_action' && a.action_value?.musicChange
    );
    if (musicActions.length === 0) return;
    const latest = musicActions[0]; // actions are newest-first
    const raw = latest.action_value.musicTrack;
    const track = (!raw || raw === '__stop__') ? null : raw;
    if (track !== currentMusicRef.current) {
      fadeToTrack(track);
    }
  }, [actions]);

  // Volume control
  useEffect(() => {
    const audio = musicRef.current;
    if (audio && !audio.paused && !fadeRef.current) {
      audio.volume = musicVolume / 100;
    }
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    s.gameMusicVolume = musicVolume;
    localStorage.setItem('vulpax_settings', JSON.stringify(s));
  }, [musicVolume]);

  // SFX volume persistence
  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    s.gameSfxVolume = sfxVolume;
    localStorage.setItem('vulpax_settings', JSON.stringify(s));
  }, [sfxVolume]);

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (musicRef.current) { musicRef.current.pause(); musicRef.current.src = ''; }
    };
  }, []);

  const handleMusicSelect = async (track) => {
    const trackName = track ? musicTracks.find(t => t.file === track)?.name || '?' : 'Durduruldu';
    await sendAction(`🎵 Müzik: ${trackName}`, { musicTrack: track || '__stop__', musicChange: true });
    setShowMusicMenu(false);
  };

  const handleResetCards = async () => {
    setUsedCards([]);
    setFlippingCard(null);
    setPendingCard(null);
    await sendAction('🃏 Kartlar yeniden dağıtıldı! Tüm kartlar kullanılabilir.', { resetCards: true });
  };

  const sendAction = async (message, extra = {}) => {
    await supabase.from('room_actions').insert({
      room_id: roomId,
      user_id: profile.id,
      action_type: 'dm_action',
      action_value: { message, ...extra },
    });
  };

  const handleNarrate = async () => {
    if (!dmNarration.trim()) return;
    await sendAction(`📜 ${dmNarration.trim()}`);
    setDmNarration('');
  };

  const handleSetTurn = async () => {
    const m = members.find((mm) => mm.id === turnPlayer);
    if (!m) return;
    setCurrentTurnId(m.user_id);
    setCardUsedThisTurn(false);
    setPendingCard(null);
    setCardConfirm(null);

    // Show turn overlay immediately for the DM (useEffect won't fire since currentTurnId already set)
    const playerName = m.profiles?.username || 'Oyuncu';
    const playerTitle = titleMap[m.user_id] || null;
    const charImage = m.characters?.image_placeholder ? `.${m.characters.image_placeholder}` : null;
    const charName = m.characters?.name || null;
    const charRarity = m.characters?.rarity || 'common';
    const playerAvatar = avatarMap[m.user_id] || null;
    setTurnOverlay({ name: playerName, title: playerTitle, charImage, charName, charRarity, avatarUrl: playerAvatar });
    playSfx('levelBegining');
    setTimeout(() => setTurnOverlay(null), 3000);

    // Process poison tick for the player getting the turn
    if (m.poison_turns > 0) {
      const poisonDmg = m.poison_value || 0;
      const newHp = Math.max(0, m.current_health - poisonDmg);
      await updateMemberHealth(m.id, newHp);
      const newPoisonTurns = m.poison_turns - 1;
      await updateMemberPoison(m.id, newPoisonTurns, newPoisonTurns > 0 ? m.poison_value : 0);
      await sendAction(`🧪 ${m.profiles?.username} zehirden ${poisonDmg} hasar aldı! (${newHp} HP kaldı) [${newPoisonTurns} tur kaldı]`);
      if (newHp <= 0) {
        await updateMemberStatus(m.id, 'dead');
        await sendAction(`💀 ${m.profiles?.username} zehirden öldü!`);
      } else if (newPoisonTurns <= 0) {
        if (m.stun_turns <= 0) await updateMemberStatus(m.id, 'alive');
        await sendAction(`🧪 ${m.profiles?.username} zehir etkisi bitti!`);
      }
    }

    // Process stun decrement
    if (m.stun_turns > 0) {
      const newStun = m.stun_turns - 1;
      await updateMemberStun(m.id, newStun);
      if (newStun <= 0) {
        if (m.poison_turns <= 1) await updateMemberStatus(m.id, 'alive');
        await sendAction(`💫 ${m.profiles?.username} sersemletme etkisi bitti!`);
      }
    }

    await sendAction(`🔄 Sıra: ${m.profiles?.username || 'Oyuncu'}`, { turnUserId: m.user_id });
  };

  const handleDealDamage = async () => {
    if (!targetMember || damageAmount <= 0) return;
    const newHp = Math.max(0, targetMember.current_health - damageAmount);
    await updateMemberHealth(targetMember.id, newHp);
    await sendAction(`⚔ ${targetMember.profiles?.username} → ${damageAmount} hasar aldı! (${newHp} HP kaldı)`);
    setDamageAmount(0);
  };

  const handleHeal = async () => {
    if (!targetMember || healAmount <= 0) return;
    const maxHp = targetMember.characters?.health || 100;
    const newHp = Math.min(maxHp, targetMember.current_health + healAmount);
    await updateMemberHealth(targetMember.id, newHp);
    await sendAction(`💚 ${targetMember.profiles?.username} → ${healAmount} HP iyileşti! (${newHp} HP)`);
    setHealAmount(0);
  };

  const handleKill = async () => {
    if (!targetMember) return;
    await updateMemberHealth(targetMember.id, 0);
    await updateMemberStatus(targetMember.id, 'dead');
    await sendAction(`💀 ${targetMember.profiles?.username} öldü!`);
  };

  const handleRevive = async () => {
    if (!targetMember) return;
    const maxHp = targetMember.characters?.health || 100;
    await updateMemberHealth(targetMember.id, Math.floor(maxHp / 2));
    await updateMemberStatus(targetMember.id, 'alive');
    await sendAction(`✨ ${targetMember.profiles?.username} hayata döndü!`);
  };

  const handleStun = async () => {
    if (!targetMember) return;
    await updateMemberStatus(targetMember.id, 'stunned');
    await sendAction(`💫 ${targetMember.profiles?.username} sersemledi!`);
  };

  const handleBuff = async () => {
    if (!targetMember) return;
    await updateMemberStatus(targetMember.id, 'buffed');
    await sendAction(`⬆️ ${targetMember.profiles?.username} buff aldı! DM gücünü belirler.`);
  };

  const handleDebuff = async () => {
    if (!targetMember) return;
    await sendAction(`⬇️ ${targetMember.profiles?.username} debuff aldı! DM etkisini belirler.`);
  };

  const handlePoison = async () => {
    if (!targetMember) return;
    await updateMemberStatus(targetMember.id, 'poisoned');
    await sendAction(`🧪 ${targetMember.profiles?.username} zehirlendi!`);
  };

  // Player clicks a card → first show confirmation dialog
  const handleUseCard = (power) => {
    if (cardUsedThisTurn || pendingCard) return;
    if (!isMyTurn && !isDM) return;
    // Check stun: if stunned, can't use cards
    const me = members.find(m => m.user_id === profile.id);
    if (me?.stun_turns > 0) return;
    setCardConfirm({ power, step: 'confirm' });
    setCardTarget('');
  };

  // Player confirms they want to use the card → show target selection
  const handleCardConfirmYes = () => {
    setCardConfirm(prev => prev ? { ...prev, step: 'target' } : null);
  };

  // Player cancels card usage
  const handleCardConfirmNo = () => {
    setCardConfirm(null);
    setCardTarget('');
  };

  // Player selects target and sends card use request
  const handleCardSubmit = async () => {
    if (!cardConfirm?.power || !cardTarget) return;
    const power = cardConfirm.power;
    const targetMem = members.find(m => m.id === cardTarget);
    if (!targetMem) return;

    setFlippingCard(power.id);
    setCardConfirm(null);
    setCardUsedThisTurn(true);

    if (isDM) {
      // DM uses card directly — no approval needed
      await applyCardEffect(power, targetMem, profile);
      setUsedCards((prev) => [...prev, power.id]);
      setFlippingCard(null);
      // Turn stays with DM
    } else {
      // Player sends card use request to DM
      await supabase.from('room_actions').insert({
        room_id: roomId,
        user_id: profile.id,
        action_type: 'card_use',
        action_value: {
          card_name: power.name,
          cardId: power.id,
          effect_type: power.effect_type,
          effect_value: power.effect_value,
          pending: true,
          requester: profile.username || profile.id,
          targetMemberId: targetMem.id,
          targetName: targetMem.profiles?.username || 'Oyuncu',
        },
      });
      setPendingCard(power);
    }
  };

  // Skip turn (for stunned players or voluntary skip)
  const handleSkipTurn = async () => {
    // Don't decrement stun/poison here — DM's handleSetTurn handles that
    await sendAction(`⏭ ${profile.username} sırasını geçti.`);
    // Pass turn to DM (skipOverlay: no splash screen for skip)
    await sendAction(`🔄 Sıra: DM`, { turnUserId: currentRoom.dm_id, skipOverlay: true });
  };

  // Apply card effect based on effect_type
  const applyCardEffect = async (power, targetMem, caster) => {
    const casterMem = members.find(m => m.user_id === caster.id);
    const effectVal = power.effect_value || 0;
    const tName = targetMem.profiles?.username || 'Oyuncu';

    switch (power.effect_type) {
      case 'saldiri': {
        const atkBase = targetMem.user_id === caster.id ? (casterMem?.characters?.attack || 10) : (casterMem?.characters?.attack || 10);
        const atkBonus = casterMem?.attack_bonus || 0;
        const totalAtk = atkBase + atkBonus;
        const defBase = targetMem.characters?.defense || 0;
        const defBonus = targetMem.defense_bonus || 0;
        const totalDef = defBase + defBonus;
        const dmg = Math.max(0, totalAtk + effectVal - totalDef);
        const newHp = Math.max(0, targetMem.current_health - dmg);
        await updateMemberHealth(targetMem.id, newHp);
        await sendAction(`⚔ ${power.name} → ${tName}: ${totalAtk}+${effectVal}-${totalDef}=${dmg} hasar vuruldu! (${newHp} HP kaldı)`);
        if (newHp <= 0) {
          await updateMemberStatus(targetMem.id, 'dead');
          await sendAction(`💀 ${tName} öldü!`);
        }
        break;
      }
      case 'zehir': {
        await updateMemberPoison(targetMem.id, 3, effectVal);
        await updateMemberStatus(targetMem.id, 'poisoned');
        await sendAction(`🧪 ${power.name} → ${tName} zehirlendi! 3 tur boyunca her tur ${effectVal} hasar alacak.`);
        break;
      }
      case 'sersemletme': {
        await updateMemberStun(targetMem.id, 3);
        await updateMemberStatus(targetMem.id, 'stunned');
        await sendAction(`💫 ${power.name} → ${tName} sersemletildi! 3 tur boyunca kart atamaz.`);
        break;
      }
      case 'diriltme': {
        if (targetMem.status !== 'dead') {
          await sendAction(`✨ ${power.name} → ${tName} zaten hayatta!`);
          break;
        }
        const reviveHp = Math.min(effectVal, targetMem.characters?.health || 100);
        await updateMemberHealth(targetMem.id, reviveHp);
        await updateMemberStatus(targetMem.id, 'alive');
        await sendAction(`✨ ${power.name} → ${tName} diriltildi! (${reviveHp} HP ile hayata döndü)`);
        break;
      }
      case 'can': {
        const maxHp = targetMem.characters?.health || 100;
        const newHp = Math.min(maxHp, targetMem.current_health + effectVal);
        await updateMemberHealth(targetMem.id, newHp);
        await sendAction(`💚 ${power.name} → ${tName} ${effectVal} can kazandı! (${newHp} HP)`);
        break;
      }
      case 'savunma': {
        const newDefBonus = (targetMem.defense_bonus || 0) + effectVal;
        await updateMemberDefenseBonus(targetMem.id, newDefBonus);
        await sendAction(`🛡 ${power.name} → ${tName} savunması kalıcı +${effectVal} arttı! (${(targetMem.characters?.defense || 0)}+${newDefBonus})`);
        break;
      }
      case 'atak': {
        const newAtkBonus = (targetMem.attack_bonus || 0) + effectVal;
        await updateMemberAttackBonus(targetMem.id, newAtkBonus);
        await sendAction(`⚔ ${power.name} → ${tName} saldırısı kalıcı +${effectVal} arttı! (${(targetMem.characters?.attack || 0)}+${newAtkBonus})`);
        break;
      }
      case 'savunmakirici': {
        const newDefBonus = (targetMem.defense_bonus || 0) - effectVal;
        await updateMemberDefenseBonus(targetMem.id, newDefBonus);
        await sendAction(`🔻 ${power.name} → ${tName} savunması kalıcı -${effectVal} azaldı! (${(targetMem.characters?.defense || 0)}${newDefBonus >= 0 ? '+' : ''}${newDefBonus})`);
        break;
      }
      case 'atakkirici': {
        const newAtkBonus = (targetMem.attack_bonus || 0) - effectVal;
        await updateMemberAttackBonus(targetMem.id, newAtkBonus);
        await sendAction(`🔻 ${power.name} → ${tName} saldırısı kalıcı -${effectVal} azaldı! (${(targetMem.characters?.attack || 0)}${newAtkBonus >= 0 ? '+' : ''}${newAtkBonus})`);
        break;
      }
      default:
        await sendAction(`⚡ ${power.name} → ${tName} üzerinde kullanıldı.`);
    }
  };

  // DM approves a card — apply effect & pass turn to DM
  const handleApproveCard = async (action) => {
    const cardId = action.action_value?.cardId;
    // Build power object from action data (DM may not have this card equipped)
    const power = allPowers.find(p => p.id === cardId) || {
      id: cardId,
      name: action.action_value?.card_name,
      effect_type: action.action_value?.effect_type,
      effect_value: action.action_value?.effect_value,
    };
    const targetMem = members.find(m => m.id === action.action_value?.targetMemberId);
    const casterProfile = { id: action.user_id, username: action.profiles?.username };

    await sendAction(`✅ ${action.action_value?.card_name} onaylandı! ${action.profiles?.username} kartı kullandı.`, {
      cardApproval: true,
      cardId,
      approved: true,
      originalActionId: action.id,
    });

    // Apply card effect if we have the power and target
    if (power && targetMem) {
      await applyCardEffect(power, targetMem, casterProfile);
    }

    // Pass turn to DM (skipOverlay: no splash for card resolution)
    await sendAction(`🔄 Sıra: DM`, { turnUserId: currentRoom.dm_id, skipOverlay: true });
  };

  // DM rejects a card — pass turn to DM
  const handleRejectCard = async (action) => {
    const cardId = action.action_value?.cardId;
    await sendAction(`❌ ${action.action_value?.card_name} reddedildi.`, {
      cardApproval: true,
      cardId,
      approved: false,
      originalActionId: action.id,
    });

    // Pass turn to DM (skipOverlay: no splash for card resolution)
    await sendAction(`🔄 Sıra: DM`, { turnUserId: currentRoom.dm_id, skipOverlay: true });
  };

  const pendingCardActions = actions.filter((a) => a.action_type === 'card_use' && a.action_value?.pending);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr) 320px', gap: 16, flex: 1, minHeight: 0 }}>

      {/* Left: Players + Dice */}
      <div className="flex flex-col gap-md" style={{ minHeight: 0 }}>
        <div className="parchment-panel flex flex-col gap-md vulpax-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>
          <h3 style={{ fontSize: 16 }}>🧠 Oyuncular</h3>
          {members.map((member) => {
            const maxHp = member.characters?.health || 100;
            const hpPercent = Math.max(0, (member.current_health / maxHp) * 100);
            const hpClass = hpPercent > 60 ? 'high' : hpPercent > 30 ? 'mid' : 'low';
            const isTurn = currentTurnId === member.user_id;
            const statusClass = member.status === 'dead' ? 'simple-player-card--dead'
              : member.status === 'poisoned' ? 'simple-player-card--poisoned'
              : member.status === 'stunned' ? 'simple-player-card--stunned'
              : member.status === 'buffed' ? 'simple-player-card--buffed'
              : '';
            return (
              <div
                key={member.id}
                className={`simple-player-card ${selectedTarget === member.id ? 'simple-player-card--selected' : ''} ${isTurn ? 'simple-player-card--turn' : ''} ${statusClass}`}
                onClick={() => {
                  if (isDM) {
                    setSelectedTarget(member.id);
                    if (member.characters) setViewingCharacter(member);
                  } else if (member.characters) setViewingCharacter(member);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-center justify-between mb-sm">
                  <div className="flex items-center gap-sm" style={{ overflow: 'hidden', flex: 1 }}>
                    {avatarMap[member.user_id] ? (
                      <img src={avatarMap[member.user_id]} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-dark)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--parchment-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: '2px solid var(--border-dark)', flexShrink: 0 }}>⚔</div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div className={`simple-player-card__name ${statusClass ? 'status-pulse' : ''}`} style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: isTurn ? '#ffd700' : 'var(--gold)' }}>
                        {isTurn && '🔄 '}{member.profiles?.username}
                      </div>
                      {titleMap[member.user_id] && (
                        <div style={{ color: '#9C27B0', fontSize: 11 }}>&lt;{titleMap[member.user_id]}&gt;</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    {member.user_id === currentRoom.dm_id && (
                      <span className="badge badge--dm" style={{ fontSize: 9, padding: '1px 6px' }}>DM</span>
                    )}
                    <span className={`badge badge--${member.status}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                      {member.status}
                    </span>
                  </div>
                </div>
                <div className="text-dim" style={{ fontSize: 11, marginBottom: 6 }}>
                  {member.characters?.name || 'Serbest Karakter'}
                </div>
                <div className="health-bar">
                  <div className={`health-bar__fill health-bar__fill--${hpClass}`} style={{ width: `${hpPercent}%` }} />
                </div>
                <div className="text-dim" style={{ fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                  ❤️ {member.current_health}/{maxHp}
                </div>
              </div>
            );
          })}

          {isDM && selectedTarget && targetMember && (
            <div className="simple-dm-quick" style={{ marginTop: 8 }}>
              <div className="text-gold text-sm mb-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                🎯 {targetMember.profiles?.username}
              </div>
              <div className="flex flex-col gap-sm">
                <div className="flex gap-sm items-center">
                  <input type="number" className="input input--sm" style={{ width: 60 }} value={damageAmount} onChange={(e) => setDamageAmount(Math.max(0, Number(e.target.value)))} min={0} />
                  <button className="btn btn-danger btn-sm" onClick={handleDealDamage} style={{ flex: 1 }}>⚔ Hasar</button>
                </div>
                <div className="flex gap-sm items-center">
                  <input type="number" className="input input--sm" style={{ width: 60 }} value={healAmount} onChange={(e) => setHealAmount(Math.max(0, Number(e.target.value)))} min={0} />
                  <button className="btn btn-primary btn-sm" onClick={handleHeal} style={{ flex: 1 }}>💚 İyileştir</button>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-danger btn-sm" onClick={handleKill} style={{ flex: 1, fontSize: 11 }}>💀 Öldür</button>
                  <button className="btn btn-gold btn-sm" onClick={handleRevive} style={{ flex: 1, fontSize: 11 }}>✨ Dirilt</button>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-ghost btn-sm" onClick={handleStun} style={{ flex: 1, fontSize: 11 }}>💫 Sersemlet</button>
                  <button className="btn btn-ghost btn-sm" onClick={handlePoison} style={{ flex: 1, fontSize: 11 }}>🧪 Zehirle</button>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-primary btn-sm" onClick={handleBuff} style={{ flex: 1, fontSize: 11 }}>⬆️ Buff</button>
                  <button className="btn btn-danger btn-sm" onClick={handleDebuff} style={{ flex: 1, fontSize: 11 }}>⬇️ Debuff</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dice Tray */}
        <div className="parchment-panel" style={{ padding: 16, flexShrink: 0 }}>
          <DiceTray roomId={roomId} userId={profile.id} />
        </div>
      </div>

      {/* Center: Story + Cards */}
      <div className="flex flex-col gap-md" style={{ minHeight: 0 }}>
        {/* Story Log */}
        <div className="parchment-panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 20, display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-gold mb-md" style={{ fontFamily: 'var(--font-display)', fontSize: 18, textAlign: 'center', flexShrink: 0 }}>
            📜 Macera Günlüğü
          </h3>
          <div className="simple-story-log vulpax-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {actions.filter((a) => a.action_type === 'dm_action' || a.action_type === 'chat_message' || a.action_type === 'card_use' || a.action_type === 'dice_roll').map((action) => (
              <div key={action.id} className={`simple-story-entry ${action.action_type === 'dm_action' ? 'simple-story-entry--dm' : ''} ${action.action_type === 'card_use' ? 'simple-story-entry--card' : ''} ${action.action_type === 'dice_roll' ? 'simple-story-entry--dice' : ''}`}>
                <span className="simple-story-entry__author">
                  {action.profiles?.username || 'DM'}:
                </span>
                <span className="simple-story-entry__text">
                  {action.action_type === 'card_use'
                    ? <>🃏 <span
                        style={{ textDecoration: 'underline', cursor: isDM ? 'pointer' : 'default', color: 'var(--gold)' }}
                        onClick={() => {
                          if (isDM) {
                            const card = allPowers.find(p => p.id === action.action_value?.cardId) || {
                              id: action.action_value?.cardId,
                              name: action.action_value?.card_name,
                              effect_type: action.action_value?.effect_type,
                              effect_value: action.action_value?.effect_value,
                              rarity: 'common',
                              description: '',
                            };
                            setViewingCard(card);
                          }
                        }}
                      >{action.action_value?.card_name}</span> → {action.action_value?.targetName || '?'} üzerinde kullanmak istiyor {action.action_value?.pending && !processedApprovals.has(action.id) ? '(Onay bekleniyor...)' : ''}</>
                    : action.action_type === 'dice_roll'
                    ? `🎲 ${action.action_value?.dice_type} attı → ${action.action_value?.result}${action.action_value?.is_critical ? ' 🎉 KRİTİK!' : ''}${action.action_value?.is_fumble ? ' 💀 FUMBLE!' : ''}`
                    : (action.action_value?.message || action.action_value?.text || '')}
                </span>
                {/* DM can approve/reject pending card uses — hide if already processed */}
                {isDM && action.action_type === 'card_use' && action.action_value?.pending && !processedApprovals.has(action.id) && (
                  <div className="flex gap-sm" style={{ marginTop: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproveCard(action)} style={{ fontSize: 11, padding: '2px 10px' }}>✅ Onayla</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRejectCard(action)} style={{ fontSize: 11, padding: '2px 10px' }}>❌ Reddet</button>
                  </div>
                )}
              </div>
            ))}
            {actions.length === 0 && (
              <div className="text-center text-dim" style={{ padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧙</div>
                <p>Macera başlamak üzere...</p>
                <p className="text-sm" style={{ marginTop: 4 }}>DM hikayeyi anlatmaya başlayacak.</p>
              </div>
            )}
          </div>
        </div>

        {/* Power Cards – always visible, disabled when not your turn */}
        {allPowers.length > 0 && (() => {
          const me = members.find(m => m.user_id === profile.id);
          const isStunned = me?.stun_turns > 0;
          const notMyTurn = !isMyTurn && !isDM;
          const cardsDisabled = cardUsedThisTurn || isStunned || !!pendingCard || notMyTurn;
          return (
          <div className="parchment-panel" style={{ padding: '16px 8px', overflow: 'visible', flexShrink: 0, opacity: notMyTurn ? 0.4 : cardsDisabled ? 0.5 : 1, position: 'relative' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10, padding: '0 8px' }}>
              <h3 style={{ fontSize: 14, textAlign: 'center', color: 'var(--gold)', flex: 1 }}>
                ✨ Güç Kartları {isMyTurn && !isDM ? '(Sıra sende!)' : notMyTurn ? '(Sıra sende değil)' : ''}
                {isStunned && isMyTurn && ' 💫 Sersemledin!'}
                {cardUsedThisTurn && !isStunned && isMyTurn && ' (Bu tur kart kullandın)'}
              </h3>
              {isMyTurn && !isDM && (
                <button className="btn btn-ghost btn-sm" onClick={handleSkipTurn} style={{ fontSize: 11, flexShrink: 0 }}>
                  ⏭ Sıramı Geç
                </button>
              )}
            </div>
            {cardsDisabled && isStunned && isMyTurn && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <button className="btn btn-gold btn-sm" onClick={handleSkipTurn}>
                  ⏭ Sıramı Geç (Sersemletildin — {me.stun_turns} tur kaldı)
                </button>
              </div>
            )}
            {!notMyTurn && !cardsDisabled && (
            <div className="card-carousel-wrapper">
              <button className="card-carousel-arrow card-carousel-arrow--left" onClick={() => { if (cardHandRef.current) cardHandRef.current.scrollBy({ left: -240, behavior: 'smooth' }); }}>‹</button>
              <div className="simple-card-hand" ref={cardHandRef}>
              {allPowers.map((power) => {
                const isUsed = usedCards.includes(power.id);
                const isFlipping = flippingCard === power.id;
                const isPending = pendingCard?.id === power.id;
                return (
                  <div
                    key={power.id}
                    className={`simple-power-card simple-power-card--${power.rarity} ${isFlipping ? 'simple-power-card--flipping' : ''} ${isUsed ? 'simple-power-card--used' : ''} ${isPending ? 'simple-power-card--pending' : ''}`}
                    onClick={() => !isUsed && !isPending && !cardsDisabled && handleUseCard(power)}
                    style={{ cursor: isUsed || isPending || cardsDisabled ? 'default' : 'pointer' }}
                  >
                    <div className="simple-power-card__inner">
                      <div className="simple-power-card__front" style={getCardImage(power) ? { backgroundImage: `url(${getCardImage(power)})` } : { background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!getCardImage(power) && <div style={{ fontSize: 32, color: 'var(--text-dim)', position: 'absolute', top: '30%' }}>✨</div>}
                        <div className="simple-power-card__name-label">{power.name}</div>
                        {isUsed && <div className="simple-power-card__used-overlay">Kullanıldı</div>}
                        {isPending && <div className="simple-power-card__used-overlay">Onay Bekleniyor...</div>}
                      </div>
                      <div className="simple-power-card__back">
                        <div style={{ fontSize: 32 }}>🃏</div>
                        <div style={{ fontSize: 10, marginTop: 4 }}>Vulpax DnD</div>
                      </div>
                    </div>
                    {/* Speech bubble tooltip */}
                    <div className="card-tooltip">
                      <div className="card-tooltip__arrow" />
                      <div className="card-tooltip__icon">{getEffectIcon(power.effect_type)}</div>
                      <div className="card-tooltip__name">{power.name}</div>
                      <div className="card-tooltip__type">{getEffectLabel(power.effect_type)}</div>
                      {power.effect_value > 0 && (
                        <div className="card-tooltip__value">{power.effect_value}</div>
                      )}
                      {power.description && <div className="card-tooltip__desc">{power.description}</div>}
                    </div>
                  </div>
                );
              })}
              </div>
              <button className="card-carousel-arrow card-carousel-arrow--right" onClick={() => { if (cardHandRef.current) cardHandRef.current.scrollBy({ left: 240, behavior: 'smooth' }); }}>›</button>
            </div>
            )}
            {notMyTurn && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', gap: 8, flexWrap: 'wrap' }}>
                {allPowers.slice(0, 5).map(power => (
                  <div key={power.id} style={{ width: 60, height: 80, borderRadius: 6, border: '1px solid var(--border-dark)', overflow: 'hidden', opacity: usedCards.includes(power.id) ? 0.3 : 0.7, position: 'relative' }}>
                    <div style={getCardImage(power) ? { width: '100%', height: '100%', backgroundImage: `url(${getCardImage(power)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { width: '100%', height: '100%', background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-dim)' }}>{!getCardImage(power) && '✨'}</div>
                    {usedCards.includes(power.id) && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--text-dim)' }}>Kullanıldı</div>}
                  </div>
                ))}
                {allPowers.length > 5 && <div style={{ width: 60, height: 80, borderRadius: 6, border: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-dim)', background: 'var(--darker-bg)' }}>+{allPowers.length - 5}</div>}
              </div>
            )}
          </div>
          );
        })()}

        {/* Standalone Skip Turn button — always visible when it's your turn and no cards */}
        {isMyTurn && !isDM && allPowers.length === 0 && (
          <div className="parchment-panel" style={{ padding: 12, flexShrink: 0, textAlign: 'center' }}>
            <button className="btn btn-gold btn-sm" onClick={handleSkipTurn}>
              ⏭ Sıramı Geç
            </button>
          </div>
        )}
      </div>

      {/* Right: Chat + DM Controls + Voice */}
      <div className="flex flex-col gap-md" style={{ minHeight: 0 }}>
        {/* Music + SFX Volume Controls */}
        <div className="game-music-bar">
          <div className="game-music-bar__row">
            <span>🎵</span>
            <span className="game-music-bar__name">
              {currentMusic ? (musicTracks.find(t => t.file === currentMusic)?.name || '♫') : 'Müzik yok'}
            </span>
            <input
              type="range" min={0} max={100} value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className="game-music-bar__slider"
            />
          </div>
          <div className="game-music-bar__row">
            <span>🔊</span>
            <span className="game-music-bar__name">Efekt Sesleri</span>
            <input
              type="range" min={0} max={100} value={sfxVolume}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              className="game-music-bar__slider"
            />
          </div>
        </div>
        <div className="parchment-panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 15, marginBottom: 12, flexShrink: 0 }}>💬 Sohbet</h3>
          <div className="vulpax-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <ChatBox roomId={roomId} />
          </div>
        </div>
        {/* DM Controls: Narrate + Turn (between Chat and Voice) */}
        {isDM && (
          <div className="parchment-panel" style={{ padding: 12, flexShrink: 0 }}>
            <div className="flex flex-col gap-sm">
              <div className="flex gap-sm">
                <textarea
                  className="input"
                  placeholder="Hikayeyi anlat..."
                  value={dmNarration}
                  onChange={(e) => setDmNarration(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNarrate(); } }}
                  rows={2}
                  style={{ flex: 1, resize: 'vertical', fontSize: 12 }}
                />
                <button className="btn btn-gold btn-sm" onClick={handleNarrate} disabled={!dmNarration.trim()}>
                  📜
                </button>
              </div>
              <div className="flex gap-sm items-center">
                <select className="input input--sm" value={turnPlayer} onChange={(e) => setTurnPlayer(e.target.value)} style={{ flex: 1, fontSize: 11 }}>
                  <option value="">-- Sıra kimin? --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.profiles?.username}{m.user_id === currentRoom.dm_id ? ' (DM)' : ''}</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleSetTurn} disabled={!turnPlayer} style={{ fontSize: 11 }}>
                  🔄 Sıra
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="parchment-panel" style={{ padding: 16, position: 'relative', flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>🎙 Sesli Sohbet</h3>
          <VoiceChat roomId={roomId} />
        </div>
      </div>

      {/* In-game Music Audio Element */}
      <audio ref={musicRef} preload="auto" />

      {/* Card Confirmation Dialog */}
      {cardConfirm && (
        <div className="card-detail-overlay" onClick={handleCardConfirmNo}>
          <div className="card-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            {cardConfirm.step === 'confirm' ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🃏</div>
                <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
                  {cardConfirm.power.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>
                  {cardConfirm.power.description}
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 16 }}>
                  {getEffectIcon(cardConfirm.power.effect_type)} {getEffectLabel(cardConfirm.power.effect_type)}
                  {cardConfirm.power.effect_value > 0 && ` (${cardConfirm.power.effect_value})`}
                </p>
                <p style={{ color: 'var(--text-primary)', fontSize: 15, marginBottom: 16 }}>
                  Bu kartı kullanmak istiyor musun?
                </p>
                <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-gold" onClick={handleCardConfirmYes}>✅ Evet</button>
                  <button className="btn btn-danger" onClick={handleCardConfirmNo}>❌ Hayır</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                <h3 style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
                  Hedef Seç
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                  {cardConfirm.power.name} kartını kime kullanacaksın?
                </p>
                <div className="flex flex-col gap-sm" style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      className={`btn ${cardTarget === m.id ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                      onClick={() => setCardTarget(m.id)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
                    >
                      <span>{m.profiles?.username}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 8 }}>
                        ❤️{m.current_health} ⚔{(m.characters?.attack || 0) + (m.attack_bonus || 0)} 🛡{(m.characters?.defense || 0) + (m.defense_bonus || 0)}
                      </span>
                      {m.status !== 'alive' && <span className={`badge badge--${m.status}`} style={{ fontSize: 9, marginLeft: 6 }}>{m.status}</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-gold" onClick={handleCardSubmit} disabled={!cardTarget}>🎯 Kullan</button>
                  <button className="btn btn-danger" onClick={handleCardConfirmNo}>❌ İptal</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Card Detail Popup for DM */}
      {viewingCard && (
        <div className="card-detail-overlay" onClick={() => setViewingCard(null)}>
          <div className="card-detail-popup" onClick={(e) => e.stopPropagation()}>
            <button className="card-detail-popup__close" onClick={() => setViewingCard(null)}>✕</button>
            <div className="card-detail-popup__image" style={getCardImage(viewingCard) ? { backgroundImage: `url(${getCardImage(viewingCard)})` } : { background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--text-dim)' }}>{!getCardImage(viewingCard) && '✨'}</div>
            <div className="card-detail-popup__content">
              <div className="card-detail-popup__icon">{getEffectIcon(viewingCard.effect_type)}</div>
              <h2 className="card-detail-popup__name">{viewingCard.name}</h2>
              <div className="card-detail-popup__type">
                {getEffectLabel(viewingCard.effect_type)}
              </div>
              {viewingCard.effect_value > 0 && (
                <div className="card-detail-popup__value">{viewingCard.effect_value}</div>
              )}
              {viewingCard.rarity && (
                <div className="card-detail-popup__rarity" data-rarity={viewingCard.rarity}>
                  {viewingCard.rarity.toUpperCase()}
                </div>
              )}
              {viewingCard.description && (
                <p className="card-detail-popup__desc">{viewingCard.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DM Floating Action Buttons */}
      {isDM && (
        <>
          {/* DM Notes FAB */}
          <button
            className="dm-fab dm-fab--notes"
            onClick={() => setShowDmNotes(!showDmNotes)}
            title="DM Notları"
          >
            📋
          </button>
          {/* DM Music FAB */}
          <button
            className="dm-fab dm-fab--music"
            onClick={() => setShowMusicMenu(!showMusicMenu)}
            title="Müzik Seç"
          >
            🎵
          </button>
          {/* DM Card Reset FAB */}
          <button
            className="dm-fab dm-fab--cards"
            onClick={handleResetCards}
            title="Kartları Yeniden Dağıt"
          >
            🃏
          </button>

          {/* Music Dropdown */}
          {showMusicMenu && (
            <div className="dm-fab-dropdown dm-fab-dropdown--music">
              <div className="dm-fab-dropdown__title">🎵 Müzik Seç</div>
              <div className="dm-fab-dropdown__item" onClick={() => handleMusicSelect(null)}>
                🔇 Müziği Durdur
              </div>
              {musicTracks.map((track) => (
                <div
                  key={track.file}
                  className={`dm-fab-dropdown__item ${currentMusic === track.file ? 'dm-fab-dropdown__item--active' : ''}`}
                  onClick={() => handleMusicSelect(track.file)}
                >
                  {currentMusic === track.file ? '🔊' : '🎵'} {track.name}
                </div>
              ))}
            </div>
          )}

          {/* DM Notes Panel */}
          {showDmNotes && (
            <div className="dm-notes-popup">
              <div className="dm-notes-popup__header">
                <h3>📋 DM Notları</h3>
                <button className="dm-notes-popup__close" onClick={() => setShowDmNotes(false)}>✕</button>
              </div>
              <textarea
                className="dm-notes-popup__textarea"
                value={dmNotesText}
                onChange={(e) => {
                  setDmNotesText(e.target.value);
                  localStorage.setItem(`dm_notes_${roomId}`, e.target.value);
                }}
                placeholder="Macera notlarını buraya yaz... NPC isimleri, plan, gizli bilgiler..."
              />
            </div>
          )}
        </>
      )}

      {/* Character Detail Popup (clicking on a player) */}
      {viewingCharacter && (
        <div className="card-detail-overlay" onClick={() => setViewingCharacter(null)}>
          <div className="card-detail-popup" onClick={(e) => e.stopPropagation()}>
            <button className="card-detail-popup__close" onClick={() => setViewingCharacter(null)}>✕</button>
            <div className="card-detail-popup__image" style={getCardImage(viewingCharacter.characters || viewingCharacter) ? { backgroundImage: `url(${getCardImage(viewingCharacter.characters || viewingCharacter)})` } : { background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--text-dim)' }}>{!getCardImage(viewingCharacter.characters || viewingCharacter) && '⚔️'}</div>
            <div className="card-detail-popup__content">
              <div className="card-detail-popup__icon">⚔️</div>
              <h2 className="card-detail-popup__name">{viewingCharacter.characters?.name || '?'}</h2>
              <div className="card-detail-popup__type">
                {viewingCharacter.profiles?.username || 'Oyuncu'}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>❤️</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', fontSize: 18 }}>{viewingCharacter.current_health}/{viewingCharacter.characters?.health || '?'}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>CAN</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>⚔️</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', fontSize: 18 }}>
                    {viewingCharacter.characters?.attack || 0}
                    {(viewingCharacter.attack_bonus || 0) !== 0 && (
                      <span style={{ color: (viewingCharacter.attack_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 14 }}>
                        {(viewingCharacter.attack_bonus || 0) > 0 ? '+' : ''}{viewingCharacter.attack_bonus || 0}
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>SALDIRI {(viewingCharacter.attack_bonus || 0) !== 0 && `= ${(viewingCharacter.characters?.attack || 0) + (viewingCharacter.attack_bonus || 0)}`}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>🛡️</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', fontSize: 18 }}>
                    {viewingCharacter.characters?.defense || 0}
                    {(viewingCharacter.defense_bonus || 0) !== 0 && (
                      <span style={{ color: (viewingCharacter.defense_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 14 }}>
                        {(viewingCharacter.defense_bonus || 0) > 0 ? '+' : ''}{viewingCharacter.defense_bonus || 0}
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>SAVUNMA {(viewingCharacter.defense_bonus || 0) !== 0 && `= ${(viewingCharacter.characters?.defense || 0) + (viewingCharacter.defense_bonus || 0)}`}</div>
                </div>
              </div>
              {/* Intelligence & Charisma (info only) */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>🧠</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', fontSize: 16 }}>{viewingCharacter.characters?.intelligence || '?'}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>ZEKA</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>👑</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', fontSize: 16 }}>{viewingCharacter.characters?.charisma || '?'}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>KARİZMA</div>
                </div>
              </div>
              {/* Poison / Stun info */}
              {(viewingCharacter.poison_turns > 0 || viewingCharacter.stun_turns > 0) && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {viewingCharacter.poison_turns > 0 && (
                    <span className="badge badge--poisoned" style={{ fontSize: 10 }}>🧪 Zehir: {viewingCharacter.poison_turns} tur ({viewingCharacter.poison_value}/tur)</span>
                  )}
                  {viewingCharacter.stun_turns > 0 && (
                    <span className="badge badge--stunned" style={{ fontSize: 10 }}>💫 Sersemletme: {viewingCharacter.stun_turns} tur</span>
                  )}
                </div>
              )}
              {viewingCharacter.characters?.rarity && (
                <div className="card-detail-popup__rarity" data-rarity={viewingCharacter.characters.rarity} style={{ marginTop: 8 }}>
                  {viewingCharacter.characters.rarity.toUpperCase()}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <span className={`badge badge--${viewingCharacter.status}`}>{viewingCharacter.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast: Character Selection Overlay (visible to everyone) */}
      {charSelectOverlay && (
        <div className="char-selected-overlay">
          <div className="char-selected-overlay__content">
            <div className="char-selected-overlay__text">⚔ Karakter Seçildi!</div>
            <div className="char-selected-overlay__name">{charSelectOverlay.charName}</div>
            <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)', fontSize: 16, marginTop: 6 }}>
              Oyuncu: {charSelectOverlay.username}
            </div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>❤️</div>
                <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)' }}>{charSelectOverlay.charHealth}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>⚔️</div>
                <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)' }}>{charSelectOverlay.charAttack}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>🛡️</div>
                <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)' }}>{charSelectOverlay.charDefense}</div>
              </div>
            </div>
            {charSelectOverlay.charRarity && (
              <div className="card-detail-popup__rarity" data-rarity={charSelectOverlay.charRarity} style={{ marginTop: 10 }}>
                {charSelectOverlay.charRarity.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcast: Dice Roll Fullscreen Overlay (visible to everyone) */}
      {diceOverlay && (
        <div className="dice-broadcast-overlay">
          <div className="dice-broadcast-overlay__content">
            <div className="dice-broadcast-overlay__who">{diceOverlay.username}</div>
            <div className="dice-broadcast-overlay__label">{diceOverlay.dice_type} attı!</div>
            <div className="dice3d-scene dice3d-scene--broadcast">
              <div className="dice3d-cube dice3d-cube--rolling">
                <div className="dice3d-face dice3d-face--front">{diceOverlay.result}</div>
                <div className="dice3d-face dice3d-face--back">⚔</div>
                <div className="dice3d-face dice3d-face--right">🎲</div>
                <div className="dice3d-face dice3d-face--left">⚡</div>
                <div className="dice3d-face dice3d-face--top">🔥</div>
                <div className="dice3d-face dice3d-face--bottom">💀</div>
              </div>
            </div>
            <div className={`dice-broadcast-overlay__result ${diceOverlay.is_critical ? 'dice-broadcast-overlay__result--critical' : ''} ${diceOverlay.is_fumble ? 'dice-broadcast-overlay__result--fumble' : ''}`}>
              {diceOverlay.result}
            </div>
            {diceOverlay.is_critical && <div className="dice-broadcast-overlay__special">🎉 KRİTİK!</div>}
            {diceOverlay.is_fumble && <div className="dice-broadcast-overlay__special dice-broadcast-overlay__special--fumble">💀 FUMBLE!</div>}
          </div>
        </div>
      )}

      {/* Turn Announcement Overlay */}
      {turnOverlay && (
        <div className="turn-announce-overlay" onClick={() => setTurnOverlay(null)}>
          <div className="turn-announce-overlay__content">
            {/* Character Card — market-style */}
            <div className="turn-announce-overlay__card">
              <div className="turn-announce-overlay__card-image" style={turnOverlay.charImage ? { backgroundImage: `url(${turnOverlay.charImage})` } : {}} />
              <div className="turn-announce-overlay__card-body">
                <div className="turn-announce-overlay__card-name">{turnOverlay.charName || '⚔ Karakter'}</div>
                <div className="turn-announce-overlay__card-rarity">{turnOverlay.charRarity?.toUpperCase()}</div>
              </div>
            </div>

            {/* Divider */}
            <div className="turn-announce-overlay__divider" />

            {/* Player Info */}
            <div className="turn-announce-overlay__player">
              <div className="turn-announce-overlay__avatar-wrap">
                {turnOverlay.avatarUrl ? (
                  <img src={turnOverlay.avatarUrl} alt="" className="turn-announce-overlay__avatar" />
                ) : (
                  <div className="turn-announce-overlay__avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'var(--darker-bg)' }}>⚔</div>
                )}
              </div>
              <div className="turn-announce-overlay__name">{turnOverlay.name}</div>
              {turnOverlay.title && (
                <div className="turn-announce-overlay__title">&lt;{turnOverlay.title}&gt;</div>
              )}
              <div className="turn-announce-overlay__label">⚔ Sıra Sende!</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getEffectIcon(type) {
  switch (type) {
    case 'saldiri': return '⚔';
    case 'zehir': return '🧪';
    case 'sersemletme': return '💫';
    case 'diriltme': return '✨';
    case 'can': return '💚';
    case 'savunma': return '🛡';
    case 'atak': return '⚔';
    case 'savunmakirici': return '🔻';
    case 'atakkirici': return '🔻';
    // legacy
    case 'damage': return '🔥';
    case 'heal': return '💚';
    case 'buff': return '⬆️';
    case 'debuff': return '⬇️';
    case 'utility': return '✨';
    default: return '⚡';
  }
}

function getEffectLabel(type) {
  switch (type) {
    case 'saldiri': return 'Saldırı';
    case 'zehir': return 'Zehir (3 tur)';
    case 'sersemletme': return 'Sersemletme (3 tur)';
    case 'diriltme': return 'Diriltme';
    case 'can': return 'Can';
    case 'savunma': return 'Savunma+';
    case 'atak': return 'Atak+';
    case 'savunmakirici': return 'Savunma Kırıcı';
    case 'atakkirici': return 'Atak Kırıcı';
    // legacy
    case 'damage': return 'Hasar';
    case 'heal': return 'İyileştirme';
    case 'buff': return 'Buff';
    case 'debuff': return 'Debuff';
    default: return type;
  }
}
