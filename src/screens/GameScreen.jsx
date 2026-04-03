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
import MonsterBook from '../components/MonsterBook';

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

  // Map drawer states
  const [mapOpen, setMapOpen] = useState(false);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const mapRef = useRef(null);
  const choseSfxRef = useRef(new Audio('./assest/chose.mp3'));

  // Fetch map markers & subscribe to realtime
  useEffect(() => {
    if (!roomId) return;
    supabase.from('map_markers').select('*').eq('room_id', roomId).then(({ data }) => {
      if (data) setMapMarkers(data);
    });
    const channel = supabase.channel(`map_markers_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMapMarkers(prev => [...prev.filter(m => m.user_id !== payload.new.user_id), payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setMapMarkers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.eventType === 'DELETE') {
          setMapMarkers(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const handleMapClick = async (e) => {
    if (!mapRef.current || !profile) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const sfx = choseSfxRef.current;
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    sfx.volume = (s.gameSfxVolume ?? 50) / 100;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
    const displayName = profile.display_name || profile.username || 'Anonim';
    const existing = mapMarkers.find(m => m.user_id === profile.id);
    if (existing) {
      await supabase.from('map_markers').update({ x, y, user_name: displayName }).eq('id', existing.id);
    } else {
      await supabase.from('map_markers').insert({ room_id: roomId, user_id: profile.id, user_name: displayName, x, y });
    }
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
      {/* Map Drawer — pull down from top center */}
      <div className={`map-drawer ${mapOpen ? 'map-drawer--open' : ''}`}>
        <div className="map-drawer__handle" onClick={() => setMapOpen(!mapOpen)}>
          <span className="map-drawer__handle-icon">{mapOpen ? '▲' : '▼'}</span>
          <span>🗺️ Harita</span>
          <span className="map-drawer__handle-icon">{mapOpen ? '▲' : '▼'}</span>
        </div>
        {mapOpen && (
          <div className="map-drawer__content">
            <div className="map-drawer__image-wrap" ref={mapRef} onClick={handleMapClick}>
              <img src="./assest/map.png" alt="Harita" className="map-drawer__image" draggable={false} />
              {/* Knife markers */}
              {mapMarkers.map(marker => (
                <div
                  key={marker.id}
                  className="map-marker"
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  onMouseEnter={() => setHoveredMarker(marker.id)}
                  onMouseLeave={() => setHoveredMarker(null)}
                >
                  <img src="./assest/knife.png" alt="marker" className="map-marker__knife" draggable={false} />
                  {hoveredMarker === marker.id && (
                    <div className="map-marker__tooltip">{marker.user_name}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
                isDM={isDM}
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
  const [showStoryCards, setShowStoryCards] = useState(false); // DM story cards panel
  const [storyCards, setStoryCards] = useState([]);
  const [storyCardCategory, setStoryCardCategory] = useState('yol');
  const [storyCardExpanded, setStoryCardExpanded] = useState(null); // expanded card id

  // Fetch DM story cards
  useEffect(() => {
    if (!isDM) return;
    supabase.from('dm_story_cards').select('*').order('category').order('subcategory').then(({ data }) => {
      if (data) setStoryCards(data);
    });
  }, [isDM]);

  const [showMonsterBook, setShowMonsterBook] = useState(false); // monster bestiary book
  const [viewingCharacter, setViewingCharacter] = useState(null); // character detail popup (DM cockpit)
  const [viewingProfile, setViewingProfile] = useState(null); // character profile in chat area (everyone)
  const [charSelectOverlay, setCharSelectOverlay] = useState(null); // broadcast char select
  const [diceOverlay, setDiceOverlay] = useState(null); // broadcast dice roll fullscreen
  const [deathOverlay, setDeathOverlay] = useState(null); // death overlay { name }
  const [aliveOverlay, setAliveOverlay] = useState(null); // revival overlay { name }
  const [seenActionIds, setSeenActionIds] = useState(new Set()); // track processed actions
  const seenSfxIds = useRef(new Set()); // track SFX-processed actions (ref to avoid re-render loops)
  const { updateMemberHealth, updateMemberStatus, updateMemberAttackBonus, updateMemberDefenseBonus, updateMemberPoison, updateMemberStun, updateMemberAgilityBonus, updateMemberIntelligenceBonus, updateMemberCharismaBonus, updateMemberXp } = useRoomStore();

  // Card system v2 states
  const [cardConfirm, setCardConfirm] = useState(null); // {power, step:'confirm'|'target'}
  const [cardTarget, setCardTarget] = useState(''); // selected target member id for card
  const [cardUsedThisTurn, setCardUsedThisTurn] = useState(false); // only 1 card per turn
  const [processedApprovals, setProcessedApprovals] = useState(new Set()); // hide approve/reject buttons

  // Turn announcement overlay
  const [turnOverlay, setTurnOverlay] = useState(null); // { name, title, charImage, charName, charRarity, avatarUrl }
  const [titleMap, setTitleMap] = useState({}); // userId → title name
  const [avatarMap, setAvatarMap] = useState({}); // userId → avatar_url

  // XP Distribution UI
  const [showXpPanel, setShowXpPanel] = useState(false);
  const [xpTargetPlayer, setXpTargetPlayer] = useState(''); // specific player for XP

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

  // Normalize region/namespace to match arma filenames (case-insensitive, space/underscore equivalent)
  const ARMA_FILES = ['agnebogdir','caelestis_axis','drakshala','holtrheim','issalennia','lunaria','mortifodina','tirionnel'];
  const slugify = (str) => {
    if (!str) return '';
    const slug = String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (ARMA_FILES.includes(slug)) return slug;
    const flat = slug.replace(/_/g, '');
    const match = ARMA_FILES.find(f => f.replace(/_/g, '') === flat);
    return match || slug;
  };

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
  const xpRate = currentRoom?.xp_rate || 1;

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
          const approvedCardId = approvalAction.action_value.cardId;
          if (approvedCardId !== '__basic_attack__' && approvedCardId !== '__rest__') {
            setUsedCards((prev) => [...prev, approvedCardId]);
          }
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
        { file: './assest/music/1.mp3', name: '1' },
        { file: './assest/music/2.mp3', name: '2' }, 
        { file: './assest/music/3.mp3', name: '3' },
        { file: './assest/music/4.mp3', name: '4' },
        { file: './assest/music/5.mp3', name: '5' },
        { file: './assest/music/6.mp3', name: '6' },
        { file: './assest/music/7.mp3', name: '7' },
        { file: './assest/music/8.mp3', name: '8' },
        { file: './assest/music/9.mp3', name: '9' },
        { file: './assest/music/10.mp3', name: '10' },
        { file: './assest/music/11.mp3', name: '11' },
        { file: './assest/music/12.mp3', name: '12' },
        { file: './assest/music/13.mp3', name: '13' },
        { file: './assest/music/14.mp3', name: '14' },
        { file: './assest/music/15.mp3', name: '15' },       
        { file: './assest/music/16.mp3', name: '16' },
        { file: './assest/music/17.mp3', name: '17' },
        { file: './assest/music/18.mp3', name: '18' },
        { file: './assest/music/19.mp3', name: '19' },
        { file: './assest/music/agnebogdir_1.mp3', name: 'Agnebogdir 1' },
        { file: './assest/music/agnebogdir_2.mp3', name: 'Agnebogdir 2' },
        { file: './assest/music/agnebogdir_3.mp3', name: 'Agnebogdir 3' },
        { file: './assest/music/agnebogdir_4.mp3', name: 'Agnebogdir 4' },
        { file: './assest/music/caelestis_axis_1.mp3', name: 'Caelestis Axis 1' },
        { file: './assest/music/holtrheim_1.mp3', name: 'Höltrheim 1' },
        { file: './assest/music/holtrheim_2.mp3', name: 'Höltrheim 2' },
        { file: './assest/music/korku_1.mp3', name: 'Korku 1' },
        { file: './assest/music/korku_2.mp3', name: 'Korku 2' },
        { file: './assest/music/mortifodina_1.mp3', name: 'Mortifodina 1' },
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
        if (msg.includes('öldü')) {
          playSfx('die');
          // Extract player name from message (e.g. "💀 PlayerName öldü!")
          const nameMatch = msg.match(/💀\s*(.+?)\s*(?:zehirden\s+)?öldü/);
          setDeathOverlay({ name: nameMatch ? nameMatch[1] : '???' });
          setTimeout(() => setDeathOverlay(null), 3000);
        }
        else if (msg.includes('hayata döndü') || msg.includes('diriltildi')) {
          playSfx('alive');
          const nameMatch = msg.match(/✨\s*(?:.+?→\s*)?(.+?)\s*(?:hayata döndü|diriltildi)/);
          setAliveOverlay({ name: nameMatch ? nameMatch[1] : '???' });
          setTimeout(() => setAliveOverlay(null), 3000);
        }
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
    const rawTrack = (!raw || raw === '__stop__') ? null : raw;

    const resolveTrack = (candidate) => {
      if (!candidate) return null;
      // If exact match in loaded tracks
      if (musicTracks.find(t => t.file === candidate)) return candidate;
      // Try decodeURIComponent (handle percent-encoded names)
      try { const dec = decodeURIComponent(candidate); if (musicTracks.find(t => t.file === dec)) return dec; } catch (e) {}
      // Try common prefix
      const pref = candidate.startsWith('./') ? candidate : `./assest/music/${candidate}`;
      if (musicTracks.find(t => t.file === pref)) return pref;
      // Try encodeURIComponent
      try { const enc = encodeURIComponent(candidate); if (musicTracks.find(t => t.file === enc)) return enc; } catch (e) {}
      // Last resort: return candidate raw
      return candidate;
    };

    const resolved = resolveTrack(rawTrack);
    if (resolved !== currentMusicRef.current) {
      fadeToTrack(resolved);
    }
  }, [actions, musicTracks]);

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

  // XP: Give 1 XP to all non-DM players
  const handleGiveXpAll = async () => {
    const nonDm = members.filter(m => m.user_id !== currentRoom.dm_id);
    for (const m of nonDm) {
      await updateMemberXp(m.id, (m.xp || 0) + 1);
    }
    await sendAction(`⭐ Tüm oyunculara 1 XP verildi! (Atak/Savunma +${xpRate})`);
  };

  // XP: Give 1 XP to a specific player
  const handleGiveXpPlayer = async (memberId) => {
    const m = members.find(mm => mm.id === memberId);
    if (!m) return;
    await updateMemberXp(m.id, (m.xp || 0) + 1);
    await sendAction(`⭐ ${m.profiles?.username} → 1 XP kazandı! (Toplam: ${(m.xp || 0) + 1} XP)`);
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
    // XP: Ölen -2
    if (targetMember.user_id !== currentRoom.dm_id) {
      await updateMemberXp(targetMember.id, Math.max(0, (targetMember.xp || 0) - 2));
      await sendAction(`⭐ ${targetMember.profiles?.username} öldüğü için 2 XP kaybetti!`);
    }
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

  // Player confirms they want to use the card → show target selection (rest auto-targets self)
  const handleCardConfirmYes = async () => {
    if (cardConfirm?.power?.effect_type === 'dinlenme') {
      const me = members.find(m => m.user_id === profile.id);
      if (!me) return;
      const power = cardConfirm.power;
      setFlippingCard(power.id);
      setCardConfirm(null);
      setCardUsedThisTurn(true);
      if (isDM) {
        await applyCardEffect(power, me, profile);
        setFlippingCard(null);
      } else {
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
            targetMemberId: me.id,
            targetName: me.profiles?.username || 'Oyuncu',
          },
        });
        setPendingCard(power);
      }
      return;
    }
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
      if (!power.isSpecial) setUsedCards((prev) => [...prev, power.id]);
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
        const atkXp = (casterMem?.xp || 0) * xpRate;
        const totalAtk = atkBase + atkBonus + atkXp;
        const defBase = targetMem.characters?.defense || 0;
        const defBonus = targetMem.defense_bonus || 0;
        const defXp = (targetMem.xp || 0) * xpRate;
        const totalDef = defBase + defBonus + defXp;
        const dmg = Math.max(0, totalAtk + effectVal - totalDef);
        const newHp = Math.max(0, targetMem.current_health - dmg);
        await updateMemberHealth(targetMem.id, newHp);
        await sendAction(`⚔ ${power.name} → ${tName}: ${totalAtk}+${effectVal}-${totalDef}=${dmg} hasar vuruldu! (${newHp} HP kaldı)`);
        if (newHp <= 0) {
          await updateMemberStatus(targetMem.id, 'dead');
          await sendAction(`💀 ${tName} öldü!`);
          // XP: Ölen kişi -2 XP
          await updateMemberXp(targetMem.id, Math.max(0, (targetMem.xp || 0) - 2));
          await sendAction(`⭐ ${tName} öldüğü için 2 XP kaybetti!`);
          // XP: Öldüren kişi -1 XP
          if (casterMem && casterMem.user_id !== currentRoom.dm_id) {
            await updateMemberXp(casterMem.id, Math.max(0, (casterMem.xp || 0) - 1));
            await sendAction(`⭐ ${casterMem.profiles?.username} birini öldürdüğü için 1 XP kaybetti!`);
          }
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
        // XP: Diriltme kullanan kişi +1 XP
        if (casterMem && casterMem.user_id !== currentRoom.dm_id) {
          await updateMemberXp(casterMem.id, (casterMem.xp || 0) + 1);
          await sendAction(`⭐ ${casterMem.profiles?.username} diriltme yaptığı için 1 XP kazandı!`);
        }
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
      case 'temel_saldiri': {
        const atkBase = casterMem?.characters?.attack || 10;
        const atkBonus = casterMem?.attack_bonus || 0;
        const atkXp = (casterMem?.xp || 0) * xpRate;
        const totalAtk = atkBase + atkBonus + atkXp;
        const defBase = targetMem.characters?.defense || 0;
        const defBonus = targetMem.defense_bonus || 0;
        const defXp = (targetMem.xp || 0) * xpRate;
        const totalDef = defBase + defBonus + defXp;
        const dmg = Math.max(0, totalAtk - totalDef);
        const newHp = Math.max(0, targetMem.current_health - dmg);
        await updateMemberHealth(targetMem.id, newHp);
        await sendAction(`⚔ Normal Saldırı → ${tName}: ${totalAtk}-${totalDef}=${dmg} hasar! (${newHp} HP kaldı)`);
        if (newHp <= 0) {
          await updateMemberStatus(targetMem.id, 'dead');
          await sendAction(`💀 ${tName} öldü!`);
          // XP: Ölen kişi -2 XP
          await updateMemberXp(targetMem.id, Math.max(0, (targetMem.xp || 0) - 2));
          await sendAction(`⭐ ${tName} öldüğü için 2 XP kaybetti!`);
          // XP: Öldüren kişi -1 XP
          if (casterMem && casterMem.user_id !== currentRoom.dm_id) {
            await updateMemberXp(casterMem.id, Math.max(0, (casterMem.xp || 0) - 1));
            await sendAction(`⭐ ${casterMem.profiles?.username} birini öldürdüğü için 1 XP kaybetti!`);
          }
        }
        break;
      }
      case 'dinlenme': {
        const maxHp = targetMem.characters?.health || 100;
        const healHp = Math.min(maxHp, targetMem.current_health + 5);
        await updateMemberHealth(targetMem.id, healHp);
        await sendAction(`💤 ${tName} dinlendi ve 5 can kazandı! (${healHp} HP)`);
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

            // Coat of arms for character region (derived from characters.region)
            const region = member.characters?.region || null;
            const coatSrc = region ? `./assest/arma/${slugify(region)}.png` : null;
            const cardAvatar = getCardImage(member.characters) || null;
            return (
              <div
                key={member.id}
                className={`simple-player-card ${selectedTarget === member.id ? 'simple-player-card--selected' : ''} ${isTurn ? 'simple-player-card--turn' : ''} ${statusClass}`}
                onClick={() => {
                  setViewingProfile(member);
                  if (isDM) {
                    setSelectedTarget(member.id);
                    if (member.characters) setViewingCharacter(member);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  ...(cardAvatar ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url(${cardAvatar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : {})
                }}
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
                {member.user_id !== currentRoom.dm_id && (
                  <div style={{ fontSize: 11, color: '#FFD700', fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
                    ⭐ {member.xp || 0} XP <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>(+{(member.xp || 0) * xpRate} Atk/Def)</span>
                  </div>
                )}
                <div className="health-bar">
                  <div className={`health-bar__fill health-bar__fill--${hpClass}`} style={{ width: `${hpPercent}%` }} />
                </div>
                <div className="text-dim" style={{ fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                  ❤️ {member.current_health}/{maxHp}
                </div>
                {coatSrc && (
                  <img
                    src={coatSrc}
                    alt={member.characters?.region ? `${member.characters.region} arma` : 'Arma'}
                    title={member.characters?.region || ''}
                    className="char-coat-badge"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
            );
          })}


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
        {(() => {
          const me = members.find(m => m.user_id === profile.id);
          const myChar = me?.characters || null;
          const isStunned = me?.stun_turns > 0;
          const isDead = me?.status === 'dead';
          const notMyTurn = !isMyTurn && !isDM;
          const cardsDisabled = cardUsedThisTurn || isStunned || isDead || !!pendingCard || notMyTurn;

          // Build special cards from character (for everyone who has a character)
          const specialCards = [];
          if (myChar) {
            const myXpBonus = (me?.xp || 0) * xpRate;
            specialCards.push({
              id: '__basic_attack__',
              name: 'Normal Saldırı',
              effect_type: 'temel_saldiri',
              effect_value: 0,
              rarity: myChar.rarity || 'common',
              image_placeholder: myChar.image_placeholder,
              description: `Temel saldırı hasarı: ${(myChar.attack || 10) + (me?.attack_bonus || 0) + myXpBonus}`,
              isSpecial: true,
            });
            specialCards.push({
              id: '__rest__',
              name: 'Dinlen',
              effect_type: 'dinlenme',
              effect_value: 5,
              rarity: 'common',
              image_placeholder: myChar.image_placeholder,
              description: 'Dinlenerek 5 can kazan.',
              isSpecial: true,
            });
          }

          const allCards = [...allPowers, ...specialCards];
          if (allCards.length === 0) return null;
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
              {allCards.map((power) => {
                const isSpecial = !!power.isSpecial;
                const isUsed = !isSpecial && usedCards.includes(power.id);
                const isFlipping = flippingCard === power.id;
                const isPending = pendingCard?.id === power.id;
                const specialIcon = power.effect_type === 'temel_saldiri' ? '⚔' : power.effect_type === 'dinlenme' ? '💤' : null;
                return (
                  <div
                    key={power.id}
                    className={`simple-power-card simple-power-card--${power.rarity} ${isFlipping ? 'simple-power-card--flipping' : ''} ${isUsed ? 'simple-power-card--used' : ''} ${isPending ? 'simple-power-card--pending' : ''}`}
                    onClick={() => !isUsed && !isPending && !cardsDisabled && handleUseCard(power)}
                    style={{ cursor: isUsed || isPending || cardsDisabled ? 'default' : 'pointer' }}
                  >
                    <div className="simple-power-card__inner">
                      <div className="simple-power-card__front" style={getCardImage(power) ? { backgroundImage: `url(${getCardImage(power)})` } : { background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!getCardImage(power) && <div style={{ fontSize: 32, color: 'var(--text-dim)', position: 'absolute', top: '30%' }}>{specialIcon || '✨'}</div>}
                        {isSpecial && <div style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: power.effect_type === 'temel_saldiri' ? 'rgba(165,42,42,0.85)' : 'rgba(45,107,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, zIndex: 2, border: '1px solid rgba(255,255,255,0.2)' }}>{specialIcon}</div>}
                        <div className="simple-power-card__name-label">{power.name}</div>
                        {isUsed && <div className="simple-power-card__used-overlay">Kullanıldı</div>}
                        {isPending && <div className="simple-power-card__used-overlay">Onay Bekleniyor...</div>}
                      </div>
                      <div className="simple-power-card__back">
                        <div style={{ fontSize: 32 }}>{specialIcon || '🃏'}</div>
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
                {allCards.slice(0, 7).map(power => {
                  const isSpecial = !!power.isSpecial;
                  const specialIcon = power.effect_type === 'temel_saldiri' ? '⚔' : power.effect_type === 'dinlenme' ? '💤' : null;
                  return (
                  <div key={power.id} style={{ width: 60, height: 80, borderRadius: 6, border: isSpecial ? (power.effect_type === 'temel_saldiri' ? '1px solid var(--blood-red-light)' : '1px solid var(--success)') : '1px solid var(--border-dark)', overflow: 'hidden', opacity: (!isSpecial && usedCards.includes(power.id)) ? 0.3 : 0.7, position: 'relative' }}>
                    <div style={getCardImage(power) ? { width: '100%', height: '100%', backgroundImage: `url(${getCardImage(power)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { width: '100%', height: '100%', background: 'var(--darker-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-dim)' }}>{!getCardImage(power) && (specialIcon || '✨')}</div>
                    {!isSpecial && usedCards.includes(power.id) && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--text-dim)' }}>Kullanıldı</div>}
                    {isSpecial && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', fontSize: 7, textAlign: 'center', padding: '2px 0', color: 'var(--gold)' }}>{power.name}</div>}
                  </div>
                  );
                })}
                {allCards.length > 7 && <div style={{ width: 60, height: 80, borderRadius: 6, border: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-dim)', background: 'var(--darker-bg)' }}>+{allCards.length - 7}</div>}
              </div>
            )}
          </div>
          );
        })()}

        {/* Standalone Skip Turn button — always visible when it's your turn and no cards at all */}
        {isMyTurn && !isDM && allPowers.length === 0 && !members.find(m => m.user_id === profile.id)?.characters && (
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
          {viewingProfile ? (() => {
            const vp = members.find(m => m.id === viewingProfile.id) || viewingProfile;
            const vpMaxHp = vp.characters?.health || 100;
            const vpHpPercent = Math.max(0, (vp.current_health / vpMaxHp) * 100);
            const vpHpClass = vpHpPercent > 60 ? 'high' : vpHpPercent > 30 ? 'mid' : 'low';
            return (
              <>
                <div className="flex items-center justify-between" style={{ flexShrink: 0, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15 }}>📋 Karakter Profili</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setViewingProfile(null)} style={{ fontSize: 12 }}>💬 Sohbete Dön</button>
                </div>
                <div className="vulpax-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <div className="char-profile-view">
                    {/* Portrait */}
                    <div className="char-profile-view__portrait">
                      {getCardImage(vp.characters || vp)
                        ? <img src={getCardImage(vp.characters || vp)} alt="" className="char-profile-view__img" />
                        : <div className="char-profile-view__img-placeholder">⚔️</div>
                      }
                    </div>
                    {/* Name & Status */}
                    <div className="char-profile-view__name">{vp.characters?.name || 'Serbest Karakter'}</div>
                    <div className="char-profile-view__player">{vp.profiles?.username}</div>
                    {vp.characters?.rarity && (
                      <div className="card-detail-popup__rarity" data-rarity={vp.characters.rarity} style={{ margin: '6px auto' }}>
                        {vp.characters.rarity.toUpperCase()}
                      </div>
                    )}
                    <span className={`badge badge--${vp.status}`} style={{ fontSize: 11, margin: '4px auto', display: 'inline-block' }}>{vp.status}</span>

                    {/* XP Display */}
                    {vp.user_id !== currentRoom.dm_id && (
                      <div style={{ textAlign: 'center', margin: '8px 0 0', color: '#FFD700', fontFamily: 'var(--font-heading)', fontSize: 14 }}>
                        ⭐ {vp.xp || 0} XP <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(+{(vp.xp || 0) * xpRate} Atk/Def)</span>
                      </div>
                    )}

                    {/* HP Bar */}
                    <div style={{ margin: '12px 0 4px' }}>
                      <div className="health-bar" style={{ height: 14, borderRadius: 7 }}>
                        <div className={`health-bar__fill health-bar__fill--${vpHpClass}`} style={{ width: `${vpHpPercent}%` }} />
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--gold)', marginTop: 4, fontFamily: 'var(--font-heading)' }}>
                        ❤️ {vp.current_health} / {vpMaxHp}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="char-profile-view__stats">
                      <div className="char-profile-view__stat">
                        <div className="char-profile-view__stat-icon">⚔️</div>
                        <div className="char-profile-view__stat-label">Saldırı</div>
                        <div className="char-profile-view__stat-val">
                          {(vp.characters?.attack || 0)}
                          {(vp.attack_bonus || 0) !== 0 && <span style={{ color: (vp.attack_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 11 }}> {(vp.attack_bonus || 0) > 0 ? '+' : ''}{vp.attack_bonus || 0}</span>}
                          {vp.user_id !== currentRoom.dm_id && (vp.xp || 0) > 0 && <span style={{ color: '#FFD700', fontSize: 11 }}> +{(vp.xp || 0) * xpRate}xp</span>}
                        </div>
                        <div className="char-profile-view__stat-total">= {(vp.characters?.attack || 0) + (vp.attack_bonus || 0) + (vp.user_id !== currentRoom.dm_id ? (vp.xp || 0) * xpRate : 0)}</div>
                      </div>
                      <div className="char-profile-view__stat">
                        <div className="char-profile-view__stat-icon">🛡️</div>
                        <div className="char-profile-view__stat-label">Savunma</div>
                        <div className="char-profile-view__stat-val">
                          {(vp.characters?.defense || 0)}
                          {(vp.defense_bonus || 0) !== 0 && <span style={{ color: (vp.defense_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 11 }}> {(vp.defense_bonus || 0) > 0 ? '+' : ''}{vp.defense_bonus || 0}</span>}
                          {vp.user_id !== currentRoom.dm_id && (vp.xp || 0) > 0 && <span style={{ color: '#FFD700', fontSize: 11 }}> +{(vp.xp || 0) * xpRate}xp</span>}
                        </div>
                        <div className="char-profile-view__stat-total">= {(vp.characters?.defense || 0) + (vp.defense_bonus || 0) + (vp.user_id !== currentRoom.dm_id ? (vp.xp || 0) * xpRate : 0)}</div>
                      </div>
                      <div className="char-profile-view__stat">
                        <div className="char-profile-view__stat-icon">🏃</div>
                        <div className="char-profile-view__stat-label">Çeviklik</div>
                        <div className="char-profile-view__stat-val">
                          {(vp.characters?.agility || 0)}
                          {(vp.agility_bonus || 0) !== 0 && <span style={{ color: (vp.agility_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 11 }}> {(vp.agility_bonus || 0) > 0 ? '+' : ''}{vp.agility_bonus || 0}</span>}
                        </div>
                        <div className="char-profile-view__stat-total">= {(vp.characters?.agility || 0) + (vp.agility_bonus || 0)}</div>
                      </div>
                      <div className="char-profile-view__stat">
                        <div className="char-profile-view__stat-icon">🧠</div>
                        <div className="char-profile-view__stat-label">Zeka</div>
                        <div className="char-profile-view__stat-val">
                          {(vp.characters?.intelligence || 0)}
                          {(vp.intelligence_bonus || 0) !== 0 && <span style={{ color: (vp.intelligence_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 11 }}> {(vp.intelligence_bonus || 0) > 0 ? '+' : ''}{vp.intelligence_bonus || 0}</span>}
                        </div>
                        <div className="char-profile-view__stat-total">= {(vp.characters?.intelligence || 0) + (vp.intelligence_bonus || 0)}</div>
                      </div>
                      <div className="char-profile-view__stat">
                        <div className="char-profile-view__stat-icon">✨</div>
                        <div className="char-profile-view__stat-label">Karizma</div>
                        <div className="char-profile-view__stat-val">
                          {(vp.characters?.charisma || 0)}
                          {(vp.charisma_bonus || 0) !== 0 && <span style={{ color: (vp.charisma_bonus || 0) > 0 ? '#4CAF50' : '#f44336', fontSize: 11 }}> {(vp.charisma_bonus || 0) > 0 ? '+' : ''}{vp.charisma_bonus || 0}</span>}
                        </div>
                        <div className="char-profile-view__stat-total">= {(vp.characters?.charisma || 0) + (vp.charisma_bonus || 0)}</div>
                      </div>
                    </div>

                    {/* Status Effects */}
                    {(vp.poison_turns > 0 || vp.stun_turns > 0) && (
                      <div className="char-profile-view__effects">
                        {vp.poison_turns > 0 && (
                          <div className="char-profile-view__effect char-profile-view__effect--poison">
                            🧪 Zehir: {vp.poison_turns} tur ({vp.poison_value} hasar/tur)
                          </div>
                        )}
                        {vp.stun_turns > 0 && (
                          <div className="char-profile-view__effect char-profile-view__effect--stun">
                            💫 Sersemletme: {vp.stun_turns} tur
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })() : (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 12, flexShrink: 0 }}>💬 Sohbet</h3>
              <div className="vulpax-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <ChatBox roomId={roomId} />
              </div>
            </>
          )}
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
                        ❤️{m.current_health} ⚔{(m.characters?.attack || 0) + (m.attack_bonus || 0) + (m.user_id !== currentRoom.dm_id ? (m.xp || 0) * xpRate : 0)} 🛡{(m.characters?.defense || 0) + (m.defense_bonus || 0) + (m.user_id !== currentRoom.dm_id ? (m.xp || 0) * xpRate : 0)}
                        {m.user_id !== currentRoom.dm_id && (m.xp || 0) > 0 ? ` ⭐${m.xp}` : ''}
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
          {/* DM Story Cards FAB */}
          <button
            className="dm-fab dm-fab--story"
            onClick={() => setShowStoryCards(!showStoryCards)}
            title="Kopya Kartları"
          >
            📖
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

          {/* DM Story Cards Panel */}
          {showStoryCards && (
            <div className="dm-story-panel">
              <div className="dm-story-panel__header">
                <h3>📖 Kopya Kartları</h3>
                <button className="dm-notes-popup__close" onClick={() => setShowStoryCards(false)}>✕</button>
              </div>
              <div className="dm-story-panel__categories">
                {[
                  { key: 'yol', icon: '🛤️', label: 'Yol' },
                  { key: 'zindan', icon: '🏰', label: 'Zindan' },
                  { key: 'arkadaslik', icon: '🤝', label: 'Arkadaşlık' },
                  { key: 'festival', icon: '🎪', label: 'Festival' },
                  { key: 'savas', icon: '⚔️', label: 'Savaş' },
                  { key: 'gizem', icon: '🔮', label: 'Gizem' },
                  { key: 'tuzak', icon: '🪤', label: 'Tuzak' },
                  { key: 'ticaret', icon: '💰', label: 'Ticaret' },
                  { key: 'ceviklik', icon: '🏃', label: 'Çeviklik' },
                ].map(cat => (
                  <button
                    key={cat.key}
                    className={`dm-story-cat-btn ${storyCardCategory === cat.key ? 'dm-story-cat-btn--active' : ''}`}
                    onClick={() => { setStoryCardCategory(cat.key); setStoryCardExpanded(null); }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <div className="dm-story-panel__list vulpax-scroll">
                {storyCards
                  .filter(c => c.category === storyCardCategory)
                  .map(card => (
                    <div
                      key={card.id}
                      className={`dm-story-card ${storyCardExpanded === card.id ? 'dm-story-card--expanded' : ''}`}
                      onClick={() => setStoryCardExpanded(storyCardExpanded === card.id ? null : card.id)}
                    >
                      <div className="dm-story-card__header">
                        <span className="dm-story-card__title">{card.title}</span>
                        <span className={`dm-story-card__diff dm-story-card__diff--${card.difficulty}`}>
                          {card.difficulty}
                        </span>
                      </div>
                      {card.subcategory && (
                        <span className="dm-story-card__sub">{card.subcategory}</span>
                      )}
                      {storyCardExpanded === card.id && (
                        <div className="dm-story-card__body">
                          <p>{card.content}</p>
                          {card.skill_check && (
                            <div className="dm-story-card__check">🎲 {card.skill_check}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Monster Book FAB — visible to everyone */}
      <button
        className="monster-book-fab"
        onClick={() => setShowMonsterBook(true)}
        title="Canavarlar Kitabı"
      >
        <span>▲</span>
        <span>📕 Canavarlar Kitabı</span>
        <span>▲</span>
      </button>
      {showMonsterBook && <MonsterBook onClose={() => setShowMonsterBook(false)} />}

      {/* Character Detail — DM only: cockpit from bottom */}

      {/* DM Cockpit — slides up from bottom */}
      {viewingCharacter && isDM && (() => {
        const vc = members.find(m => m.id === viewingCharacter.id) || viewingCharacter;
        return (
        <div className="dm-cockpit">
          <div className="dm-cockpit__header">
            <div className="dm-cockpit__title">
              🎮 DM Kokpiti — {vc.characters?.name || vc.profiles?.username || '?'}
            </div>
            <button className="dm-cockpit__close" onClick={() => setViewingCharacter(null)}>✕</button>
          </div>
          <div className="dm-cockpit__body">
            {/* Portrait */}
            <div className="dm-cockpit__portrait">
              {getCardImage(vc.characters || vc)
                ? <img src={getCardImage(vc.characters || vc)} alt="" className="dm-cockpit__portrait-img" />
                : <div className="dm-cockpit__portrait-placeholder">⚔️</div>
              }
              <div className="dm-cockpit__portrait-name">{vc.profiles?.username}</div>
              <span className={`badge badge--${vc.status}`} style={{ fontSize: 10, marginTop: 4 }}>{vc.status}</span>
            </div>

            {/* Stats Grid */}
            <div className="dm-cockpit__stats">
              {/* HP */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">❤️ CAN</div>
                <div className="dm-cockpit__stat-value">{vc.current_health} / {vc.characters?.health || '?'}</div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = Math.max(0, vc.current_health - 10); await updateMemberHealth(vc.id, v); playSfx('sword'); await sendAction(`⚔ ${vc.profiles?.username} → 10 hasar aldı! (${v} HP kaldı)`); }}>-10</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = Math.max(0, vc.current_health - 1); await updateMemberHealth(vc.id, v); playSfx('sword'); await sendAction(`⚔ ${vc.profiles?.username} → 1 hasar aldı! (${v} HP kaldı)`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="HP" min="0" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val)) { const v = Math.max(0, Math.min(vc.characters?.health || 999, val)); updateMemberHealth(vc.id, v); sendAction(`❤️ ${vc.profiles?.username} HP → ${v} olarak ayarlandı`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = Math.min(vc.characters?.health || 999, vc.current_health + 1); await updateMemberHealth(vc.id, v); playSfx('alive'); await sendAction(`💚 ${vc.profiles?.username} → 1 HP iyileşti! (${v} HP)`); }}>+1</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = Math.min(vc.characters?.health || 999, vc.current_health + 10); await updateMemberHealth(vc.id, v); playSfx('alive'); await sendAction(`💚 ${vc.profiles?.username} → 10 HP iyileşti! (${v} HP)`); }}>+10</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--max" onClick={async () => { const v = vc.characters?.health || 100; await updateMemberHealth(vc.id, v); playSfx('alive'); await sendAction(`💚 ${vc.profiles?.username} full HP! (${v})`); }}>MAX</button>
                </div>
              </div>

              {/* Attack Bonus */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">⚔️ SALDIRI BONUS</div>
                <div className="dm-cockpit__stat-value">
                  {(vc.characters?.attack || 0)} <span style={{ color: (vc.attack_bonus || 0) >= 0 ? '#4CAF50' : '#f44336' }}>{(vc.attack_bonus || 0) >= 0 ? '+' : ''}{vc.attack_bonus || 0}</span>{vc.user_id !== currentRoom.dm_id && (vc.xp || 0) > 0 && <span style={{ color: '#FFD700' }}> +{(vc.xp || 0) * xpRate}xp</span>} = {(vc.characters?.attack || 0) + (vc.attack_bonus || 0) + (vc.user_id !== currentRoom.dm_id ? (vc.xp || 0) * xpRate : 0)}
                </div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.attack_bonus || 0) - 5; await updateMemberAttackBonus(vc.id, v); await sendAction(`⚔️ ${vc.profiles?.username} saldırı bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-5</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.attack_bonus || 0) - 1; await updateMemberAttackBonus(vc.id, v); await sendAction(`⚔️ ${vc.profiles?.username} saldırı bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="Bonus" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val)) { updateMemberAttackBonus(vc.id, val); sendAction(`⚔️ ${vc.profiles?.username} saldırı bonusu: ${val >= 0 ? '+' : ''}${val}`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.attack_bonus || 0) + 1; await updateMemberAttackBonus(vc.id, v); await sendAction(`⚔️ ${vc.profiles?.username} saldırı bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+1</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.attack_bonus || 0) + 5; await updateMemberAttackBonus(vc.id, v); await sendAction(`⚔️ ${vc.profiles?.username} saldırı bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+5</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberAttackBonus(vc.id, 0); await sendAction(`⚔️ ${vc.profiles?.username} saldırı bonusu sıfırlandı`); }}>Sıfırla</button>
                </div>
              </div>

              {/* Defense Bonus */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">🛡️ SAVUNMA BONUS</div>
                <div className="dm-cockpit__stat-value">
                  {(vc.characters?.defense || 0)} <span style={{ color: (vc.defense_bonus || 0) >= 0 ? '#4CAF50' : '#f44336' }}>{(vc.defense_bonus || 0) >= 0 ? '+' : ''}{vc.defense_bonus || 0}</span>{vc.user_id !== currentRoom.dm_id && (vc.xp || 0) > 0 && <span style={{ color: '#FFD700' }}> +{(vc.xp || 0) * xpRate}xp</span>} = {(vc.characters?.defense || 0) + (vc.defense_bonus || 0) + (vc.user_id !== currentRoom.dm_id ? (vc.xp || 0) * xpRate : 0)}
                </div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.defense_bonus || 0) - 5; await updateMemberDefenseBonus(vc.id, v); await sendAction(`🛡️ ${vc.profiles?.username} savunma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-5</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.defense_bonus || 0) - 1; await updateMemberDefenseBonus(vc.id, v); await sendAction(`🛡️ ${vc.profiles?.username} savunma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="Bonus" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val)) { updateMemberDefenseBonus(vc.id, val); sendAction(`🛡️ ${vc.profiles?.username} savunma bonusu: ${val >= 0 ? '+' : ''}${val}`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.defense_bonus || 0) + 1; await updateMemberDefenseBonus(vc.id, v); await sendAction(`🛡️ ${vc.profiles?.username} savunma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+1</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.defense_bonus || 0) + 5; await updateMemberDefenseBonus(vc.id, v); await sendAction(`🛡️ ${vc.profiles?.username} savunma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+5</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberDefenseBonus(vc.id, 0); await sendAction(`🛡️ ${vc.profiles?.username} savunma bonusu sıfırlandı`); }}>Sıfırla</button>
                </div>
              </div>

              {/* Agility Bonus */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">🏃 ÇEVİKLİK BONUS</div>
                <div className="dm-cockpit__stat-value">
                  {(vc.characters?.agility || 0)} <span style={{ color: (vc.agility_bonus || 0) >= 0 ? '#4CAF50' : '#f44336' }}>{(vc.agility_bonus || 0) >= 0 ? '+' : ''}{vc.agility_bonus || 0}</span> = {(vc.characters?.agility || 0) + (vc.agility_bonus || 0)}
                </div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.agility_bonus || 0) - 5; await updateMemberAgilityBonus(vc.id, v); await sendAction(`🏃 ${vc.profiles?.username} çeviklik bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-5</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.agility_bonus || 0) - 1; await updateMemberAgilityBonus(vc.id, v); await sendAction(`🏃 ${vc.profiles?.username} çeviklik bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="Bonus" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val)) { updateMemberAgilityBonus(vc.id, val); sendAction(`🏃 ${vc.profiles?.username} çeviklik bonusu: ${val >= 0 ? '+' : ''}${val}`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.agility_bonus || 0) + 1; await updateMemberAgilityBonus(vc.id, v); await sendAction(`🏃 ${vc.profiles?.username} çeviklik bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+1</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.agility_bonus || 0) + 5; await updateMemberAgilityBonus(vc.id, v); await sendAction(`🏃 ${vc.profiles?.username} çeviklik bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+5</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberAgilityBonus(vc.id, 0); await sendAction(`🏃 ${vc.profiles?.username} çeviklik bonusu sıfırlandı`); }}>Sıfırla</button>
                </div>
              </div>

              {/* Intelligence Bonus */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">🧠 ZEKA BONUS</div>
                <div className="dm-cockpit__stat-value">
                  {(vc.characters?.intelligence || 0)} <span style={{ color: (vc.intelligence_bonus || 0) >= 0 ? '#4CAF50' : '#f44336' }}>{(vc.intelligence_bonus || 0) >= 0 ? '+' : ''}{vc.intelligence_bonus || 0}</span> = {(vc.characters?.intelligence || 0) + (vc.intelligence_bonus || 0)}
                </div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.intelligence_bonus || 0) - 5; await updateMemberIntelligenceBonus(vc.id, v); await sendAction(`🧠 ${vc.profiles?.username} zeka bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-5</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.intelligence_bonus || 0) - 1; await updateMemberIntelligenceBonus(vc.id, v); await sendAction(`🧠 ${vc.profiles?.username} zeka bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="Bonus" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val)) { updateMemberIntelligenceBonus(vc.id, val); sendAction(`🧠 ${vc.profiles?.username} zeka bonusu: ${val >= 0 ? '+' : ''}${val}`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.intelligence_bonus || 0) + 1; await updateMemberIntelligenceBonus(vc.id, v); await sendAction(`🧠 ${vc.profiles?.username} zeka bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+1</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.intelligence_bonus || 0) + 5; await updateMemberIntelligenceBonus(vc.id, v); await sendAction(`🧠 ${vc.profiles?.username} zeka bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+5</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberIntelligenceBonus(vc.id, 0); await sendAction(`🧠 ${vc.profiles?.username} zeka bonusu sıfırlandı`); }}>Sıfırla</button>
                </div>
              </div>

              {/* Charisma Bonus */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">✨ KARİZMA BONUS</div>
                <div className="dm-cockpit__stat-value">
                  {(vc.characters?.charisma || 0)} <span style={{ color: (vc.charisma_bonus || 0) >= 0 ? '#4CAF50' : '#f44336' }}>{(vc.charisma_bonus || 0) >= 0 ? '+' : ''}{vc.charisma_bonus || 0}</span> = {(vc.characters?.charisma || 0) + (vc.charisma_bonus || 0)}
                </div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.charisma_bonus || 0) - 5; await updateMemberCharismaBonus(vc.id, v); await sendAction(`✨ ${vc.profiles?.username} karizma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-5</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = (vc.charisma_bonus || 0) - 1; await updateMemberCharismaBonus(vc.id, v); await sendAction(`✨ ${vc.profiles?.username} karizma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="Bonus" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val)) { updateMemberCharismaBonus(vc.id, val); sendAction(`✨ ${vc.profiles?.username} karizma bonusu: ${val >= 0 ? '+' : ''}${val}`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.charisma_bonus || 0) + 1; await updateMemberCharismaBonus(vc.id, v); await sendAction(`✨ ${vc.profiles?.username} karizma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+1</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.charisma_bonus || 0) + 5; await updateMemberCharismaBonus(vc.id, v); await sendAction(`✨ ${vc.profiles?.username} karizma bonusu: ${v >= 0 ? '+' : ''}${v}`); }}>+5</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberCharismaBonus(vc.id, 0); await sendAction(`✨ ${vc.profiles?.username} karizma bonusu sıfırlandı`); }}>Sıfırla</button>
                </div>
              </div>

              {/* Status */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">📋 DURUM</div>
                <div className="dm-cockpit__stat-value"><span className={`badge badge--${vc.status}`}>{vc.status}</span></div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { await updateMemberStatus(vc.id, 'alive'); playSfx('alive'); await sendAction(`✅ ${vc.profiles?.username} artık canlı!`); }}>Canlı</button>
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { await updateMemberHealth(vc.id, 0); await updateMemberStatus(vc.id, 'dead'); playSfx('die'); await sendAction(`💀 ${vc.profiles?.username} öldü!`); if (vc.user_id !== currentRoom.dm_id) { await updateMemberXp(vc.id, Math.max(0, (vc.xp || 0) - 2)); await sendAction(`⭐ ${vc.profiles?.username} öldüğü için 2 XP kaybetti!`); } }}>Öldür</button>
                  <button className="dm-cockpit__btn" onClick={async () => { const maxHp = vc.characters?.health || 100; const v = Math.floor(maxHp / 2); await updateMemberHealth(vc.id, v); await updateMemberStatus(vc.id, 'alive'); playSfx('alive'); await sendAction(`✨ ${vc.profiles?.username} hayata döndü! (${v} HP)`); }}>Dirilt</button>
                  <button className="dm-cockpit__btn" style={{ background: '#9C27B0' }} onClick={async () => { await updateMemberStatus(vc.id, 'buffed'); await sendAction(`⬆️ ${vc.profiles?.username} buff aldı!`); }}>Buff</button>
                </div>
              </div>

              {/* Poison */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">🧪 ZEHİR</div>
                <div className="dm-cockpit__stat-value">{vc.poison_turns > 0 ? `${vc.poison_turns} tur (${vc.poison_value}/tur)` : 'Yok'}</div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberPoison(vc.id, 3, 5); await updateMemberStatus(vc.id, 'poisoned'); playSfx('potion'); await sendAction(`🧪 ${vc.profiles?.username} zehirlendi! (3 tur, 5 hasar/tur)`); }}>3T/5D</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberPoison(vc.id, 5, 10); await updateMemberStatus(vc.id, 'poisoned'); playSfx('potion'); await sendAction(`🧪 ${vc.profiles?.username} zehirlendi! (5 tur, 10 hasar/tur)`); }}>5T/10D</button>
                  <input type="number" className="dm-cockpit__input dm-cockpit__input--small" placeholder="Tur" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val) && val > 0) { const dmgInput = e.target.nextElementSibling; const dmg = parseInt(dmgInput?.value) || 5; updateMemberPoison(vc.id, val, dmg); updateMemberStatus(vc.id, 'poisoned'); playSfx('potion'); sendAction(`🧪 ${vc.profiles?.username} zehirlendi! (${val} tur, ${dmg} hasar/tur)`); e.target.value = ''; if (dmgInput) dmgInput.value = ''; } }}} />
                  <input type="number" className="dm-cockpit__input dm-cockpit__input--small" placeholder="Dmg" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); const turInput = e.target.previousElementSibling; const tur = parseInt(turInput?.value) || 3; if (!isNaN(val) && val > 0) { updateMemberPoison(vc.id, tur, val); updateMemberStatus(vc.id, 'poisoned'); playSfx('potion'); sendAction(`🧪 ${vc.profiles?.username} zehirlendi! (${tur} tur, ${val} hasar/tur)`); e.target.value = ''; if (turInput) turInput.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { await updateMemberPoison(vc.id, 0, 0); if (vc.stun_turns <= 0) await updateMemberStatus(vc.id, 'alive'); await sendAction(`🧪 ${vc.profiles?.username} zehir temizlendi!`); }}>Temizle</button>
                </div>
              </div>

              {/* Stun */}
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">💫 SERSEMLETME</div>
                <div className="dm-cockpit__stat-value">{vc.stun_turns > 0 ? `${vc.stun_turns} tur` : 'Yok'}</div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberStun(vc.id, 1); await updateMemberStatus(vc.id, 'stunned'); playSfx('stun'); await sendAction(`💫 ${vc.profiles?.username} sersemledi! (1 tur)`); }}>1 Tur</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberStun(vc.id, 3); await updateMemberStatus(vc.id, 'stunned'); playSfx('stun'); await sendAction(`💫 ${vc.profiles?.username} sersemledi! (3 tur)`); }}>3 Tur</button>
                  <input type="number" className="dm-cockpit__input dm-cockpit__input--small" placeholder="Tur" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val) && val > 0) { updateMemberStun(vc.id, val); updateMemberStatus(vc.id, 'stunned'); playSfx('stun'); sendAction(`💫 ${vc.profiles?.username} sersemledi! (${val} tur)`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { await updateMemberStun(vc.id, 0); if (vc.poison_turns <= 0) await updateMemberStatus(vc.id, 'alive'); await sendAction(`💫 ${vc.profiles?.username} sersemletme temizlendi!`); }}>Temizle</button>
                </div>
              </div>

              {/* XP — per character */}
              {vc.user_id !== currentRoom.dm_id && (
              <div className="dm-cockpit__stat">
                <div className="dm-cockpit__stat-label">⭐ XP</div>
                <div className="dm-cockpit__stat-value">{vc.xp || 0} XP <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>(+{(vc.xp || 0) * xpRate} Atk/Def)</span></div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn dm-cockpit__btn--minus" onClick={async () => { const v = Math.max(0, (vc.xp || 0) - 1); await updateMemberXp(vc.id, v); await sendAction(`⭐ ${vc.profiles?.username} XP: ${v} (-1)`); }}>-1</button>
                  <input type="number" className="dm-cockpit__input" placeholder="XP" min="0" onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 0) { updateMemberXp(vc.id, val); sendAction(`⭐ ${vc.profiles?.username} XP → ${val} olarak ayarlandı`); e.target.value = ''; } }}} />
                  <button className="dm-cockpit__btn dm-cockpit__btn--plus" onClick={async () => { const v = (vc.xp || 0) + 1; await updateMemberXp(vc.id, v); await sendAction(`⭐ ${vc.profiles?.username} → 1 XP kazandı! (Toplam: ${v})`); }}>+1</button>
                  <button className="dm-cockpit__btn" onClick={async () => { await updateMemberXp(vc.id, 0); await sendAction(`⭐ ${vc.profiles?.username} XP sıfırlandı`); }}>Sıfırla</button>
                </div>
              </div>
              )}

              {/* Card Reset + XP Distribution */}
              <div className="dm-cockpit__stat" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: 8 }}>
                <div className="dm-cockpit__stat-label">🎮 GENEL KONTROL</div>
                <div className="dm-cockpit__stat-controls">
                  <button className="dm-cockpit__btn" style={{ background: '#5C6BC0' }} onClick={handleResetCards}>🃏 Kartları Dağıt</button>
                  <button className="dm-cockpit__btn" style={{ background: '#F9A825', color: '#000' }} onClick={handleGiveXpAll}>⭐ Herkese 1 XP</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      })()}

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

      {/* Death Overlay */}
      {deathOverlay && (
        <div className="death-alive-overlay death-alive-overlay--death" onClick={() => setDeathOverlay(null)}>
          <div className="death-alive-overlay__content">
            <img src="./assest/die.png" alt="Öldü" className="death-alive-overlay__image" />
            <div className="death-alive-overlay__text death-alive-overlay__text--death">
              {deathOverlay.name} öldü...
            </div>
          </div>
        </div>
      )}

      {/* Alive/Revival Overlay */}
      {aliveOverlay && (
        <div className="death-alive-overlay death-alive-overlay--alive" onClick={() => setAliveOverlay(null)}>
          <div className="death-alive-overlay__content">
            <img src="./assest/alive.png" alt="Hayata Döndü" className="death-alive-overlay__image" />
            <div className="death-alive-overlay__text death-alive-overlay__text--alive">
              {aliveOverlay.name} hayata döndü!
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
    case 'temel_saldiri': return '⚔';
    case 'dinlenme': return '💤';
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
    case 'temel_saldiri': return 'Normal Saldırı';
    case 'dinlenme': return 'Dinlen (+5 HP)';
    // legacy
    case 'damage': return 'Hasar';
    case 'heal': return 'İyileştirme';
    case 'buff': return 'Buff';
    case 'debuff': return 'Debuff';
    default: return type;
  }
}
