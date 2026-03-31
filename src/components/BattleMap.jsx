import React, { useState, useCallback, useRef, useEffect } from 'react';

const GRID_SIZE = 16;
const CELL_SIZE = 36;
const TERRAIN_TYPES = {
  grass: { color: '#2d4a2d', label: '🌿' },
  water: { color: '#1a3d5c', label: '🌊' },
  stone: { color: '#4a4a4a', label: '🪨' },
  lava: { color: '#6b1c1c', label: '🔥' },
  sand: { color: '#6b5b3a', label: '🏜️' },
  forest: { color: '#1a3a1a', label: '🌲' },
};

const FOG_OPACITY = 0.85;

export default function BattleMap({ members, monsters = [], isDM, onMoveToken, onCellClick }) {
  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [tokens, setTokens] = useState([]);
  const [fogOfWar, setFogOfWar] = useState(() => createEmptyFog());
  const [selectedToken, setSelectedToken] = useState(null);
  const [activeTerrain, setActiveTerrain] = useState(null);
  const [showFogTool, setShowFogTool] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  // Initialize tokens from members + monsters
  useEffect(() => {
    const newTokens = [];
    members.forEach((m, i) => {
      if (m.characters) {
        newTokens.push({
          id: m.user_id,
          name: m.profiles?.username || 'Player',
          char: m.characters?.name,
          icon: getClassIcon(m.characters?.class),
          color: PLAYER_COLORS[i % PLAYER_COLORS.length],
          row: 14,
          col: 2 + i * 2,
          type: 'player',
          isDM: m.user_id === members.find((mm) => mm.user_id)?.user_id,
        });
      }
    });
    monsters.forEach((m, i) => {
      newTokens.push({
        id: m.id,
        name: m.name,
        icon: m.icon,
        color: '#7a1c1c',
        row: 2 + Math.floor(i / 4) * 2,
        col: 6 + (i % 4) * 2,
        type: 'monster',
        health: m.currentHealth,
        maxHealth: m.health,
      });
    });
    setTokens(newTokens);
  }, [members.length, monsters.length]);

  const handleCellClick = useCallback((row, col) => {
    if (isDM && activeTerrain) {
      setGrid((g) => {
        const ng = g.map((r) => [...r]);
        ng[row][col] = activeTerrain;
        return ng;
      });
      return;
    }
    if (isDM && showFogTool) {
      setFogOfWar((f) => {
        const nf = f.map((r) => [...r]);
        nf[row][col] = !nf[row][col];
        return nf;
      });
      return;
    }
    if (selectedToken) {
      setTokens((t) =>
        t.map((tk) => (tk.id === selectedToken ? { ...tk, row, col } : tk))
      );
      if (onMoveToken) onMoveToken(selectedToken, row, col);
      setSelectedToken(null);
    }
    if (onCellClick) onCellClick(row, col);
  }, [isDM, activeTerrain, showFogTool, selectedToken, onMoveToken, onCellClick]);

  const handleTokenClick = (tokenId) => {
    if (isDM || tokens.find((t) => t.id === tokenId)?.type === 'player') {
      setSelectedToken(selectedToken === tokenId ? null : tokenId);
    }
  };

  return (
    <div className="battle-map-container">
      {/* DM Toolbar */}
      {isDM && (
        <div className="battle-map-toolbar">
          <span className="text-gold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>🗺️ Harita Araçları:</span>
          <div className="flex gap-sm flex-wrap">
            {Object.entries(TERRAIN_TYPES).map(([key, val]) => (
              <button
                key={key}
                className={`btn btn-sm ${activeTerrain === key ? 'btn-gold' : 'btn-ghost'}`}
                onClick={() => { setActiveTerrain(activeTerrain === key ? null : key); setShowFogTool(false); }}
                title={key}
              >
                {val.label}
              </button>
            ))}
            <button
              className={`btn btn-sm ${showFogTool ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => { setShowFogTool(!showFogTool); setActiveTerrain(null); }}
            >
              🌫️ Sis
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setGrid(createEmptyGrid())}>
              🔄 Sıfırla
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setFogOfWar(createEmptyFog())}>
              👁 Sisi Kaldır
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="battle-map-grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)` }}>
        {Array.from({ length: GRID_SIZE }).map((_, row) =>
          Array.from({ length: GRID_SIZE }).map((_, col) => {
            const terrain = grid[row][col];
            const token = tokens.find((t) => t.row === row && t.col === col);
            const isFogged = fogOfWar[row][col] && !isDM;
            const isSelected = token && selectedToken === token.id;

            return (
              <div
                key={`${row}-${col}`}
                className={`battle-map-cell ${isSelected ? 'battle-map-cell--selected' : ''} ${isFogged ? 'battle-map-cell--fogged' : ''}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: terrain ? TERRAIN_TYPES[terrain]?.color : 'var(--darker-bg)',
                  cursor: (isDM || selectedToken) ? 'pointer' : 'default',
                }}
                onClick={() => handleCellClick(row, col)}
              >
                {/* Fog overlay for DM */}
                {fogOfWar[row][col] && isDM && (
                  <div className="battle-map-fog-dm" />
                )}
                {/* Token */}
                {token && !isFogged && (
                  <div
                    className={`battle-map-token ${token.type === 'monster' ? 'battle-map-token--monster' : 'battle-map-token--player'}`}
                    style={{ borderColor: token.color }}
                    onClick={(e) => { e.stopPropagation(); handleTokenClick(token.id); }}
                    title={`${token.name}${token.char ? ` (${token.char})` : ''}`}
                  >
                    <span className="battle-map-token__icon">{token.icon}</span>
                    {token.type === 'monster' && token.health != null && (
                      <div className="battle-map-token__hp">
                        <div
                          className="battle-map-token__hp-fill"
                          style={{ width: `${(token.health / token.maxHealth) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="battle-map-legend">
        {tokens.filter((t) => t.type === 'player').map((t) => (
          <span key={t.id} className="battle-map-legend__item">
            <span style={{ color: t.color }}>●</span> {t.name}
          </span>
        ))}
        {tokens.filter((t) => t.type === 'monster').map((t) => (
          <span key={t.id} className="battle-map-legend__item">
            {t.icon} {t.name} ({t.health}HP)
          </span>
        ))}
      </div>

      {selectedToken && (
        <div className="text-gold text-sm text-center mt-sm">
          🎯 Taşımak için bir hücreye tıklayın
        </div>
      )}
    </div>
  );
}

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function createEmptyFog() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
}

const PLAYER_COLORS = ['#4a9eff', '#4aff6a', '#ffd84a', '#ff4a8a', '#b84aff', '#4affef'];

function getClassIcon(className) {
  switch (className?.toLowerCase()) {
    case 'warrior': case 'savaşçı': return '⚔️';
    case 'mage': case 'büyücü': return '🔮';
    case 'ranger': case 'okçu': return '🏹';
    case 'healer': case 'şifacı': return '💚';
    case 'rogue': case 'hırsız': return '🗡️';
    case 'paladin': return '🛡️';
    default: return '👤';
  }
}
