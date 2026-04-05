import { create } from 'zustand';

// ============================================================
// BLACKJACK STORE – Multiplayer Blackjack (DM = Kasa)
// ============================================================

const SUITS = ['C', 'D', 'H', 'S'];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, id: `${suit}-${value}` });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Blackjack value: 1=Ace(1 or 11), 2-10=face value, 11/12/13=10
function cardBlackjackValue(card) {
  if (card.value >= 11) return 10; // J, Q, K
  return card.value; // Ace=1, others face value
}

function calculateHandValue(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const val = cardBlackjackValue(card);
    if (val === 1) {
      aces++;
      total += 11;
    } else {
      total += val;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function getCardImagePath(card) {
  return `./assest/cards/${card.id}.png`;
}

export const useBlackjackStore = create((set, get) => ({
  // Game state
  active: false,
  phase: 'idle', // 'idle' | 'betting' | 'dealing' | 'playing' | 'dealer_turn' | 'results'
  
  // Deck
  deck: [],
  
  // Dealer (DM) hand
  dealerHand: [],
  dealerRevealed: false,
  
  // Players: { [memberId]: { userId, username, hand: [], bet: 1, status: 'playing'|'stand'|'bust'|'blackjack'|'passive', xp: number } }
  players: {},
  
  // Turn order for blackjack (different from game turn)
  turnOrder: [],
  currentPlayerIndex: 0,
  
  // DM info
  dmId: null,

  // Helpers
  getCardImage: getCardImagePath,
  calcHandValue: calculateHandValue,

  // ===== ACTIONS =====

  // DM starts a new blackjack game
  startGame: (members, dmId) => {
    const deck = shuffleDeck(createDeck());
    const players = {};
    const turnOrder = [];

    for (const member of members) {
      if (member.user_id === dmId) continue; // DM is dealer, not a player
      
      const isPassive = (member.xp || 0) <= 0;
      players[member.id] = {
        memberId: member.id,
        userId: member.user_id,
        username: member.profiles?.username || 'Oyuncu',
        hand: [],
        bet: isPassive ? 0 : 1,
        status: isPassive ? 'passive' : 'waiting',
        xp: member.xp || 0,
      };
      
      if (!isPassive) {
        turnOrder.push(member.id);
      }
    }

    set({
      active: true,
      phase: 'dealing',
      deck,
      dealerHand: [],
      dealerRevealed: false,
      players,
      turnOrder,
      currentPlayerIndex: 0,
      dmId,
    });
  },

  // Deal initial cards (2 per player + 2 for dealer)
  dealInitialCards: () => {
    const state = get();
    const deck = [...state.deck];
    const players = { ...state.players };
    const dealerHand = [];

    // Deal 2 cards to each active player
    for (const memberId of state.turnOrder) {
      const p = { ...players[memberId] };
      p.hand = [deck.pop(), deck.pop()];
      p.status = 'playing';
      // Check for natural blackjack
      if (calculateHandValue(p.hand) === 21) {
        p.status = 'blackjack';
      }
      players[memberId] = p;
    }

    // Deal 2 cards to dealer (1 face up, 1 face down)
    dealerHand.push(deck.pop(), deck.pop());

    set({
      deck,
      players,
      dealerHand,
      phase: 'playing',
      currentPlayerIndex: 0,
    });
  },

  // Player hits (takes another card)
  hit: (memberId) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.turnOrder[state.currentPlayerIndex] !== memberId) return;

    const deck = [...state.deck];
    const players = { ...state.players };
    const p = { ...players[memberId] };

    p.hand = [...p.hand, deck.pop()];
    const value = calculateHandValue(p.hand);

    if (value > 21) {
      p.status = 'bust';
    } else if (value === 21) {
      p.status = 'stand';
    }

    players[memberId] = p;
    
    let nextState = { deck, players };

    // If bust or 21, auto-advance to next player
    if (p.status === 'bust' || p.status === 'stand') {
      nextState = { ...nextState, ...get()._advanceToNext(state.currentPlayerIndex, players, state.turnOrder) };
    }

    set(nextState);
  },

  // Player stands
  stand: (memberId) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.turnOrder[state.currentPlayerIndex] !== memberId) return;

    const players = { ...state.players };
    const p = { ...players[memberId] };
    p.status = 'stand';
    players[memberId] = p;

    set({ players, ...get()._advanceToNext(state.currentPlayerIndex, players, state.turnOrder) });
  },

  // Internal: advance to next player or dealer turn
  _advanceToNext: (currentIndex, players, turnOrder) => {
    let nextIndex = currentIndex + 1;
    
    // Skip players who already have blackjack
    while (nextIndex < turnOrder.length) {
      const nextMemberId = turnOrder[nextIndex];
      if (players[nextMemberId]?.status === 'blackjack') {
        nextIndex++;
      } else {
        break;
      }
    }

    if (nextIndex >= turnOrder.length) {
      return { phase: 'dealer_turn', currentPlayerIndex: nextIndex };
    }
    return { currentPlayerIndex: nextIndex };
  },

  // Dealer plays (DM reveals hole card and draws until 17+)
  dealerPlay: () => {
    const state = get();
    const deck = [...state.deck];
    let dealerHand = [...state.dealerHand];

    // Dealer draws until 17 or above
    while (calculateHandValue(dealerHand) < 17) {
      dealerHand.push(deck.pop());
    }

    set({ deck, dealerHand, dealerRevealed: true, phase: 'results' });
  },

  // Calculate results and return XP changes
  getResults: () => {
    const state = get();
    const dealerValue = calculateHandValue(state.dealerHand);
    const dealerBust = dealerValue > 21;
    const results = {};

    for (const memberId of state.turnOrder) {
      const p = state.players[memberId];
      if (!p || p.status === 'passive') continue;

      const playerValue = calculateHandValue(p.hand);
      let xpChange = 0;
      let result = '';

      if (p.status === 'bust') {
        xpChange = -1;
        result = 'bust';
      } else if (p.status === 'blackjack') {
        if (dealerValue === 21 && state.dealerHand.length === 2) {
          xpChange = 0; // Both blackjack = push
          result = 'push';
        } else {
          xpChange = 2; // Blackjack pays 2:1
          result = 'blackjack';
        }
      } else if (dealerBust) {
        xpChange = 1;
        result = 'win';
      } else if (playerValue > dealerValue) {
        xpChange = 1;
        result = 'win';
      } else if (playerValue === dealerValue) {
        xpChange = 0;
        result = 'push';
      } else {
        xpChange = -1;
        result = 'lose';
      }

      results[memberId] = { ...p, playerValue, xpChange, result };
    }

    return { results, dealerValue, dealerBust };
  },

  // End game / cleanup
  endGame: () => {
    set({
      active: false,
      phase: 'idle',
      deck: [],
      dealerHand: [],
      dealerRevealed: false,
      players: {},
      turnOrder: [],
      currentPlayerIndex: 0,
      dmId: null,
    });
  },

  // Full state sync (for broadcast receiver)
  syncState: (state) => {
    set({
      active: state.active,
      phase: state.phase,
      deck: state.deck,
      dealerHand: state.dealerHand,
      dealerRevealed: state.dealerRevealed,
      players: state.players,
      turnOrder: state.turnOrder,
      currentPlayerIndex: state.currentPlayerIndex,
      dmId: state.dmId,
    });
  },

  // Get serializable state for broadcast
  getSerializableState: () => {
    const s = get();
    return {
      active: s.active,
      phase: s.phase,
      deck: s.deck,
      dealerHand: s.dealerHand,
      dealerRevealed: s.dealerRevealed,
      players: s.players,
      turnOrder: s.turnOrder,
      currentPlayerIndex: s.currentPlayerIndex,
      dmId: s.dmId,
    };
  },
}));
