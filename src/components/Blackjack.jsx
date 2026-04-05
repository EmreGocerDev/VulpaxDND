import React, { useEffect, useRef, useState } from 'react';
import { useBlackjackStore } from '../stores/blackjackStore';
import { supabase } from '../lib/supabase';
import '../styles/blackjack.css';

const CARD_BACK = './assest/cards/Back-R.png';

function CardImg({ card, hidden, small, className = '', dealIndex = 0 }) {
  const src = hidden ? CARD_BACK : `./assest/cards/${card.id}.png`;
  return (
    <img
      src={src}
      alt={hidden ? 'Kapalı Kart' : card.id}
      className={`bj-card ${small ? 'bj-card--small' : ''} ${className}`}
      style={{ '--deal-i': dealIndex }}
      draggable={false}
    />
  );
}

export default function Blackjack({ roomId, profile, members, currentRoom, isDM, updateMemberXp }) {
  const store = useBlackjackStore();
  const {
    active, phase, deck, dealerHand, dealerRevealed, players, turnOrder,
    currentPlayerIndex, dmId, calcHandValue, getResults,
    startGame, dealInitialCards, hit, stand, dealerPlay, endGame, syncState, getSerializableState,
  } = store;

  const bjChannelRef = useRef(null);
  const [resultsData, setResultsData] = useState(null);
  const [xpApplied, setXpApplied] = useState(false);
  const dealSfxRef = useRef(new Audio('./assest/card.mp3'));

  const playSfx = () => {
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    const audio = dealSfxRef.current;
    audio.volume = (s.gameSfxVolume ?? 50) / 100;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  // Setup broadcast channel for blackjack sync
  useEffect(() => {
    // Setup our own broadcast channel for blackjack sync
    const bjChannel = supabase.channel(`blackjack-${roomId}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'bj_sync' }, ({ payload }) => {
        if (payload.state) {
          syncState(payload.state);
        }
      })
      .on('broadcast', { event: 'bj_action' }, ({ payload }) => {
        if (payload.action === 'start') {
          // DM started the game — everyone receives the state
          syncState(payload.state);
          playSfx();
        }
        if (payload.action === 'deal') {
          syncState(payload.state);
          playSfx();
        }
        if (payload.action === 'hit') {
          syncState(payload.state);
          playSfx();
        }
        if (payload.action === 'stand') {
          syncState(payload.state);
          playSfx();
        }
        if (payload.action === 'dealer_play') {
          syncState(payload.state);
          playSfx();
        }
        if (payload.action === 'end') {
          endGame();
        }
      })
      .subscribe();

    bjChannelRef.current = bjChannel;
    return () => {
      supabase.removeChannel(bjChannel);
      bjChannelRef.current = null;
    };
  }, [roomId]);

  // Broadcast state to all clients
  const broadcastAction = (action, state) => {
    bjChannelRef.current?.send({
      type: 'broadcast',
      event: 'bj_action',
      payload: { action, state },
    });
  };

  // When DM activates blackjack locally (via FAB), broadcast to all
  useEffect(() => {
    if (active && phase === 'dealing' && isDM && bjChannelRef.current) {
      broadcastAction('start', getSerializableState());
    }
  }, [active, phase, isDM]);

  // DM: Deal cards
  const handleDeal = () => {
    dealInitialCards();
    setTimeout(() => {
      broadcastAction('deal', getSerializableState());
    }, 50);
  };

  // Player: Hit
  const handleHit = (memberId) => {
    hit(memberId);
    setTimeout(() => {
      broadcastAction('hit', getSerializableState());
    }, 50);
  };

  // Player: Stand
  const handleStand = (memberId) => {
    stand(memberId);
    setTimeout(() => {
      broadcastAction('stand', getSerializableState());
    }, 50);
  };

  // DM: Dealer plays
  const handleDealerPlay = () => {
    dealerPlay();
    setTimeout(() => {
      broadcastAction('dealer_play', getSerializableState());
    }, 50);
  };

  // DM: End game
  const handleEndGame = async () => {
    // Apply XP changes if in results phase and not yet applied
    if (phase === 'results' && !xpApplied) {
      await applyXpResults();
    }
    broadcastAction('end', null);
    endGame();
    setResultsData(null);
    setXpApplied(false);
  };

  // DM: New round (reshuffle & deal again)
  const handleNewRound = async () => {
    // Apply XP first if needed
    if (phase === 'results' && !xpApplied) {
      await applyXpResults();
    }
    setResultsData(null);
    setXpApplied(false);

    startGame(members, currentRoom.dm_id);
    setTimeout(() => {
      broadcastAction('start', getSerializableState());
      // Auto-deal after short delay
      setTimeout(() => {
        dealInitialCards();
        setTimeout(() => {
          broadcastAction('deal', getSerializableState());
        }, 50);
      }, 300);
    }, 50);
  };

  // Calculate results when phase changes to results
  useEffect(() => {
    if (phase === 'results') {
      const data = getResults();
      setResultsData(data);
    }
  }, [phase]);

  // Apply XP results
  const applyXpResults = async () => {
    if (xpApplied || !resultsData) return;
    setXpApplied(true);

    for (const [memberId, result] of Object.entries(resultsData.results)) {
      if (result.xpChange !== 0) {
        const member = members.find(m => m.id === memberId);
        if (member) {
          const newXp = Math.max(0, (member.xp || 0) + result.xpChange);
          await updateMemberXp(memberId, newXp);
        }
      }
    }
  };

  // Auto-advance: if phase is dealing and DM, auto-deal after animation
  useEffect(() => {
    if (phase === 'dealing' && isDM) {
      const timer = setTimeout(() => {
        handleDeal();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, isDM]);

  // Auto-play dealer when phase switches to dealer_turn and user is DM
  useEffect(() => {
    if (phase === 'dealer_turn' && isDM) {
      const timer = setTimeout(() => {
        handleDealerPlay();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, isDM]);

  if (!active) return null;

  const myMember = members.find(m => m.user_id === profile.id);
  const myMemberId = myMember?.id;
  const myPlayer = myMemberId ? players[myMemberId] : null;
  const currentTurnMemberId = turnOrder[currentPlayerIndex];
  const isMyBlackjackTurn = currentTurnMemberId === myMemberId && phase === 'playing';
  const dealerValue = dealerRevealed ? calcHandValue(dealerHand) : null;
  const deckRemaining = deck?.length || 0;

  return (
    <div className="bj-overlay">
      <div className="bj-container">
        {/* Header */}
        <div className="bj-header bj-panel">
          <div className="bj-header__title">
            <span className="bj-header__icon">🃏</span>
            <h2>Blackjack</h2>
            <span className="bj-header__subtitle">Bahis: 1 XP</span>
          </div>
          <div className="bj-header__info">
            {phase === 'playing' && (
              <span className="bj-header__turn">
                Sıra: <strong>{players[currentTurnMemberId]?.username || '...'}</strong>
              </span>
            )}
            {phase === 'dealer_turn' && <span className="bj-header__turn">Kasa oynuyor...</span>}
            {phase === 'results' && <span className="bj-header__turn bj-header__turn--results">Sonuçlar</span>}
          </div>
          {isDM && (
            <div className="bj-header__controls">
              {phase === 'results' && (
                <button className="btn btn-gold btn-sm" onClick={handleNewRound}>🔄 Yeni El</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={handleEndGame}>✖ Bitir</button>
            </div>
          )}
        </div>

        {/* Dealer Area */}
        <div className="bj-dealer bj-panel">
          <div className="bj-dealer__left">
            <div className="bj-dealer__label">
              <span>🏰 Kasa (DM)</span>
              {dealerRevealed && <span className="bj-hand-value">{dealerValue}</span>}
              {!dealerRevealed && dealerHand.length > 0 && (
                <span className="bj-hand-value">{calcHandValue([dealerHand[0]])}</span>
              )}
            </div>
            <div className="bj-dealer__cards">
              {dealerHand.map((card, i) => (
                <CardImg
                  key={card.id + '-' + i}
                  card={card}
                  hidden={i === 1 && !dealerRevealed}
                  dealIndex={i}
                  className={phase === 'results' ? 'bj-card--reveal' : ''}
                />
              ))}
            </div>
          </div>

          {/* Deck Stack */}
          <div className="bj-deck">
            <div className="bj-deck__stack">
              {deckRemaining > 2 && <img src={CARD_BACK} alt="" className="bj-deck__card" style={{ top: -4, left: 4 }} draggable={false} />}
              {deckRemaining > 1 && <img src={CARD_BACK} alt="" className="bj-deck__card" style={{ top: -2, left: 2 }} draggable={false} />}
              {deckRemaining > 0 && <img src={CARD_BACK} alt="" className="bj-deck__card" style={{ top: 0, left: 0 }} draggable={false} />}
            </div>
            <div className="bj-deck__count">
              <strong>{deckRemaining}</strong> kart
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="bj-divider">
          <div className="bj-divider__line" />
          <span className="bj-divider__text">VS</span>
          <div className="bj-divider__line" />
        </div>

        {/* Players Area */}
        <div className="bj-players">
          {Object.values(players).map((player) => {
            const handValue = calcHandValue(player.hand);
            const isCurrentTurn = currentTurnMemberId === player.memberId && phase === 'playing';
            const isMe = player.userId === profile.id;
            const result = resultsData?.results?.[player.memberId];
            const liveMember = members.find(m => m.id === player.memberId);
            const liveXp = liveMember?.xp ?? player.xp;

            return (
              <div
                key={player.memberId}
                className={`bj-player ${isCurrentTurn ? 'bj-player--active' : ''} ${isMe ? 'bj-player--me' : ''} ${player.status === 'passive' ? 'bj-player--passive' : ''}`}
              >
                <div className="bj-player__header">
                  <span className="bj-player__name">
                    {isMe ? '⭐ ' : ''}{player.username}
                  </span>
                  <span className="bj-player__xp">
                    ⭐ <strong>{liveXp}</strong> XP
                  </span>
                  {player.status === 'passive' && (
                    <span className="bj-player__xp" style={{ color: 'var(--text-dim)' }}>İzleyici</span>
                  )}
                  <div className="bj-player__badges">
                    {player.status === 'bust' && <span className="bj-badge bj-badge--bust">BUST</span>}
                    {player.status === 'blackjack' && <span className="bj-badge bj-badge--blackjack">BLACKJACK!</span>}
                    {player.status === 'stand' && phase === 'playing' && <span className="bj-badge bj-badge--stand">STAND</span>}
                    {result && (
                      <span className={`bj-badge bj-badge--${result.result}`}>
                        {result.result === 'win' && '🏆 Kazandı! +1 XP'}
                        {result.result === 'blackjack' && '🃏 Blackjack! +2 XP'}
                        {result.result === 'lose' && '💀 Kaybetti! -1 XP'}
                        {result.result === 'bust' && '💥 Battı! -1 XP'}
                        {result.result === 'push' && '🤝 Berabere'}
                      </span>
                    )}
                  </div>
                  {player.hand.length > 0 && player.status !== 'passive' && (
                    <span className="bj-hand-value">{handValue}</span>
                  )}
                </div>

                <div className="bj-cards-row">
                  {player.status === 'passive' ? (
                    <div className="bj-passive-text">0 XP — İzleyici olarak katılıyor</div>
                  ) : (
                    player.hand.map((card, i) => (
                      <CardImg
                        key={card.id + '-' + i}
                        card={card}
                        hidden={false}
                        small
                        dealIndex={i}
                        className={i === player.hand.length - 1 && player.hand.length > 2 ? 'bj-card--hit' : ''}
                      />
                    ))
                  )}
                </div>

                {/* Player actions */}
                {isMe && isMyBlackjackTurn && player.status === 'playing' && (
                  <div className="bj-player__actions">
                    <button className="btn btn-gold" onClick={() => handleHit(myMemberId)}>
                      🎴 Kart Çek
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleStand(myMemberId)}>
                      ✋ Dur
                    </button>
                  </div>
                )}

                {/* DM can play for any player (in case someone is AFK) */}
                {isDM && !isMe && phase === 'playing' && currentTurnMemberId === player.memberId && player.status === 'playing' && (
                  <div className="bj-player__actions bj-player__actions--dm">
                    <span className="bj-dm-label">DM Kontrolü:</span>
                    <button className="btn btn-gold btn-sm" onClick={() => handleHit(player.memberId)}>
                      🎴 Çek
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleStand(player.memberId)}>
                      ✋ Dur
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Waiting/Results Footer */}
        {phase === 'results' && resultsData && (
          <div className="bj-results-summary bj-panel">
            <div className="bj-results-summary__header">
              <span>🏰 Kasa: {resultsData.dealerValue}</span>
              {resultsData.dealerBust && <span className="bj-badge bj-badge--bust">BUST!</span>}
            </div>
            {!xpApplied && isDM && (
              <button className="btn btn-gold" onClick={applyXpResults}>
                ⭐ XP Dağıt
              </button>
            )}
            {xpApplied && <span className="bj-results-summary__applied">✅ XP dağıtıldı!</span>}
          </div>
        )}
      </div>
    </div>
  );
}
