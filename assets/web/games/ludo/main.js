import { Ludo } from './ludo/Ludo.js';
import { UI } from './ludo/UI.js';

// Server URL
const WS_URL = window.LUDO_SERVER_URL || window.WEBSOCKET_URL || 'https://games-baatein-backend.onrender.com';

// Create game instance (UI only; server is authoritative)
const ludo = new Ludo();

// DOM elements for lobby
const lobbyScreen = document.getElementById('lobby-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameBoard = document.getElementById('game-board');
const inputRoom = document.getElementById('roomCodeInput');
const btnCreate = document.getElementById('createRoomBtn');
const btnJoin = document.getElementById('joinRoomBtn');
const btnReady = document.getElementById('readyBtn');
const roomCodeEl = document.getElementById('roomCode');
const youNameEl = document.getElementById('youName');
const statusEl = document.getElementById('status');

// Local session identity
let socket;
let user = null;
let roomId = null;
let myColor = null; // CRITICAL: Track which color this player is
let isLive = false;
let isConnected = false;

function ensureUser(){
  if (user) return user;
  try {
    const name = localStorage.getItem('bg_username') || `Player_${Math.random().toString(36).slice(2,6)}`;
    const avatar = localStorage.getItem('bg_avatar') || '😀';
    user = { userId: 'user_' + Math.random().toString(36).substr(2,9), username: name, avatar };
    if (youNameEl) youNameEl.textContent = `${avatar} ${name}`;
  } catch(e) {
    user = { userId: 'user_' + Math.random().toString(36).substr(2,9), username: 'Player', avatar: '😀' };
  }
  return user;
}

function connect(){
  if (socket && socket.connected) return;
  ensureUser();
  socket = io(WS_URL, {
    transports: ['polling', 'websocket'],
    upgrade: true,
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    withCredentials: false
  });

  socket.on('connect', () => {
    console.log('🔌 Connected to server');
    socket.emit('authenticate', user);
    isConnected = true;
    if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  });

  socket.on('connect_error', (err) => {
    if (!socket.connected) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = `Connection error: ${err?.message||err}`;
      }
    }
  });

  // Room created
  socket.on('roomID', (id) => {
    roomId = id;
    roomCodeEl.textContent = id || '-';
    lobbyScreen.style.display = 'flex';
    waitingScreen.style.display = 'block';
    btnReady.disabled = false;
    console.log('📦 Room created:', id);
  });

  // Game starts - CRITICAL: Get my color assignment
  socket.on('gameStart', (payload) => {
    console.log('🎮 Game started, payload:', payload);
    const state = payload?.state || payload;
    
    // CRITICAL: Determine my color from server state
    if (state.players) {
      if (state.players.P1?.userId === user.userId) {
        myColor = 'P1';
      } else if (state.players.P2?.userId === user.userId) {
        myColor = 'P2';
      }
    }
    
    console.log('🎨 My color is:', myColor);
    
    lobbyScreen.style.display = 'none';
    waitingScreen.style.display = 'none';
    gameBoard.style.display = 'block';
    isLive = true;
    
    // Apply initial state from server
    applyState(state);
    
    // Only enable dice if it's my turn
    updateDiceButton(state);
  });

  // State updates from server
  socket.on('gameStateUpdate', (state) => {
    console.log('📡 State update:', state);
    applyState(state);
    updateDiceButton(state);
  });
}

