import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  HEX_AXIAL_COORDS, RESOURCE_TILES, NUMBER_TOKENS, PLAYER_COLORS,
  RESOURCE_TYPES, BUILD_COSTS, DEV_CARD_DECK_TEMPLATE,
  BOARD_TOPOLOGY, getHexVertexIndices, getAdjacentVertices, shuffle,
} from '../lib/catanHelpers';

// Debounce helper for realtime refresh
let _refreshTimer = null;
let _refreshing = false;

function debouncedRefresh(store) {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(async () => {
    if (_refreshing) return;
    _refreshing = true;
    try {
      await store.refreshAll();
    } finally {
      _refreshing = false;
    }
  }, 250);
}

export const useCatanStore = create((set, get) => ({
  game: null,
  hexes: [],
  vertices: [],
  edges: [],
  players: [],
  myPlayer: null,
  ports: [],
  trades: [],
  actionLog: [],
  devCardDeck: [],
  buildMode: null,
  showTradePanel: false,
  showDevCards: false,
  diceRolling: false,
  notification: null,
  realtimeChannel: null,

  // ============================================================
  // OYUN BAŞLATMA
  // ============================================================
  initializeGame: async (roomId, memberUserIds) => {
    const { data: existingGame } = await supabase
      .from('catan_games')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle();

    if (existingGame) {
      await get().loadGameState(existingGame.id);
      return existingGame;
    }

    const isTestMode = memberUserIds.length === 1;
    const shuffledResources = shuffle(RESOURCE_TILES);
    const turnOrder = shuffle([...memberUserIds]);
    const desertIdx = shuffledResources.indexOf('desert');

    const { data: game, error: gameErr } = await supabase
      .from('catan_games')
      .insert({
        room_id: roomId,
        current_turn_user_id: turnOrder[0],
        turn_order: turnOrder,
        phase: 'setup1',
        turn_number: 0,
        robber_hex: desertIdx,
      })
      .select()
      .single();
    if (gameErr) throw gameErr;

    let numberIdx = 0;
    const hexInserts = shuffledResources.map((res, i) => ({
      game_id: game.id,
      hex_index: i,
      resource_type: res,
      dice_number: res === 'desert' ? null : NUMBER_TOKENS[numberIdx++] ?? null,
      has_robber: i === desertIdx,
      q: HEX_AXIAL_COORDS[i].q,
      r: HEX_AXIAL_COORDS[i].r,
    }));
    await supabase.from('catan_hexes').insert(hexInserts);

    const vertexInserts = BOARD_TOPOLOGY.vertexPositions.map((_, i) => ({
      game_id: game.id,
      vertex_index: i,
      adjacent_hexes: BOARD_TOPOLOGY.vertexAdjHexes[i],
    }));
    await supabase.from('catan_vertices').insert(vertexInserts);

    const edgeInserts = BOARD_TOPOLOGY.edges.map((e) => ({
      game_id: game.id,
      edge_index: e.index,
      vertex_a: e.v1,
      vertex_b: e.v2,
    }));
    await supabase.from('catan_edges').insert(edgeInserts);

    const playerInserts = memberUserIds.map((uid, i) => {
      const data = {
        game_id: game.id,
        user_id: uid,
        player_color: PLAYER_COLORS[i % 4],
      };
      if (isTestMode) {
        data.wood = 5;
        data.brick = 5;
        data.sheep = 5;
        data.wheat = 5;
        data.ore = 5;
      }
      return data;
    });
    await supabase.from('catan_players').insert(playerInserts);

    const shuffledDeck = shuffle(DEV_CARD_DECK_TEMPLATE);
    const deckInserts = shuffledDeck.map((card, i) => ({
      game_id: game.id,
      card_type: card,
      deck_order: i,
    }));
    await supabase.from('catan_dev_card_deck').insert(deckInserts);

    await get().loadGameState(game.id);
    return game;
  },

  // ============================================================
  // STATE YÜKLEME (profile sorunu düzeltildi)
  // ============================================================
  loadGameState: async (gameId) => {
    const [
      { data: game },
      { data: hexes },
      { data: vertices },
      { data: edges },
      { data: playersRaw },
      { data: ports },
      { data: trades },
      { data: actionLogRaw },
      { data: deck },
    ] = await Promise.all([
      supabase.from('catan_games').select('*').eq('id', gameId).single(),
      supabase.from('catan_hexes').select('*').eq('game_id', gameId).order('hex_index'),
      supabase.from('catan_vertices').select('*').eq('game_id', gameId).order('vertex_index'),
      supabase.from('catan_edges').select('*').eq('game_id', gameId).order('edge_index'),
      supabase.from('catan_players').select('*').eq('game_id', gameId),
      supabase.from('catan_ports').select('*').eq('game_id', gameId),
      supabase.from('catan_trades').select('*').eq('game_id', gameId).eq('status', 'pending'),
      supabase.from('catan_action_log').select('*').eq('game_id', gameId).order('created_at', { ascending: false }).limit(50),
      supabase.from('catan_dev_card_deck').select('*').eq('game_id', gameId).eq('drawn', false).order('deck_order'),
    ]);

    let players = playersRaw || [];
    let actionLog = actionLogRaw || [];

    if (players.length > 0) {
      const userIds = [...new Set(players.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      players = players.map(p => ({
        ...p,
        profiles: profileMap[p.user_id] || { username: 'Bilinmeyen', avatar_url: null },
      }));
    }

    if (actionLog.length > 0) {
      const logUserIds = [...new Set(actionLog.filter(a => a.user_id).map(a => a.user_id))];
      if (logUserIds.length > 0) {
        const { data: logProfiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', logUserIds);
        const logProfileMap = {};
        (logProfiles || []).forEach(p => { logProfileMap[p.id] = p; });
        actionLog = actionLog.map(a => ({
          ...a,
          profiles: logProfileMap[a.user_id] || { username: '?' },
        }));
      }
    }

    set({
      game,
      hexes: hexes || [],
      vertices: vertices || [],
      edges: edges || [],
      players,
      ports: ports || [],
      trades: trades || [],
      actionLog,
      devCardDeck: deck || [],
    });
  },

  setMyPlayer: (userId) => {
    const p = get().players.find(pl => pl.user_id === userId);
    set({ myPlayer: p || null });
  },

  // ============================================================
  // ZAR ATMA
  // ============================================================
  rollDice: async () => {
    const { game, myPlayer } = get();
    if (!game || game.current_turn_user_id !== myPlayer?.user_id) return;
    if (game.phase !== 'main') return;
    if (game.dice_result?.length === 2) return;

    set({ diceRolling: true });
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    await supabase
      .from('catan_games')
      .update({ dice_result: [d1, d2] })
      .eq('id', game.id);

    if (total === 7) {
      await get().logAction('roll_dice', { d1, d2, total, robber: true });
      set({ diceRolling: false, buildMode: 'robber' });
      await get().refreshAll();
      return;
    }

    await get().distributeResources(total);
    await get().logAction('roll_dice', { d1, d2, total });
    set({ diceRolling: false });
    await get().refreshAll();
  },

  // ============================================================
  // KAYNAK DAĞITIMI
  // ============================================================
  distributeResources: async (diceTotal) => {
    const { game, hexes, vertices, players } = get();
    const matchingHexes = hexes.filter(h => h.dice_number === diceTotal && !h.has_robber);

    const gains = {};
    for (const hex of matchingHexes) {
      const hexVerts = getHexVertexIndices(hex.hex_index);
      const occupied = vertices.filter(
        v => hexVerts.includes(v.vertex_index) && v.building_type && v.owner_user_id
      );
      for (const vert of occupied) {
        const amount = vert.building_type === 'city' ? 2 : 1;
        if (!gains[vert.owner_user_id]) gains[vert.owner_user_id] = {};
        gains[vert.owner_user_id][hex.resource_type] =
          (gains[vert.owner_user_id][hex.resource_type] || 0) + amount;
      }
    }

    const updates = [];
    for (const [userId, resources] of Object.entries(gains)) {
      const player = players.find(p => p.user_id === userId);
      if (!player) continue;
      const updateData = {};
      for (const [res, amount] of Object.entries(resources)) {
        updateData[res] = (player[res] || 0) + amount;
      }
      updates.push(
        supabase.from('catan_players').update(updateData).eq('id', player.id)
      );
    }
    if (updates.length > 0) await Promise.all(updates);
  },

  // ============================================================
  // YAPI İNŞA
  // ============================================================
  buildRoad: async (edgeIndex) => {
    const { game, myPlayer, edges, vertices } = get();
    if (!game || !myPlayer) return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;

    const edge = edges.find(e => e.edge_index === edgeIndex);
    if (!edge || edge.has_road) return;

    const isSetup = game.phase === 'setup1' || game.phase === 'setup2';
    const isFreeRoad = game.free_roads_remaining > 0;

    if (!isSetup && !isFreeRoad) {
      if (myPlayer.wood < 1 || myPlayer.brick < 1) return;
    }

    if (isSetup) {
      const mySettlements = vertices.filter(
        v => v.owner_user_id === myPlayer.user_id && v.building_type === 'settlement'
      );
      const lastSettlement = mySettlements[mySettlements.length - 1];
      if (lastSettlement) {
        const connected = edge.vertex_a === lastSettlement.vertex_index ||
                          edge.vertex_b === lastSettlement.vertex_index;
        if (!connected) return;
      }
    } else if (!isFreeRoad) {
      const myEdges = edges.filter(e => e.has_road && e.owner_user_id === myPlayer.user_id);
      const myVerts = vertices.filter(v => v.owner_user_id === myPlayer.user_id);
      const connectedVertices = new Set();
      for (const e of myEdges) {
        connectedVertices.add(e.vertex_a);
        connectedVertices.add(e.vertex_b);
      }
      for (const v of myVerts) {
        connectedVertices.add(v.vertex_index);
      }
      if (!connectedVertices.has(edge.vertex_a) && !connectedVertices.has(edge.vertex_b)) return;
    }

    await supabase
      .from('catan_edges')
      .update({ has_road: true, owner_user_id: myPlayer.user_id })
      .eq('game_id', game.id)
      .eq('edge_index', edgeIndex);

    if (!isSetup && !isFreeRoad) {
      await supabase
        .from('catan_players')
        .update({
          wood: myPlayer.wood - 1,
          brick: myPlayer.brick - 1,
          roads_left: myPlayer.roads_left - 1,
        })
        .eq('id', myPlayer.id);
    } else if (isFreeRoad) {
      await supabase
        .from('catan_games')
        .update({ free_roads_remaining: game.free_roads_remaining - 1 })
        .eq('id', game.id);
      await supabase
        .from('catan_players')
        .update({ roads_left: myPlayer.roads_left - 1 })
        .eq('id', myPlayer.id);
    } else {
      await supabase
        .from('catan_players')
        .update({
          roads_left: myPlayer.roads_left - 1,
          setup_roads_placed: myPlayer.setup_roads_placed + 1,
        })
        .eq('id', myPlayer.id);
    }

    await get().logAction('build_road', { edge_index: edgeIndex });
    await get().checkLongestRoad();

    if (isSetup) {
      await get().advanceSetupTurn();
    }
    await get().refreshAll();
  },

  buildSettlement: async (vertexIndex) => {
    const { game, myPlayer, vertices, edges } = get();
    if (!game || !myPlayer) return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;

    const vertex = vertices.find(v => v.vertex_index === vertexIndex);
    if (!vertex || vertex.building_type) return;

    const adjVerts = getAdjacentVertices(vertexIndex);
    const blocked = adjVerts.some(av => {
      const v = vertices.find(vv => vv.vertex_index === av);
      return v && v.building_type;
    });
    if (blocked) return;

    const isSetup = game.phase === 'setup1' || game.phase === 'setup2';

    if (!isSetup) {
      if (myPlayer.wood < 1 || myPlayer.brick < 1 || myPlayer.sheep < 1 || myPlayer.wheat < 1) return;
      const myRoads = edges.filter(e => e.has_road && e.owner_user_id === myPlayer.user_id);
      const connected = myRoads.some(e => e.vertex_a === vertexIndex || e.vertex_b === vertexIndex);
      if (!connected) return;
    }

    await supabase
      .from('catan_vertices')
      .update({ building_type: 'settlement', owner_user_id: myPlayer.user_id })
      .eq('game_id', game.id)
      .eq('vertex_index', vertexIndex);

    const updateData = {
      settlements_left: myPlayer.settlements_left - 1,
      victory_points: myPlayer.victory_points + 1,
    };

    if (!isSetup) {
      updateData.wood = myPlayer.wood - 1;
      updateData.brick = myPlayer.brick - 1;
      updateData.sheep = myPlayer.sheep - 1;
      updateData.wheat = myPlayer.wheat - 1;
    } else {
      updateData.setup_settlements_placed = myPlayer.setup_settlements_placed + 1;
      if (game.phase === 'setup2') {
        const adjHexes = vertex.adjacent_hexes || [];
        const { hexes } = get();
        for (const hi of adjHexes) {
          const hex = hexes.find(h => h.hex_index === hi);
          if (hex && hex.resource_type !== 'desert') {
            updateData[hex.resource_type] = (updateData[hex.resource_type] || myPlayer[hex.resource_type] || 0) + 1;
          }
        }
      }
    }

    await supabase.from('catan_players').update(updateData).eq('id', myPlayer.id);
    await get().logAction('build_settlement', { vertex_index: vertexIndex });
    await get().checkWinCondition();
    await get().refreshAll();
  },

  buildCity: async (vertexIndex) => {
    const { game, myPlayer, vertices } = get();
    if (!game || !myPlayer || game.phase !== 'main') return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;

    const vertex = vertices.find(v => v.vertex_index === vertexIndex);
    if (!vertex || vertex.building_type !== 'settlement' || vertex.owner_user_id !== myPlayer.user_id) return;
    if (myPlayer.wheat < 2 || myPlayer.ore < 3) return;

    await supabase
      .from('catan_vertices')
      .update({ building_type: 'city' })
      .eq('game_id', game.id)
      .eq('vertex_index', vertexIndex);

    await supabase
      .from('catan_players')
      .update({
        wheat: myPlayer.wheat - 2,
        ore: myPlayer.ore - 3,
        cities_left: myPlayer.cities_left - 1,
        settlements_left: myPlayer.settlements_left + 1,
        victory_points: myPlayer.victory_points + 1,
      })
      .eq('id', myPlayer.id);

    await get().logAction('build_city', { vertex_index: vertexIndex });
    await get().checkWinCondition();
    await get().refreshAll();
  },

  // ============================================================
  // GELİŞTİRME KARTLARI
  // ============================================================
  buyDevCard: async () => {
    const { game, myPlayer, devCardDeck } = get();
    if (!game || !myPlayer || game.phase !== 'main') return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;
    if (myPlayer.sheep < 1 || myPlayer.wheat < 1 || myPlayer.ore < 1) return;
    if (devCardDeck.length === 0) return;

    const card = devCardDeck[0];
    await supabase
      .from('catan_dev_card_deck')
      .update({ drawn: true, drawn_by: myPlayer.user_id })
      .eq('id', card.id);

    const cardField = `dev_cards_${card.card_type}`;
    const updateData = {
      sheep: myPlayer.sheep - 1,
      wheat: myPlayer.wheat - 1,
      ore: myPlayer.ore - 1,
      [cardField]: (myPlayer[cardField] || 0) + 1,
      new_dev_cards: [...(myPlayer.new_dev_cards || []), card.card_type],
    };
    if (card.card_type === 'victory_point') {
      updateData.hidden_vp = (myPlayer.hidden_vp || 0) + 1;
    }

    await supabase.from('catan_players').update(updateData).eq('id', myPlayer.id);
    await get().logAction('buy_dev_card', {});
    await get().checkWinCondition();
    await get().refreshAll();
  },

  playKnight: async () => {
    const { game, myPlayer } = get();
    if (!game || !myPlayer) return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;
    if (myPlayer.dev_cards_knight < 1 || myPlayer.played_dev_card_this_turn) return;
    if ((myPlayer.new_dev_cards || []).includes('knight')) return;

    await supabase
      .from('catan_players')
      .update({
        dev_cards_knight: myPlayer.dev_cards_knight - 1,
        knights_played: myPlayer.knights_played + 1,
        played_dev_card_this_turn: true,
      })
      .eq('id', myPlayer.id);

    await get().logAction('play_knight', {});
    await get().checkLargestArmy();
    set({ buildMode: 'robber' });
    await get().refreshAll();
  },

  playRoadBuilding: async () => {
    const { game, myPlayer } = get();
    if (!game || !myPlayer) return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;
    if (myPlayer.dev_cards_road_building < 1 || myPlayer.played_dev_card_this_turn) return;

    await supabase
      .from('catan_players')
      .update({
        dev_cards_road_building: myPlayer.dev_cards_road_building - 1,
        played_dev_card_this_turn: true,
      })
      .eq('id', myPlayer.id);

    await supabase
      .from('catan_games')
      .update({ free_roads_remaining: 2 })
      .eq('id', game.id);

    set({ buildMode: 'road' });
    await get().logAction('road_building', {});
    await get().refreshAll();
  },

  playYearOfPlenty: async (resource1, resource2) => {
    const { game, myPlayer } = get();
    if (!game || !myPlayer) return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;
    if (myPlayer.dev_cards_year_of_plenty < 1 || myPlayer.played_dev_card_this_turn) return;

    const updateData = {
      dev_cards_year_of_plenty: myPlayer.dev_cards_year_of_plenty - 1,
      played_dev_card_this_turn: true,
    };
    updateData[resource1] = (myPlayer[resource1] || 0) + 1;
    updateData[resource2] = (updateData[resource2] || myPlayer[resource2] || 0) + 1;

    await supabase.from('catan_players').update(updateData).eq('id', myPlayer.id);
    await get().logAction('year_of_plenty', { resource1, resource2 });
    await get().refreshAll();
  },

  playMonopoly: async (resource) => {
    const { game, myPlayer, players } = get();
    if (!game || !myPlayer) return;
    if (game.current_turn_user_id !== myPlayer.user_id) return;
    if (myPlayer.dev_cards_monopoly < 1 || myPlayer.played_dev_card_this_turn) return;

    let totalStolen = 0;
    const updates = [];
    for (const p of players) {
      if (p.user_id === myPlayer.user_id) continue;
      const amount = p[resource] || 0;
      if (amount > 0) {
        totalStolen += amount;
        updates.push(
          supabase.from('catan_players').update({ [resource]: 0 }).eq('id', p.id)
        );
      }
    }
    if (updates.length > 0) await Promise.all(updates);

    await supabase
      .from('catan_players')
      .update({
        [resource]: (myPlayer[resource] || 0) + totalStolen,
        dev_cards_monopoly: myPlayer.dev_cards_monopoly - 1,
        played_dev_card_this_turn: true,
      })
      .eq('id', myPlayer.id);

    await get().logAction('monopoly', { resource, amount: totalStolen });
    await get().refreshAll();
  },

  // ============================================================
  // HIRSIZ
  // ============================================================
  moveRobber: async (hexIndex, stealFromUserId) => {
    const { game, myPlayer, hexes, players } = get();
    if (!game || !myPlayer) return;

    const oldHex = hexes.find(h => h.has_robber);
    if (oldHex) {
      await supabase.from('catan_hexes')
        .update({ has_robber: false })
        .eq('game_id', game.id)
        .eq('hex_index', oldHex.hex_index);
    }

    await supabase.from('catan_hexes')
      .update({ has_robber: true })
      .eq('game_id', game.id)
      .eq('hex_index', hexIndex);

    await supabase.from('catan_games')
      .update({ robber_hex: hexIndex })
      .eq('id', game.id);

    if (stealFromUserId) {
      const victim = players.find(p => p.user_id === stealFromUserId);
      if (victim) {
        const victimResources = RESOURCE_TYPES.filter(r => (victim[r] || 0) > 0);
        if (victimResources.length > 0) {
          const stolen = victimResources[Math.floor(Math.random() * victimResources.length)];
          await supabase.from('catan_players')
            .update({ [stolen]: victim[stolen] - 1 })
            .eq('id', victim.id);
          await supabase.from('catan_players')
            .update({ [stolen]: (myPlayer[stolen] || 0) + 1 })
            .eq('id', myPlayer.id);
          await get().logAction('steal_resource', { from: stealFromUserId, resource: stolen });
        }
      }
    }

    set({ buildMode: null });
    await get().logAction('robber_move', { hex_index: hexIndex });
    await get().refreshAll();
  },

  discardResources: async (resources) => {
    const { game, myPlayer } = get();
    if (!game || !myPlayer) return;

    const updateData = {};
    for (const r of RESOURCE_TYPES) {
      if (resources[r]) {
        updateData[r] = Math.max(0, (myPlayer[r] || 0) - (resources[r] || 0));
      }
    }
    await supabase.from('catan_players').update(updateData).eq('id', myPlayer.id);
    await get().logAction('discard_resources', resources);
    await get().refreshAll();
  },

  // ============================================================
  // TAKAS
  // ============================================================
  tradeWithBank: async (giveResource, giveAmount, getResource) => {
    const { myPlayer } = get();
    if (!myPlayer) return;
    if ((myPlayer[giveResource] || 0) < giveAmount) return;

    await supabase
      .from('catan_players')
      .update({
        [giveResource]: myPlayer[giveResource] - giveAmount,
        [getResource]: (myPlayer[getResource] || 0) + 1,
      })
      .eq('id', myPlayer.id);

    await get().logAction('trade_bank', { give: giveResource, giveAmount, get: getResource });
    await get().refreshAll();
  },

  proposeTrade: async (offer, request, targetUserId = null) => {
    const { game, myPlayer } = get();
    if (!game || !myPlayer) return;

    await supabase.from('catan_trades').insert({
      game_id: game.id,
      proposer_user_id: myPlayer.user_id,
      target_user_id: targetUserId,
      offer_wood: offer.wood || 0,
      offer_brick: offer.brick || 0,
      offer_sheep: offer.sheep || 0,
      offer_wheat: offer.wheat || 0,
      offer_ore: offer.ore || 0,
      request_wood: request.wood || 0,
      request_brick: request.brick || 0,
      request_sheep: request.sheep || 0,
      request_wheat: request.wheat || 0,
      request_ore: request.ore || 0,
    });
    await get().logAction('trade_propose', { offer, request });
    await get().refreshTrades();
  },

  acceptTrade: async (tradeId) => {
    const { myPlayer, trades, players } = get();
    if (!myPlayer) return;

    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'pending') return;

    const proposer = players.find(p => p.user_id === trade.proposer_user_id);
    if (!proposer) return;

    const proposerUpdate = {};
    const accepterUpdate = {};
    for (const r of RESOURCE_TYPES) {
      const offered = trade[`offer_${r}`] || 0;
      const requested = trade[`request_${r}`] || 0;
      if (offered > 0) {
        proposerUpdate[r] = (proposer[r] || 0) - offered;
        accepterUpdate[r] = (myPlayer[r] || 0) + offered;
      }
      if (requested > 0) {
        proposerUpdate[r] = (proposerUpdate[r] ?? proposer[r] ?? 0) + requested;
        accepterUpdate[r] = (accepterUpdate[r] ?? myPlayer[r] ?? 0) - requested;
      }
    }

    await Promise.all([
      supabase.from('catan_players').update(proposerUpdate).eq('id', proposer.id),
      supabase.from('catan_players').update(accepterUpdate).eq('id', myPlayer.id),
      supabase.from('catan_trades').update({ status: 'accepted', accepted_by: myPlayer.user_id }).eq('id', tradeId),
    ]);

    await get().logAction('trade_accept', { trade_id: tradeId });
    await get().refreshAll();
  },

  rejectTrade: async (tradeId) => {
    await supabase.from('catan_trades').update({ status: 'rejected' }).eq('id', tradeId);
    await get().refreshTrades();
  },

  cancelTrade: async (tradeId) => {
    await supabase.from('catan_trades').update({ status: 'cancelled' }).eq('id', tradeId);
    await get().refreshTrades();
  },

  // ============================================================
  // TUR YÖNETİMİ
  // ============================================================
  endTurn: async () => {
    const { game, myPlayer } = get();
    if (!game || game.current_turn_user_id !== myPlayer?.user_id) return;
    if (game.phase !== 'main') return;

    const order = game.turn_order || [];
    const currentIdx = order.indexOf(myPlayer.user_id);
    const nextIdx = (currentIdx + 1) % order.length;

    await supabase.from('catan_players')
      .update({ played_dev_card_this_turn: false, new_dev_cards: [] })
      .eq('id', myPlayer.id);

    await supabase.from('catan_games')
      .update({
        current_turn_user_id: order[nextIdx],
        turn_number: game.turn_number + 1,
        dice_result: [],
        free_roads_remaining: 0,
      })
      .eq('id', game.id);

    await get().logAction('end_turn', {});
    await get().refreshAll();
  },

  // Setup sırasını ilerlet - DB'den taze veri okuyarak (stale state fix)
  advanceSetupTurn: async () => {
    const { game } = get();
    if (!game) return;

    const { data: currentPlayer } = await supabase
      .from('catan_players')
      .select('*')
      .eq('game_id', game.id)
      .eq('user_id', game.current_turn_user_id)
      .single();

    if (!currentPlayer) return;

    const order = game.turn_order || [];
    const currentIdx = order.indexOf(game.current_turn_user_id);

    if (game.phase === 'setup1') {
      if (currentPlayer.setup_roads_placed >= 1 && currentPlayer.setup_settlements_placed >= 1) {
        if (currentIdx < order.length - 1) {
          await supabase.from('catan_games')
            .update({ current_turn_user_id: order[currentIdx + 1] })
            .eq('id', game.id);
        } else {
          await supabase.from('catan_games')
            .update({ phase: 'setup2', current_turn_user_id: order[order.length - 1] })
            .eq('id', game.id);
        }
      }
    } else if (game.phase === 'setup2') {
      if (currentPlayer.setup_roads_placed >= 2 && currentPlayer.setup_settlements_placed >= 2) {
        if (currentIdx > 0) {
          await supabase.from('catan_games')
            .update({ current_turn_user_id: order[currentIdx - 1] })
            .eq('id', game.id);
        } else {
          await supabase.from('catan_games')
            .update({ phase: 'main', current_turn_user_id: order[0], turn_number: 1 })
            .eq('id', game.id);
        }
      }
    }
  },

  // ============================================================
  // KONTROLLER
  // ============================================================
  checkLongestRoad: async () => {
    const { game, players, edges } = get();
    if (!game) return;

    let maxLength = 4;
    let longestPlayer = null;

    for (const p of players) {
      const playerEdges = edges.filter(e => e.has_road && e.owner_user_id === p.user_id);
      const length = calculateRoadLength(playerEdges);
      if (length > maxLength) {
        maxLength = length;
        longestPlayer = p;
      }
    }

    const prevHolder = game.longest_road_user_id;
    const newHolder = longestPlayer?.user_id || null;

    if (prevHolder !== newHolder) {
      const updates = [];
      if (prevHolder) {
        const prev = players.find(p => p.user_id === prevHolder);
        if (prev) {
          updates.push(
            supabase.from('catan_players')
              .update({ has_longest_road: false, victory_points: Math.max(0, prev.victory_points - 2) })
              .eq('id', prev.id)
          );
        }
      }
      if (longestPlayer) {
        updates.push(
          supabase.from('catan_players')
            .update({ has_longest_road: true, victory_points: longestPlayer.victory_points + 2, longest_road_length: maxLength + 1 })
            .eq('id', longestPlayer.id)
        );
      }
      updates.push(
        supabase.from('catan_games')
          .update({ longest_road_user_id: newHolder })
          .eq('id', game.id)
      );
      await Promise.all(updates);
    }
  },

  checkLargestArmy: async () => {
    const { game, players } = get();
    if (!game) return;

    let maxKnights = 2;
    let armyPlayer = null;

    for (const p of players) {
      if (p.knights_played > maxKnights) {
        maxKnights = p.knights_played;
        armyPlayer = p;
      }
    }

    const prevHolder = game.largest_army_user_id;
    const newHolder = armyPlayer?.user_id || null;

    if (prevHolder !== newHolder) {
      const updates = [];
      if (prevHolder) {
        const prev = players.find(p => p.user_id === prevHolder);
        if (prev) {
          updates.push(
            supabase.from('catan_players')
              .update({ has_largest_army: false, victory_points: Math.max(0, prev.victory_points - 2) })
              .eq('id', prev.id)
          );
        }
      }
      if (armyPlayer) {
        updates.push(
          supabase.from('catan_players')
            .update({ has_largest_army: true, victory_points: armyPlayer.victory_points + 2 })
            .eq('id', armyPlayer.id)
        );
      }
      updates.push(
        supabase.from('catan_games')
          .update({ largest_army_user_id: newHolder })
          .eq('id', game.id)
      );
      await Promise.all(updates);
    }
  },

  checkWinCondition: async () => {
    const { game, players } = get();
    if (!game) return;

    for (const p of players) {
      const totalVP = (p.victory_points || 0) + (p.hidden_vp || 0);
      if (totalVP >= 10) {
        await supabase.from('catan_games')
          .update({ winner_user_id: p.user_id, phase: 'finished' })
          .eq('id', game.id);
        await get().logAction('win_game', { user_id: p.user_id, vp: totalVP });
        await get().refreshAll();
        return true;
      }
    }
    return false;
  },

  getPlayerPorts: () => {
    const { myPlayer, ports, vertices } = get();
    if (!myPlayer || !ports.length) return [];
    const myVerts = vertices
      .filter(v => v.owner_user_id === myPlayer.user_id)
      .map(v => v.vertex_index);
    return ports.filter(p => myVerts.includes(p.vertex_a) || myVerts.includes(p.vertex_b));
  },

  getBankTradeRate: (resource) => {
    const playerPorts = get().getPlayerPorts();
    if (playerPorts.some(p => p.port_type === resource)) return 2;
    if (playerPorts.some(p => p.port_type === 'generic')) return 3;
    return 4;
  },

  // ============================================================
  // YARDIMCI
  // ============================================================
  logAction: async (actionType, data) => {
    const { game, myPlayer } = get();
    if (!game) return;
    try {
      await supabase.from('catan_action_log').insert({
        game_id: game.id,
        user_id: myPlayer?.user_id,
        action_type: actionType,
        action_data: data,
      });
    } catch (e) {
      console.warn('logAction error:', e);
    }
  },

  refreshPlayers: async () => {
    const { game } = get();
    if (!game) return;
    const { data: playersRaw } = await supabase
      .from('catan_players')
      .select('*')
      .eq('game_id', game.id);

    let players = playersRaw || [];
    if (players.length > 0) {
      const userIds = [...new Set(players.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      players = players.map(p => ({
        ...p,
        profiles: profileMap[p.user_id] || { username: 'Bilinmeyen', avatar_url: null },
      }));
    }

    set({ players });
    const { myPlayer } = get();
    if (myPlayer) {
      const updated = players.find(p => p.user_id === myPlayer.user_id);
      if (updated) set({ myPlayer: updated });
    }
  },

  refreshTrades: async () => {
    const { game } = get();
    if (!game) return;
    const { data } = await supabase
      .from('catan_trades')
      .select('*')
      .eq('game_id', game.id)
      .eq('status', 'pending');
    set({ trades: data || [] });
  },

  refreshAll: async () => {
    const { game } = get();
    if (!game) return;
    await get().loadGameState(game.id);
    const { myPlayer } = get();
    if (myPlayer) {
      get().setMyPlayer(myPlayer.user_id);
    }
  },

  // ============================================================
  // REALTIME (debounced)
  // ============================================================
  subscribeToCatan: (gameId) => {
    const existing = get().realtimeChannel;
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`catan-${gameId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catan_games', filter: `id=eq.${gameId}` },
        () => debouncedRefresh(get()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catan_vertices', filter: `game_id=eq.${gameId}` },
        () => debouncedRefresh(get()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catan_edges', filter: `game_id=eq.${gameId}` },
        () => debouncedRefresh(get()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catan_players', filter: `game_id=eq.${gameId}` },
        () => debouncedRefresh(get()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catan_trades', filter: `game_id=eq.${gameId}` },
        () => get().refreshTrades())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'catan_action_log', filter: `game_id=eq.${gameId}` },
        async (payload) => {
          if (!payload.new?.user_id) {
            set(s => ({ actionLog: [{ ...payload.new, profiles: { username: 'Sistem' } }, ...s.actionLog] }));
            return;
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', payload.new.user_id)
            .single();
          set(s => ({
            actionLog: [{ ...payload.new, profiles: profile || { username: '?' } }, ...s.actionLog],
          }));
        })
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromCatan: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },

  setBuildMode: (mode) => set({ buildMode: mode }),
  setShowTradePanel: (show) => set({ showTradePanel: show }),
  setShowDevCards: (show) => set({ showDevCards: show }),
  setNotification: (msg) => set({ notification: msg }),

  resetCatan: () => {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    set({
      game: null, hexes: [], vertices: [], edges: [], players: [],
      myPlayer: null, ports: [], trades: [], actionLog: [], devCardDeck: [],
      buildMode: null, showTradePanel: false, showDevCards: false,
      diceRolling: false, notification: null,
    });
  },
}));

// YOL UZUNLUĞU HESAPLAMA (DFS)
function calculateRoadLength(playerEdges) {
  if (playerEdges.length === 0) return 0;

  const graph = {};
  for (const e of playerEdges) {
    if (!graph[e.vertex_a]) graph[e.vertex_a] = [];
    if (!graph[e.vertex_b]) graph[e.vertex_b] = [];
    graph[e.vertex_a].push(e.vertex_b);
    graph[e.vertex_b].push(e.vertex_a);
  }

  let maxLen = 0;
  const visited = new Set();

  function dfs(node, length) {
    if (length > maxLen) maxLen = length;
    for (const neighbor of (graph[node] || [])) {
      const edgeKey = `${Math.min(node, neighbor)}-${Math.max(node, neighbor)}`;
      if (!visited.has(edgeKey)) {
        visited.add(edgeKey);
        dfs(neighbor, length + 1);
        visited.delete(edgeKey);
      }
    }
  }

  for (const startNode of Object.keys(graph)) {
    visited.clear();
    dfs(parseInt(startNode), 0);
  }

  return maxLen;
}

export { BUILD_COSTS, RESOURCE_TYPES, PLAYER_COLORS };

