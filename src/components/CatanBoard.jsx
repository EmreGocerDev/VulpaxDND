import React, { useMemo } from 'react';
import { useCatanStore } from '../stores/catanStore';
import { BOARD_TOPOLOGY, axialToPixel, getHexVertexIndices } from '../lib/catanHelpers';

const RESOURCE_COLORS = {
  wood: '#2d5a27',
  brick: '#b5451b',
  sheep: '#7ec850',
  wheat: '#e8c83a',
  ore: '#6b6b6b',
  desert: '#d4b06a',
};

const RESOURCE_EMOJI = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛏️',
  desert: '🏜️',
};

const PLAYER_COLORS_HEX = {
  red: '#e63946',
  blue: '#457b9d',
  green: '#2a9d8f',
  orange: '#e76f51',
};

const HEX_SIZE = 52;
const BOARD_CX = 420;
const BOARD_CY = 380;

function hexPoints(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export default function CatanBoard() {
  const {
    game, hexes, vertices, edges, players, myPlayer,
    buildMode, setBuildMode,
    buildRoad, buildSettlement, buildCity, moveRobber,
  } = useCatanStore();

  // Vertex pixel pozisyonları - topology'den hesaplanmış (deterministic)
  const vertexPositions = useMemo(() => {
    const positions = {};
    for (let i = 0; i < BOARD_TOPOLOGY.vertexPositions.length; i++) {
      const vp = BOARD_TOPOLOGY.vertexPositions[i];
      positions[i] = { x: vp.x + BOARD_CX, y: vp.y + BOARD_CY };
    }
    return positions;
  }, []);

  const isMyTurn = game?.current_turn_user_id === myPlayer?.user_id;
  const isSetup = game?.phase === 'setup1' || game?.phase === 'setup2';

  const handleVertexClick = (vertexIndex) => {
    if (!isMyTurn) return;
    const vertex = vertices.find(v => v.vertex_index === vertexIndex);
    if (!vertex) return;

    if (buildMode === 'city' || (vertex.building_type === 'settlement' && vertex.owner_user_id === myPlayer?.user_id)) {
      buildCity(vertexIndex);
    } else if (buildMode === 'settlement' || isSetup) {
      buildSettlement(vertexIndex);
    }
  };

  const handleEdgeClick = (edgeIndex) => {
    if (!isMyTurn) return;
    if (buildMode === 'road' || isSetup) {
      buildRoad(edgeIndex);
    }
  };

  const handleHexClick = (hexIndex) => {
    if (buildMode !== 'robber') return;
    const hex = hexes.find(h => h.hex_index === hexIndex);
    if (!hex) return;

    // Komşu vertex'lerde rakip var mı?
    const hexVerts = getHexVertexIndices(hexIndex);
    const neighbors = vertices
      .filter(v => hexVerts.includes(v.vertex_index) && v.owner_user_id && v.owner_user_id !== myPlayer?.user_id)
      .map(v => v.owner_user_id);
    const uniqueNeighbors = [...new Set(neighbors)];

    if (uniqueNeighbors.length > 0) {
      moveRobber(hexIndex, uniqueNeighbors[0]);
    } else {
      moveRobber(hexIndex, null);
    }
  };

  if (!hexes.length) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 840 760" style={{ width: '100%', height: '100%' }}>
        {/* Okyanus */}
        <rect width="840" height="760" fill="#1a5276" rx="16" />

        {/* Hexler */}
        {hexes.map((hex) => {
          const { x: rx, y: ry } = axialToPixel(hex.q, hex.r);
          const x = rx + BOARD_CX;
          const y = ry + BOARD_CY;
          return (
            <g key={hex.hex_index} onClick={() => handleHexClick(hex.hex_index)}
              style={{ cursor: buildMode === 'robber' ? 'crosshair' : 'default' }}>
              <polygon
                points={hexPoints(x, y)}
                fill={RESOURCE_COLORS[hex.resource_type]}
                stroke="#2c1810"
                strokeWidth="2"
                opacity={hex.has_robber ? 0.5 : 1}
              />
              <text x={x} y={y - 8} textAnchor="middle" fontSize="20"
                style={{ pointerEvents: 'none' }}>
                {RESOURCE_EMOJI[hex.resource_type]}
              </text>
              {hex.dice_number && (
                <>
                  <circle cx={x} cy={y + 14} r="14" fill="#fdf5e6" stroke="#2c1810" strokeWidth="1.5" />
                  <text
                    x={x} y={y + 19}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill={hex.dice_number === 6 || hex.dice_number === 8 ? '#e63946' : '#2c1810'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {hex.dice_number}
                  </text>
                </>
              )}
              {hex.has_robber && (
                <text x={x} y={y + 35} textAnchor="middle" fontSize="24"
                  style={{ pointerEvents: 'none' }}>
                  🥷
                </text>
              )}
            </g>
          );
        })}

        {/* Yollar (Edge'ler) */}
        {edges.map((edge) => {
          const posA = vertexPositions[edge.vertex_a];
          const posB = vertexPositions[edge.vertex_b];
          if (!posA || !posB) return null;

          const ownerPlayer = edge.has_road ? players.find(p => p.user_id === edge.owner_user_id) : null;
          const canClick = (buildMode === 'road' || isSetup) && !edge.has_road && isMyTurn;

          return (
            <line
              key={edge.edge_index}
              x1={posA.x} y1={posA.y}
              x2={posB.x} y2={posB.y}
              stroke={ownerPlayer ? PLAYER_COLORS_HEX[ownerPlayer.player_color] : 'rgba(255,255,255,0.12)'}
              strokeWidth={edge.has_road ? 6 : canClick ? 4 : 2}
              strokeLinecap="round"
              style={{
                cursor: canClick ? 'pointer' : 'default',
                transition: 'stroke 0.2s, stroke-width 0.2s',
              }}
              onClick={() => handleEdgeClick(edge.edge_index)}
              onMouseEnter={canClick ? (e) => { e.target.setAttribute('stroke', 'rgba(255,255,255,0.5)'); e.target.setAttribute('stroke-width', '5'); } : undefined}
              onMouseLeave={canClick ? (e) => { e.target.setAttribute('stroke', 'rgba(255,255,255,0.12)'); e.target.setAttribute('stroke-width', '4'); } : undefined}
            />
          );
        })}

        {/* Vertex'ler (Yerleşim/Şehir) */}
        {vertices.map((vertex) => {
          const pos = vertexPositions[vertex.vertex_index];
          if (!pos) return null;

          const ownerPlayer = vertex.owner_user_id ? players.find(p => p.user_id === vertex.owner_user_id) : null;
          const color = ownerPlayer ? PLAYER_COLORS_HEX[ownerPlayer.player_color] : null;
          const canClick = (buildMode === 'settlement' || buildMode === 'city' || isSetup) && isMyTurn;

          return (
            <g
              key={vertex.vertex_index}
              onClick={() => handleVertexClick(vertex.vertex_index)}
              style={{ cursor: canClick ? 'pointer' : 'default' }}
            >
              {vertex.building_type === 'city' ? (
                <>
                  <rect
                    x={pos.x - 10} y={pos.y - 10}
                    width="20" height="20"
                    fill={color} stroke="#fdf5e6" strokeWidth="2" rx="3"
                  />
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="12"
                    fill="white" style={{ pointerEvents: 'none' }}>
                    🏰
                  </text>
                </>
              ) : vertex.building_type === 'settlement' ? (
                <>
                  <circle cx={pos.x} cy={pos.y} r="9"
                    fill={color} stroke="#fdf5e6" strokeWidth="2" />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10"
                    fill="white" style={{ pointerEvents: 'none' }}>
                    🏠
                  </text>
                </>
              ) : (
                <circle
                  cx={pos.x} cy={pos.y} r="5"
                  fill={canClick ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
              )}
            </g>
          );
        })}

        {/* Build mode bilgisi */}
        {buildMode && (
          <text x="420" y="30" textAnchor="middle" fontSize="14" fill="#e8c83a"
            fontWeight="bold" style={{ pointerEvents: 'none' }}>
            {buildMode === 'road' && '🛤️ Yol yerleştirmek için bir kenara tıkla'}
            {buildMode === 'settlement' && '🏠 Yerleşim yerleştirmek için bir köşeye tıkla'}
            {buildMode === 'city' && '🏰 Şehre yükseltmek için yerleşime tıkla'}
            {buildMode === 'robber' && '🥷 Hırsızı taşımak için bir hex\'e tıkla'}
          </text>
        )}
        {isSetup && !buildMode && (
          <text x="420" y="30" textAnchor="middle" fontSize="14" fill="#e8c83a"
            fontWeight="bold" style={{ pointerEvents: 'none' }}>
            📍 Yerleşim yerleştir, sonra bağlı bir yol yerleştir
          </text>
        )}
      </svg>

      {/* Build Mode iptal butonu */}
      {buildMode && !isSetup && (
        <button
          onClick={() => setBuildMode(null)}
          style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 'bold',
            background: 'rgba(230,57,70,0.9)', color: 'white',
            border: '1px solid #e63946', cursor: 'pointer',
          }}
        >
          ✕ İptal
        </button>
      )}
    </div>
  );
}