// Apply authoritative state to UI - FIXED VERSION
function applyState(state){
  if (!state) return;
  
  console.log('🔄 Applying state:', state);
  
  // Update dice display
  if (typeof state.diceValue === 'number' && state.diceValue > 0) {
    ludo.diceValue = state.diceValue;
    try { UI.setDiceValue(state.diceValue); } catch(e) { console.error(e); }
  } else {
    try { UI.setDiceValue(''); } catch(e) {}
  }
  
  // Update active player label
  try { 
    const turnLabel = state.turn || 'P1';
    const isMyTurn = (myColor === turnLabel);
    document.querySelector('.active-player span').textContent = isMyTurn ? 'Your Turn' : `${turnLabel}'s Turn`;
  } catch(e) {}

  // Update piece positions - CRITICAL: Use server positions directly
  if (state.positions) {
    ['P1','P2'].forEach(player => {
      const arr = state.positions[player] || [];
      [0,1,2,3].forEach(piece => {
        const pos = arr[piece];
        if (typeof pos === 'number') {
          // Update local game state to match server
          ludo.currentPositions[player][piece] = pos;
          // Update UI
          ludo.setPiecePosition(player, piece, pos);
        }
      });
    });
  }

  // Highlight valid moves ONLY for me when it's my turn
  try { UI.unhighlightPieces(); } catch(e) {}
  
  const isMyTurn = (myColor && state.turn === myColor);
  
  if (isMyTurn && Array.isArray(state.validMoves) && state.validMoves.length > 0) {
    console.log('✨ Highlighting my pieces:', state.validMoves);
    try { UI.highlightPieces(myColor, state.validMoves); } catch(e) { console.error(e); }
  }
}

// Update dice button state
function updateDiceButton(state) {
  const diceBtn = document.getElementById('dice-btn');
  if (!diceBtn) return;
  
  const isMyTurn = (myColor && state.turn === myColor);
  const canRoll = isMyTurn && (!state.diceValue || state.diceValue === 0);
  
  diceBtn.disabled = !canRoll;
  
  if (canRoll) {
    try { UI.enableDice(); } catch(e) {}
  } else {
    try { UI.disableDice(); } catch(e) {}
  }
}

// Patch dice click - SEND TO SERVER, DON'T ROLL LOCALLY
const _onDiceClick = ludo.onDiceClick.bind(ludo);
ludo.onDiceClick = function(){
  if (!isLive || !roomId) {
    console.log('⚠️ Cannot roll: game not live or no room');
    return;
  }
  
  if (!myColor) {
    console.log('⚠️ Cannot roll: color not assigned');
    return;
  }
  
  console.log('🎲 Requesting dice roll for', myColor);
  
  // CRITICAL: Don't roll locally - ask server
  socket.emit('rollDice', { roomId });
  
  // Disable dice button immediately
  try { UI.disableDice(); } catch(e) {}
};

// Patch piece click - SEND TO SERVER
const _handlePieceClick = ludo.handlePieceClick.bind(ludo);
ludo.handlePieceClick = function(player, piece){
  if (!isLive || !roomId) {
    console.log('⚠️ Cannot move: game not live or no room');
    return;
  }
  
  // CRITICAL: Only allow moving my own pieces
  if (player !== myColor) {
    console.log('⚠️ Cannot move opponent pieces');
    return;
  }
  
  console.log('🎯 Moving piece:', player, piece);
  
  // Send move to server
  socket.emit('movePiece', { 
    roomId,
    pieceIndex: parseInt(piece), 
    player 
  });
};

// Wire lobby buttons
btnCreate.addEventListener('click', () => {
  connect();
  const emitCreate = () => socket.emit('createGame');
  if (isConnected) emitCreate(); else socket.once('connect', emitCreate);
});

btnJoin.addEventListener('click', () => {
  connect();
  const rid = (inputRoom.value||'').trim();
  if (!rid) return;
  const emitJoin = () => socket.emit('joinGame', rid);
  if (isConnected) emitJoin(); else socket.once('connect', emitJoin);
});

btnReady.addEventListener('click', () => {
  if (!roomId) return;
  const emitReady = () => socket.emit('playerReady');
  if (isConnected) emitReady(); else socket.once('connect', emitReady);
  waitingScreen.textContent = 'Ready. Waiting for opponent…';
  btnReady.disabled = true;
});

// Initial UI state
try { UI.disableDice(); } catch(e) {}
console.log('🎮 Ludo client initialized');