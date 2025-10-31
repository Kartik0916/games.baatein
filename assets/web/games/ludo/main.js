import { Ludo } from './ludo/Ludo.js';
import { UI } from './ludo/UI.js';

// Server URL
const WS_URL = window.WEBSOCKET_URL || 'https://games-baatein-backend.onrender.com';

// Create game instance (UI only; server is authoritative)
const ludo = new Ludo();

// DOM elements for lobby
const lobby = document.getElementById('lobby');
const waitingMsg = document.getElementById('waitingMsg');
const gameContainer = document.getElementById('gameContainer');
const inputRoom = document.getElementById('roomCodeInput');
const btnCreate = document.getElementById('createRoomBtn');
const btnJoin = document.getElementById('joinRoomBtn');
const btnReady = document.getElementById('readyBtn');
const roomCodeEl = document.getElementById('roomCode');
const youNameEl = document.getElementById('youName');

// Local session identity
let socket;
let user = null;
let roomId = null;
let isLive = false; // becomes true after ludoGameStart

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
  socket = io(WS_URL, { transports: ['websocket','polling'] });

  socket.on('connect', () => {
    socket.emit('authenticate', user);
  });

  // Lobby events
  socket.on('ludoRoomCreated', (payload) => {
    roomId = payload?.roomId; roomCodeEl.textContent = roomId || '-';
    waitingMsg.style.display = 'block';
    btnReady.disabled = false;
    try { UI.disableDice(); } catch(e) { document.getElementById('dice-btn').disabled = true; }
  });

  socket.on('ludoRoomJoined', (payload) => {
    roomId = payload?.roomId; roomCodeEl.textContent = roomId || '-';
    waitingMsg.style.display = 'block';
    btnReady.disabled = false;
  });

  socket.on('ludoGameStart', (state) => {
    // Hide lobby, show board
    lobby.style.display = 'none';
    waitingMsg.style.display = 'none';
    gameContainer.style.display = 'block';
    isLive = true;
    applyState(state);
    try { UI.enableDice(); } catch(e) { document.getElementById('dice-btn').disabled = false; }
  });

  socket.on('ludoGameState', (state) => {
    applyState(state);
  });
}

// Apply authoritative state to UI
function applyState(state){
  if (!state) return;
  // Update dice display
  if (typeof state.diceValue === 'number') {
    ludo.diceValue = state.diceValue; // triggers UI.setDiceValue
  }
  // Update active player label
  try { document.querySelector('.active-player span').textContent = state.turn || 'P1'; } catch(e) {}

  // Update piece positions
  if (state.positions) {
    ['P1','P2'].forEach(player => {
      const arr = state.positions[player] || [];
      [0,1,2,3].forEach(piece => {
        const pos = arr[piece];
        if (typeof pos === 'number') {
          ludo.setPiecePosition(player, piece, pos);
        }
      });
    });
  }
}

// Patch interactive actions to emit to server
const _onDiceClick = ludo.onDiceClick.bind(ludo);
ludo.onDiceClick = function(){
  if (!isLive || !roomId) return;
  socket.emit('ludoRollDice', { roomId });
};

const _handlePieceClick = ludo.handlePieceClick.bind(ludo);
ludo.handlePieceClick = function(player, piece){
  if (!isLive || !roomId) return;
  socket.emit('ludoMovePiece', { roomId, player, piece });
};

// Wire lobby buttons
btnCreate.addEventListener('click', () => {
  connect();
  socket.emit('ludoCreateRoom', ensureUser());
});

btnJoin.addEventListener('click', () => {
  connect();
  const rid = (inputRoom.value||'').trim();
  if (!rid) return;
  socket.emit('ludoJoinRoom', { roomId: rid, ...ensureUser() });
});

btnReady.addEventListener('click', () => {
  if (!roomId) return;
  socket.emit('ludoPlayerReady', { roomId });
  waitingMsg.textContent = 'Ready. Waiting for opponent…';
  btnReady.disabled = true;
});

// Initial UI state
try { UI.disableDice(); } catch(e) {}