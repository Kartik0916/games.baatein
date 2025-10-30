// Ludo engine: pure functions for initializing and updating game state
// No side-effects or IO; suitable for unit testing and deterministic behavior

const C = require('./constants');

// Types (informal):
// Token = { id: string, posType: 'home'|'track'|'lane'|'goal', index: number|null }
// Player = { userId, username, color: 'red'|'blue', tokens: Token[], consecutiveSixes: number }
// State = {
//   trackLength: number,
//   safeTiles: number[],
//   startIndexByColor: Record<color, number>,
//   laneEntryIndex: Record<color, number>,
//   laneLength: number,
//   players: Player[],
//   currentTurnUserId: string,
//   lastRoll: number|null,
//   diceHistory: number[],
//   winner: string|null,
// }

function initializeLudoState(playersInput) {
  const players = playersInput.map(p => ({
    userId: p.userId,
    username: p.username,
    color: p.color,
    consecutiveSixes: 0,
    tokens: Array.from({ length: C.TOKENS_PER_PLAYER }).map((_, i) => ({
      id: `${p.userId}_t${i}`,
      posType: 'home',
      index: null
    }))
  }));

  return {
    trackLength: C.TRACK_LENGTH,
    safeTiles: C.SAFE_TILES.slice(),
    startIndexByColor: { ...C.START_INDEX_BY_COLOR },
    laneEntryIndex: { ...C.LANE_ENTRY_INDEX },
    laneLength: C.LANE_LENGTH,
    players,
    currentTurnUserId: players[0]?.userId || null,
    lastRoll: null,
    diceHistory: [],
    winner: null
  };
}

function rollDice(state, player) {
  assertTurn(state, player.userId);
  const value = 1 + Math.floor(Math.random() * 6);
  const next = clone(state);
  next.lastRoll = value;
  next.diceHistory = state.diceHistory.concat(value);
  const p = getPlayer(next, player.userId);
  p.consecutiveSixes = value === 6 ? (p.consecutiveSixes + 1) : 0;
  return { state: next, value };
}

function getMovableTokens(state, player, die) {
  const p = getPlayer(state, player.userId);
  const tokens = p.tokens;
  const startIndex = state.startIndexByColor[p.color];
  const laneEntry = state.laneEntryIndex[p.color];
  const result = [];

  // If die is 6, can spawn from home to start
  if (die === 6) {
    const homeTokens = tokens.filter(t => t.posType === 'home');
    if (homeTokens.length > 0) {
      result.push({ tokenId: homeTokens[0].id, move: 'spawn', to: { posType: 'track', index: startIndex } });
    }
  }

  for (const t of tokens) {
    if (t.posType === 'track') {
      const destTrackIndex = (t.index + die) % state.trackLength;
      // If crossing lane entry exactly to enter lane
      if (willEnterLane(t.index, die, laneEntry, state.trackLength)) {
        const stepsIntoLane = stepsAfterLaneEntry(t.index, die, laneEntry, state.trackLength);
        if (stepsIntoLane <= state.laneLength) {
          result.push({ tokenId: t.id, move: 'toLane', to: { posType: 'lane', index: stepsIntoLane - 1 } });
        }
      } else {
        result.push({ tokenId: t.id, move: 'advance', to: { posType: 'track', index: destTrackIndex } });
      }
    } else if (t.posType === 'lane') {
      const newLaneIndex = t.index + die;
      if (newLaneIndex < state.laneLength) {
        result.push({ tokenId: t.id, move: 'laneAdvance', to: { posType: 'lane', index: newLaneIndex } });
      } else if (newLaneIndex === state.laneLength) {
        result.push({ tokenId: t.id, move: 'goal', to: { posType: 'goal', index: null } });
      }
    }
  }
  return result;
}

function applyMove(state, player, tokenId, die) {
  assertTurn(state, player.userId);
  const next = clone(state);
  const p = getPlayer(next, player.userId);
  const token = p.tokens.find(t => t.id === tokenId);
  if (!token) throw new Error('Token not found');

  const legal = getMovableTokens(next, player, die).find(m => m.tokenId === tokenId);
  if (!legal) throw new Error('Illegal move');

  const from = { posType: token.posType, index: token.index };
  token.posType = legal.to.posType;
  token.index = legal.to.index;

  let captured = null;
  if (token.posType === 'track') {
    captured = captureIfApplicable(next, player, token.index);
  }

  // Win check
  if (p.tokens.every(t => t.posType === 'goal')) {
    next.winner = player.userId;
  }

  // Advance turn rules
  const rolledSix = die === 6;
  const pRef = getPlayer(next, player.userId);
  if (rolledSix && pRef.consecutiveSixes < C.MAX_CONSECUTIVE_SIXES) {
    // player keeps turn
  } else {
    // if exceeded three 6s -> forfeited, reset counter and pass turn
    if (pRef.consecutiveSixes >= C.MAX_CONSECUTIVE_SIXES) pRef.consecutiveSixes = 0;
    passTurn(next);
  }

  return { state: next, from, to: { posType: token.posType, index: token.index }, captured };
}

// Helpers
function willEnterLane(currentIndex, die, laneEntryIndex, trackLength) {
  // count steps; if we pass the laneEntryIndex crossing boundary -> enter lane
  for (let s = 1; s <= die; s++) {
    const idx = (currentIndex + s) % trackLength;
    if (idx === (laneEntryIndex + 1) % trackLength) {
      // Next after lane entry; we enter lane with remaining steps
      return true;
    }
  }
  return false;
}

function stepsAfterLaneEntry(currentIndex, die, laneEntryIndex, trackLength) {
  let steps = 0;
  for (let s = 1; s <= die; s++) {
    const idx = (currentIndex + s) % trackLength;
    if (idx === (laneEntryIndex + 1) % trackLength) {
      steps = die - s + 1; // remaining step enters lane as 1st lane cell
      break;
    }
  }
  return steps;
}

function captureIfApplicable(state, moverPlayer, destTrackIndex) {
  if (state.safeTiles.includes(destTrackIndex)) return null;
  const opponent = state.players.find(pl => pl.userId !== moverPlayer.userId);
  if (!opponent) return null;
  const victim = opponent.tokens.find(t => t.posType === 'track' && t.index === destTrackIndex);
  if (!victim) return null;
  victim.posType = 'home';
  victim.index = null;
  return { userId: opponent.userId, tokenId: victim.id };
}

function passTurn(state) {
  if (state.players.length < 2) return;
  const idx = state.players.findIndex(p => p.userId === state.currentTurnUserId);
  const nextIdx = (idx + 1) % state.players.length;
  state.currentTurnUserId = state.players[nextIdx].userId;
}

function getPlayer(state, userId) {
  const p = state.players.find(p => p.userId === userId);
  if (!p) throw new Error('Player not found in state');
  return p;
}

function assertTurn(state, userId) {
  if (state.currentTurnUserId !== userId) {
    throw new Error('Not your turn');
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  initializeLudoState,
  rollDice,
  getMovableTokens,
  applyMove
};


