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
const statusEl = document.getElementById('game-status');

// Local session identity
let socket;
let user = null;
let roomId = null;
let myColor = null; // CRITICAL: Track which color this player is
let isLive = false;
let isConnected = false;
let isAuthed = false;

// Local snapshot of latest server state
let gameState = {
  positions: { P1: [500,501,502,503], P2: [600,601,602,603] },
  turn: 'P1',
  diceValue: null
};

// Debug logging toggle
const DEBUG = !!window.DEBUG;
const dlog = (...args) => { if (DEBUG) console.log(...args); };

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
    dlog('🔌 Connected to server');
    socket.emit('authenticate', user);
    isConnected = true;
    if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  });

  socket.on('authenticated', () => {
    isAuthed = true;
    console.log('✅ Authenticated');
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

  // CRITICAL: Listen for color assignment
  socket.on('colorAssignment', (data) => {
    myColor = data.color;
    console.log('🎨 My color assigned:', myColor);
    
    // Update UI to show player's color
    if (youNameEl) {
      const displayColor = myColor === 'P1' ? 'Blue' : 'Green';
      youNameEl.textContent += ` (${displayColor})`;
    }
  });

  // Player joined notification
  socket.on('playerJoined', (data) => {
    console.log('👥 Player joined:', data);
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = `${data.playersCount}/2 players ready. Press Ready when ready!`;
    }
  });

  // Game starts
  socket.on('gameStart', (payload) => {
    dlog('🎮 Game started, payload:', payload);
    const state = payload?.state || payload;
    
    lobbyScreen.style.display = 'none';
    waitingScreen.style.display = 'none';
    gameBoard.style.display = 'block';
    gameBoard.classList.remove('hidden');
    isLive = true;
    if (statusEl) { statusEl.style.display = 'none'; }
    
    // Reset roll button text on start
    try { 
      const diceBtn = document.getElementById('dice-btn'); 
      if (diceBtn) diceBtn.textContent = 'Roll'; 
    } catch(e) {}
    
    // Apply initial state from server
    applyState(state);
    
    // Only enable dice if it's my turn
    updateDiceButton(state);
  });

  // State updates from server
  socket.on('gameStateUpdate', (state) => {
    dlog('📡 State update:', state);
    applyState(state);
    updateDiceButton(state);
    
    // Restore roll button label after server update
    try { 
      const diceBtn = document.getElementById('dice-btn'); 
      if (diceBtn && !diceBtn.disabled) diceBtn.textContent = 'Roll'; 
    } catch(e) {}
  });

  // Game over
  socket.on('gameOver', (data) => {
    isLive = false;
    alert(`Game Over! Winner: ${data.winner}`);
    // Optionally reset or show game over screen
  });

  // Error handling
  socket.on('error', (data) => {
    console.error('❌ Server error:', data.message);
    alert(data.message);
  });
}

// Apply authoritative state to UI
function applyState(state){
  if (!state) return;
  
  dlog('🔄 Applying state:', state);
  gameState = state;
  
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
    const turnText = isMyTurn ? 'Your Turn' : `${turnLabel}'s Turn`;
    document.querySelector('.active-player span').textContent = turnText;
  } catch(e) {}

  // Update piece positions - Use server positions directly
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
    dlog('✨ Highlighting my pieces:', state.validMoves);
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
    diceBtn.textContent = 'Roll';
  } else {
    try { UI.disableDice(); } catch(e) {}
    if (isMyTurn && state.diceValue > 0) {
      diceBtn.textContent = 'Move a piece';
    } else {
      diceBtn.textContent = "Opponent's turn";
    }
  }
}

// Patch dice click - SEND TO SERVER, DON'T ROLL LOCALLY
const _onDiceClick = ludo.onDiceClick.bind(ludo);
ludo.onDiceClick = function(){
  if (!isLive || !roomId) {
    dlog('⚠️ Cannot roll: game not live or no room');
    return;
  }
  
  if (!myColor) {
    dlog('⚠️ Cannot roll: color not assigned');
    alert('Your color is not assigned yet. Please wait.');
    return;
  }
  
  if (gameState.turn !== myColor) {
    dlog('⚠️ Cannot roll: not your turn');
    alert('Not your turn!');
    return;
  }
  
  dlog('🎲 Requesting dice roll for', myColor);
  
  // CRITICAL: Don't roll locally - ask server
  socket.emit('rollDice', { roomId });
  
  // Disable dice button immediately
  try { UI.disableDice(); } catch(e) {}
  try {
    const diceBtn = document.getElementById('dice-btn');
    if (diceBtn) { 
      diceBtn.disabled = true; 
      diceBtn.textContent = 'Rolling...'; 
    }
  } catch(e) {}
};

// Intercept piece click and forward to server
const _onPieceClick = ludo.onPieceClick.bind(ludo);
ludo.onPieceClick = function(event){
  if (!isLive || !roomId) {
    dlog('⚠️ Cannot move: game not live or no room');
    return;
  }

  const target = event.target;
  if (!target || !target.classList.contains('player-piece') || !target.classList.contains('highlight')) {
    return;
  }

  const player = target.getAttribute('player-id');
  const piece = parseInt(target.getAttribute('piece'));
  
  if (player !== myColor) {
    dlog('⚠️ Cannot move opponent pieces');
    alert('Cannot move opponent pieces!');
    return;
  }

  if (gameState.turn !== myColor) {
    dlog('⚠️ Not your turn');
    alert('Not your turn!');
    return;
  }

  // Verify this piece is in valid moves
  if (!gameState.validMoves || !gameState.validMoves.includes(piece)) {
    dlog('⚠️ Invalid piece selection');
    alert('This piece cannot move!');
    return;
  }

  dlog('🎯 Requesting move:', player, piece);
  socket.emit('movePiece', { roomId, pieceIndex: piece, player });
  
  // Unhighlight immediately for better UX
  try { UI.unhighlightPieces(); } catch(e) {}
};

// Wire lobby buttons
btnCreate.addEventListener('click', () => {
  connect();
  const emitCreate = () => socket.emit('createGame');
  if (isAuthed) emitCreate();
  else if (isConnected) socket.once('authenticated', emitCreate);
  else socket.once('connect', () => socket.once('authenticated', emitCreate));
});

btnJoin.addEventListener('click', () => {
  connect();
  const rid = (inputRoom.value||'').trim();
  if (!rid) {
    alert('Please enter a room code');
    return;
  }
  const emitJoin = () => socket.emit('joinGame', rid);
  if (isAuthed) emitJoin();
  else if (isConnected) socket.once('authenticated', emitJoin);
  else socket.once('connect', () => socket.once('authenticated', emitJoin));
});

btnReady.addEventListener('click', () => {
  if (!roomId) return;
  const emitReady = () => socket.emit('playerReady');
  if (isAuthed) emitReady();
  else if (isConnected) socket.once('authenticated', emitReady);
  else socket.once('connect', () => socket.once('authenticated', emitReady));
  waitingScreen.textContent = 'Ready. Waiting for opponent…';
  btnReady.disabled = true;
});

// Initial UI state
try { UI.disableDice(); } catch(e) {}
console.log('🎮 Ludo client initialized');