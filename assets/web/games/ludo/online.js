import { Ludo } from './ludo/Ludo.js';
import { UI } from './ludo/UI.js';

// Backend URL
const WS_URL = window.WEBSOCKET_URL || 'https://games-baatein-backend.onrender.com';

// Minimal state
let socket;
let user = null;
let roomId = null;
let isReady = false;
let isConnected = false;
let isLive = false; // becomes true after gameStarted

// Elements
const statusEl = document.getElementById('status');
const roomCodeEl = document.getElementById('roomCode');
const youNameEl = document.getElementById('youName');
const roomInput = document.getElementById('roomCodeInput');
const btnCreate = document.getElementById('createRoomBtn');
const btnJoin = document.getElementById('joinRoomBtn');
const btnReady = document.getElementById('readyBtn');

// Create the game instance
const ludo = new Ludo();
// Disable gameplay until the game starts
try { UI.disableDice(); } catch(e) { try { document.getElementById('dice-btn').disabled = true; } catch(_) {} }

function setStatus(text){ statusEl.textContent = text; }

function ensureUser(){
  if (user) return user;
  try {
    const name = localStorage.getItem('bg_username') || `Player_${Math.random().toString(36).slice(2,6)}`;
    const avatar = localStorage.getItem('bg_avatar') || '😀';
    user = { userId: 'user_' + Math.random().toString(36).substr(2,9), username: name, avatar };
    youNameEl.textContent = `${avatar} ${name}`;
  } catch(e) {
    user = { userId: 'user_' + Math.random().toString(36).substr(2,9), username: 'Player', avatar: '😀' };
  }
  return user;
}

function connectSocket(){
  if (isConnected) return;
  ensureUser();
  socket = io(WS_URL, { transports: ['websocket','polling'] });
  socket.on('connect', () => {
    isConnected = true;
    setStatus('Connected. Authenticate...');
    socket.emit('authenticate', user);
  });
  socket.on('authenticated', () => setStatus('Authenticated.'));

  // Room events
  socket.on('roomCreated', (data) => {
    if (data?.room) {
      roomId = data.room.roomId;
      roomCodeEl.textContent = roomId;
      setStatus('Room created. Share code and press Ready when both joined.');
      btnReady.disabled = false;
      isLive = false;
      try { UI.disableDice(); } catch(e) {}
    }
  });
  socket.on('playerJoined', (data) => {
    setStatus(`${data?.player?.username || 'Player'} joined. Mark Ready.`);
  });
  socket.on('playerReadyUpdate', () => {
    // Server will start game when both ready
  });
  socket.on('gameStarted', () => {
    setStatus('Game started!');
    isLive = true;
    try { UI.enableDice(); } catch(e) { try { document.getElementById('dice-btn').disabled = false; } catch(_) {} }
  });

  // Ludo realtime: dice roll and moves
  socket.on('ludoRoll', (payload) => {
    const { fromUserId, value } = payload || {};
    if (!value) return;
    // Apply remote dice
    if (isLive) {
      ludo.diceValue = value;
      ludo.state = 1; // STATE.DICE_ROLLED
      ludo.checkForEligiblePieces();
    }
  });
  socket.on('ludoMove', (payload) => {
    const { player, piece, dice } = payload || {};
    if (!isLive) return;
    if (dice) ludo.diceValue = dice;
    ludo.state = 1; // STATE.DICE_ROLLED
    ludo.handlePieceClick(player, piece);
  });
}

// UI handlers
btnCreate.addEventListener('click', () => {
  connectSocket();
  socket.emit('createRoom', { ...ensureUser(), game: 'ludo' });
});

btnJoin.addEventListener('click', () => {
  connectSocket();
  const rid = (roomInput.value||'').trim();
  if (!rid) { setStatus('Enter room code'); return; }
  socket.emit('joinRoom', { roomId: rid, ...ensureUser() });
  roomId = rid; roomCodeEl.textContent = roomId;
});

btnReady.addEventListener('click', () => {
  if (!roomId) { setStatus('No room'); return; }
  isReady = true; btnReady.disabled = true; setStatus('Ready. Waiting for opponent...');
  socket.emit('playerReady', { roomId });
});

// Bridge Ludo actions to socket
// Patch dice click: after local dice is computed, broadcast value
const _onDiceClick = ludo.onDiceClick.bind(ludo);
ludo.onDiceClick = function(){
  if (!isLive) { setStatus('Waiting for game start...'); return; }
  _onDiceClick();
  if (socket && roomId && ludo.diceValue) {
    socket.emit('ludoRoll', { roomId, value: ludo.diceValue });
  }
};

// Patch piece click handler to broadcast chosen piece
const _handlePieceClick = ludo.handlePieceClick.bind(ludo);
ludo.handlePieceClick = function(player, piece){
  if (!isLive) { setStatus('Waiting for game start...'); return; }
  if (socket && roomId) {
    socket.emit('ludoMove', { roomId, player, piece, dice: ludo.diceValue });
  }
  _handlePieceClick(player, piece);
};

// Show username
ensureUser();


