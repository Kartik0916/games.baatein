import { Ludo } from './ludo/Ludo.js';
import { UI } from './ludo/UI.js';

// Server URL
const WS_URL = window.LUDO_SERVER_URL || window.WEBSOCKET_URL || 'http://localhost:3000';

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
let isLive = false; // becomes true after ludoGameStart
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
    socket.emit('authenticate', user);
    isConnected = true;
    if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  });

  socket.on('connect_error', (err) => {
    // Show only if not connected/connecting
    if (!socket.connected) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = `Connection error: ${err?.message||err}`;
      }
    }
  });

  // Lobby events
  // New generic events for separate Ludo server
  socket.on('roomID', (id) => {
    roomId = id; roomCodeEl.textContent = id || '-';
    lobbyScreen.style.display = 'flex';
    waitingScreen.style.display = 'block';
    btnReady.disabled = false;
  });

  socket.on('gameStart', (payload) => {
    const state = payload?.state || payload;
    lobbyScreen.style.display = 'none';
    waitingScreen.style.display = 'none';
    gameBoard.style.display = 'block';
    isLive = true;
    applyState(state);
    try { UI.enableDice(); } catch(e) { document.getElementById('dice-btn').disabled = false; }
  });

  socket.on('gameStateUpdate', (state) => {
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
  socket.emit('rollDice');
};

const _handlePieceClick = ludo.handlePieceClick.bind(ludo);
ludo.handlePieceClick = function(player, piece){
  if (!isLive || !roomId) return;
  socket.emit('movePiece', { pieceIndex: piece, player });
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