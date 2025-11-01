// api/index.js - Complete Working Backend
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS Configuration for Render deployment
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000", 
  "https://gamesbaatein-frontend.vercel.app",
  "https://gamesbaatein-frontend.vercel.app/",
  // Add your Vercel frontend URL here
  process.env.FRONTEND_URL || "https://gamesbaatein-frontend.vercel.app"
];

const io = socketIo(server, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: false
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowVercelPreview = /\.vercel\.app$/i.test(origin || '');
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*") || allowVercelPreview) {
      callback(null, true);
    } else {
      console.log(`🚫 Express CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["*"]
}));
app.use(express.json());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/baatein-games';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Baatein Tic Tac Toe Server',
    game: 'tic-tac-toe',
    timestamp: new Date().toISOString(),
    activeRooms: activeRooms.size,
    connectedUsers: userSockets.size
  });
});

// Additional health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Game Storage
const activeRooms = new Map();
const userSockets = new Map();
// ============================================
// LUDO GAME - SERVER AUTHORITATIVE
// Replace the Ludo section in api/index.js with this
// ============================================

// Ludo game state storage (server-authoritative)
const activeLudoGames = new Map(); // roomId -> game state

// Ludo constants matching client
const BASE_POSITIONS = { P1: [500,501,502,503], P2: [600,601,602,603] };
const START_POSITIONS = { P1: 0, P2: 26 };
const TURNING_POINTS = { P1: 50, P2: 24 };
const HOME_START = { P1: 100, P2: 200 };
const HOME_END = { P1: 105, P2: 205 };
const SAFE_POSITIONS = [0,8,13,21,26,34,39,47];

function createInitialLudoState(roomId) {
  return {
    roomId,
    status: 'waiting',
    players: {}, // { P1: {userId, username, socketId}, P2: {...} }
    readyPlayers: new Set(),
    positions: { 
      P1: [500, 501, 502, 503], // All pieces at base
      P2: [600, 601, 602, 603] 
    },
    diceValue: null,
    turn: 'P1', // P1 always starts
    validMoves: []
  };
}

function isBase(color, pos) {
  return BASE_POSITIONS[color] && BASE_POSITIONS[color].includes(pos);
}

function stepOnce(color, pos) {
  // Wrap around main track
  if (pos === 51) return 0;
  
  // Enter home track at turning point
  if (pos === TURNING_POINTS[color]) return HOME_START[color];
  
  // Progress in home track
  if (pos >= HOME_START[color] && pos < HOME_END[color]) return pos + 1;
  
  // Already at home end
  if (pos === HOME_END[color]) return pos;
  
  // Normal main track movement
  return pos + 1;
}

function getNextPosition(color, currentPos, steps) {
  if (typeof currentPos !== 'number' || typeof steps !== 'number') return null;
  if (steps <= 0) return null;
  
  // Can only leave base with a 6
  if (isBase(color, currentPos)) {
    if (steps !== 6) return null;
    return START_POSITIONS[color];
  }
  
  // Move step by step
  let pos = currentPos;
  for (let i = 0; i < steps; i++) {
    const next = stepOnce(color, pos);
    // If we are already at home end and cannot advance further, this move overshoots
    if (next === pos && pos === HOME_END[color]) {
      return null;
    }
    pos = next;
  }
  
  return pos;
}

function getValidMoves(state, color, diceValue) {
  const moves = [];
  const positions = state.positions[color];
  
  for (let i = 0; i < 4; i++) {
    const currentPos = positions[i];
    const nextPos = getNextPosition(color, currentPos, diceValue);
    
    if (nextPos !== null) {
      moves.push(i);
    }
  }
  
  return moves;
}

function performKillCheck(state, color, pieceIndex) {
  const currentPos = state.positions[color][pieceIndex];
  const opponent = color === 'P1' ? 'P2' : 'P1';
  
  // Can't kill on safe positions
  if (SAFE_POSITIONS.includes(currentPos)) return false;
  
  // Can't kill in home tracks
  if (currentPos >= 100) return false;
  
  let killed = false;
  
  // Check each opponent piece
  for (let i = 0; i < 4; i++) {
    const opponentPos = state.positions[opponent][i];
    
    // If opponent is at same position (and not safe)
    if (opponentPos === currentPos) {
      // Send opponent back to base
      state.positions[opponent][i] = BASE_POSITIONS[opponent][i];
      killed = true;
      console.log(`💀 ${color} killed ${opponent} piece ${i}`);
    }
  }
  
  return killed;
}

function switchTurn(state, gotSix, killedOpponent) {
  // Keep turn if rolled 6 or killed opponent
  if (gotSix || killedOpponent) {
    console.log(`🔄 ${state.turn} keeps turn (six: ${gotSix}, kill: ${killedOpponent})`);
    return;
  }
  
  // Otherwise switch turn
  state.turn = state.turn === 'P1' ? 'P2' : 'P1';
  console.log(`🔄 Turn switched to ${state.turn}`);
}

// --- Socket.IO connection scope ---
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Minimal auth so games can refer to socket.userId/username
  socket.on('authenticate', (data) => {
    try {
      const { userId, username, avatar } = data || {};
      socket.userId = userId || socket.id;
      socket.username = username || 'Player';
      socket.avatar = avatar || '😀';
      userSockets.set(socket.userId, socket.id);
      socket.emit('authenticated', { success: true, socketId: socket.id });
    } catch (e) {
      console.error('❌ Authentication error:', e);
      socket.emit('error', { message: 'Authentication failed' });
    }
  });

// Socket event: Create Ludo game
socket.on('createGame', () => {
  try {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomId = 'ludo_' + Math.random().toString(36).substr(2, 6);
    const state = createInitialLudoState(roomId);
    
    // CRITICAL: Assign creator as P1
    state.players.P1 = {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id
    };
    
    activeLudoGames.set(roomId, state);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.ludoColor = 'P1'; // Store player's color on socket
    
    socket.emit('roomID', roomId);
    socket.emit('colorAssignment', { color: 'P1' }); // Tell player their color
    console.log(`🎮 Ludo room ${roomId} created by ${socket.username} as P1`);
  } catch (e) {
    console.error('❌ createGame error:', e);
    socket.emit('error', { message: 'Failed to create game' });
  }
});

// Socket event: Join Ludo game
socket.on('joinGame', (roomId) => {
  try {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const state = activeLudoGames.get(roomId);
    
    if (!state) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (state.players.P2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    // CRITICAL: Assign joiner as P2
    state.players.P2 = {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id
    };
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.ludoColor = 'P2'; // Store player's color on socket
    
    // Notify both players with color assignments
    io.to(state.players.P1.socketId).emit('colorAssignment', { color: 'P1' });
    io.to(state.players.P2.socketId).emit('colorAssignment', { color: 'P2' });
    
    io.to(roomId).emit('roomID', roomId);
    io.to(roomId).emit('playerJoined', { 
      username: socket.username,
      playersCount: 2
    });
    
    console.log(`👥 ${socket.username} joined Ludo room ${roomId} as P2`);
  } catch (e) {
    console.error('❌ joinGame error:', e);
    socket.emit('error', { message: 'Failed to join game' });
  }
});

// Socket event: Player ready
socket.on('playerReady', () => {
  try {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomId = socket.roomId;
    if (!roomId) return;
    
    const state = activeLudoGames.get(roomId);
    if (!state) return;
    
    // Mark player as ready
    state.readyPlayers.add(socket.userId);
    
    console.log(`✅ ${socket.username} ready (${state.readyPlayers.size}/2)`);
    
    // Start game when both players ready
    if (state.readyPlayers.size >= 2) {
      state.status = 'active';
      state.turn = 'P1'; // P1 always starts
      
      // Send game start with full state
      const gameState = {
        status: state.status,
        players: state.players,
        positions: state.positions,
        turn: state.turn,
        diceValue: null,
        validMoves: []
      };
      
      io.to(roomId).emit('gameStart', { state: gameState });
      console.log(`🎮 Ludo game ${roomId} started! P1 turn first.`);
    }
  } catch (e) {
    console.error('❌ playerReady error:', e);
  }
});

// Socket event: Roll dice
socket.on('rollDice', (data) => {
  try {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomId = data?.roomId || socket.roomId;
    if (!roomId) return;
    
    const state = activeLudoGames.get(roomId);
    if (!state || state.status !== 'active') return;
    
    const playerColor = socket.ludoColor; // Get player's color from socket
    
    if (!playerColor) {
      console.log('❌ Player color not assigned');
      socket.emit('error', { message: 'Player color not assigned' });
      return;
    }
    
    // CRITICAL: Check if it's this player's turn
    if (state.turn !== playerColor) {
      console.log(`❌ Not ${playerColor}'s turn (current turn: ${state.turn})`);
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Roll dice (1-6)
    const roll = 1 + Math.floor(Math.random() * 6);
    state.diceValue = roll;
    
    // Calculate valid moves
    state.validMoves = getValidMoves(state, playerColor, roll);
    
    console.log(`🎲 ${playerColor} rolled ${roll}, valid moves:`, state.validMoves);
    
    // Send updated state to both players
    const gameState = {
      positions: state.positions,
      diceValue: state.diceValue,
      turn: state.turn,
      validMoves: state.validMoves,
      players: state.players
    };
    
    io.to(roomId).emit('gameStateUpdate', gameState);
    
    // If no valid moves, switch turn automatically
    if (state.validMoves.length === 0) {
      console.log(`❌ No valid moves for ${playerColor}`);
      setTimeout(() => {
        state.diceValue = null;
        state.validMoves = [];
        switchTurn(state, false, false);
        
        const newState = {
          positions: state.positions,
          diceValue: null,
          turn: state.turn,
          validMoves: [],
          players: state.players
        };
        
        io.to(roomId).emit('gameStateUpdate', newState);
      }, 1500);
    }
  } catch (e) {
    console.error('❌ rollDice error:', e);
  }
});

// Socket event: Move piece
socket.on('movePiece', (data) => {
  try {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomId = data?.roomId || socket.roomId;
    if (!roomId) return;
    
    const state = activeLudoGames.get(roomId);
    if (!state || state.status !== 'active') return;
    
    const pieceIndex = parseInt(data?.pieceIndex ?? data?.piece);
    if (isNaN(pieceIndex) || pieceIndex < 0 || pieceIndex > 3) return;
    
    const playerColor = socket.ludoColor; // Get player's color from socket
    
    if (!playerColor || state.turn !== playerColor) {
      console.log(`❌ Invalid move attempt by ${playerColor}`);
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Verify this piece can move
    if (!state.validMoves.includes(pieceIndex)) {
      console.log(`❌ Piece ${pieceIndex} cannot move`);
      socket.emit('error', { message: 'Invalid move' });
      return;
    }
    
    const currentPos = state.positions[playerColor][pieceIndex];
    const diceValue = state.diceValue;
    const nextPos = getNextPosition(playerColor, currentPos, diceValue);
    
    if (nextPos === null) {
      console.log(`❌ Cannot calculate next position`);
      return;
    }
    
    // Move the piece
    state.positions[playerColor][pieceIndex] = nextPos;
    console.log(`✅ Moved ${playerColor} piece ${pieceIndex} from ${currentPos} to ${nextPos}`);
    
    // Check for kills
    const killedOpponent = performKillCheck(state, playerColor, pieceIndex);
    
    // Check win condition: all pieces at home end
    const allHome = state.positions[playerColor].every(p => p === HOME_END[playerColor]);
    if (allHome) {
      state.status = 'finished';
      state.winner = playerColor;
      try {
        io.to(roomId).emit('gameOver', {
          winner: state.players[playerColor]?.username || playerColor,
          color: playerColor
        });
      } catch (_) {}
      activeLudoGames.delete(roomId);
      return;
    }

    // Check if rolled a 6
    const gotSix = (diceValue === 6);
    
    // Switch turn (or keep it if got 6 or killed)
    switchTurn(state, gotSix, killedOpponent);
    
    // Clear dice and valid moves
    state.diceValue = null;
    state.validMoves = [];
    
    // Send updated state
    const gameState = {
      positions: state.positions,
      diceValue: null,
      turn: state.turn,
      validMoves: [],
      players: state.players
    };
    
    io.to(roomId).emit('gameStateUpdate', gameState);
    
  } catch (e) {
    console.error('❌ movePiece error:', e);
  }
});

  // Chat Message
  socket.on('chatMessage', (data) => {
    const { roomId, message } = data;
    const room = activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    io.to(roomId).emit('chatMessage', {
      userId: player.userId,
      username: player.username,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Request Play Again
  socket.on('requestPlayAgain', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const requestingPlayer = room.players.find(p => p.socketId === socket.id);
      if (!requestingPlayer) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }

      // Initialize playAgainRequests array if it doesn't exist
      if (!room.playAgainRequests) {
        room.playAgainRequests = [];
      }

      // Add this player to the requests if not already present
      if (!room.playAgainRequests.includes(requestingPlayer.userId)) {
        room.playAgainRequests.push(requestingPlayer.userId);
      }

      // Notify the other player about the request
      const otherPlayer = room.players.find(p => p.socketId !== socket.id);
      if (otherPlayer) {
        io.to(otherPlayer.socketId).emit('playAgainRequested', {
          from: requestingPlayer.username,
          roomId: roomId
        });
        
        socket.emit('playAgainRequestSent', {
          message: 'Play again request sent to opponent'
        });
        
        // Check if both players already want to play again
        if (room.playAgainRequests.length >= 2) {
          // Both players want to play again - reset immediately
          resetGame(room);
        }
      } else {
        socket.emit('error', { message: 'No opponent found' });
      }
    } catch (error) {
      console.error('❌ Request play again error:', error);
      socket.emit('error', { message: 'Failed to request play again' });
    }
  });

  // Confirm Play Again
  socket.on('confirmPlayAgain', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const confirmingPlayer = room.players.find(p => p.socketId === socket.id);
      if (!confirmingPlayer) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }

      // Initialize playAgainRequests array if it doesn't exist
      if (!room.playAgainRequests) {
        room.playAgainRequests = [];
      }

      // Add this player to the requests if not already present
      if (!room.playAgainRequests.includes(confirmingPlayer.userId)) {
        room.playAgainRequests.push(confirmingPlayer.userId);
      }

      // Check if both players want to play again
      if (room.playAgainRequests.length >= 2) {
        // Both players confirmed - reset the game
        resetGame(room);
      } else {
        // Only one player confirmed so far
        socket.emit('playAgainConfirmed', {
          message: 'Waiting for opponent to confirm'
        });
        
        // Notify the other player that you've confirmed
        const otherPlayer = room.players.find(p => p.socketId !== socket.id);
        if (otherPlayer) {
          io.to(otherPlayer.socketId).emit('playAgainConfirmed', {
            message: `${confirmingPlayer.username} wants to play again. Click "Play Again" to confirm!`
          });
        }
      }
    } catch (error) {
      console.error('❌ Confirm play again error:', error);
      socket.emit('error', { message: 'Failed to confirm play again' });
    }
  });

  // Offer Draw
  socket.on('offerDraw', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const offeringPlayer = room.players.find(p => p.socketId === socket.id);
      if (!offeringPlayer) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }

      if (room.status !== 'active') {
        socket.emit('error', { message: 'Game is not active' });
        return;
      }

      // Notify the other player about draw offer
      const otherPlayer = room.players.find(p => p.socketId !== socket.id);
      if (otherPlayer) {
        io.to(otherPlayer.socketId).emit('drawOffered', {
          from: offeringPlayer.username,
          roomId: roomId
        });
        
        socket.emit('drawOfferSent', {
          message: 'Draw offer sent to opponent'
        });
      }
    } catch (error) {
      console.error('❌ Offer draw error:', error);
      socket.emit('error', { message: 'Failed to offer draw' });
    }
  });

  // Accept Draw
  socket.on('acceptDraw', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.status !== 'active') {
        socket.emit('error', { message: 'Game is not active' });
        return;
      }

      // End game as draw
      const acceptingPlayer = room.players.find(p => p.socketId === socket.id);
      const offeringPlayer = room.players.find(p => p.socketId !== socket.id);
      
      endGame(room, {
        gameOver: true,
        winner: 'draw',
        reason: 'draw_accepted'
      });

      // Notify both players
      io.to(room.roomId).emit('drawAccepted', {
        message: `${acceptingPlayer.username} accepted the draw offer`,
        reason: 'draw_accepted'
      });
      
      console.log(`🤝 Draw accepted in room ${roomId}`);
    } catch (error) {
      console.error('❌ Accept draw error:', error);
      socket.emit('error', { message: 'Failed to accept draw' });
    }
  });

  // Reject Draw
  socket.on('rejectDraw', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const rejectingPlayer = room.players.find(p => p.socketId === socket.id);
      const offeringPlayer = room.players.find(p => p.socketId !== socket.id);
      
      // Notify the offering player
      if (offeringPlayer) {
        io.to(offeringPlayer.socketId).emit('drawRejected', {
          message: `${rejectingPlayer.username} declined the draw offer`
        });
      }
      
      socket.emit('drawRejected', {
        message: 'Draw offer declined'
      });
      
      console.log(`❌ Draw rejected in room ${roomId}`);
    } catch (error) {
      console.error('❌ Reject draw error:', error);
      socket.emit('error', { message: 'Failed to reject draw' });
    }
  });

  // Resign
  socket.on('resign', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const resigningPlayer = room.players.find(p => p.socketId === socket.id);
      if (!resigningPlayer) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }

      if (room.status !== 'active') {
        socket.emit('error', { message: 'Game is not active' });
        return;
      }

      // Find opponent as winner
      const opponent = room.players.find(p => p.socketId !== socket.id);
      if (!opponent) {
        socket.emit('error', { message: 'Opponent not found' });
        return;
      }

      // End game with opponent as winner
      endGame(room, {
        gameOver: true,
        winner: opponent.userId,
        reason: 'resignation'
      });

      // Notify both players
      io.to(room.roomId).emit('playerResigned', {
        resignedPlayerId: resigningPlayer.userId,
        resignedPlayer: resigningPlayer.username,
        winner: opponent.userId,
        winnerName: opponent.username,
        reason: 'resignation'
      });
      
      console.log(`🏳️ Player ${resigningPlayer.username} resigned in room ${roomId}`);
    } catch (error) {
      console.error('❌ Resign error:', error);
      socket.emit('error', { message: 'Failed to resign' });
    }
  });

  // Leave Room
  socket.on('leaveRoom', () => {
    handlePlayerLeave(socket);
  });

  // Ping/Pong for connection health
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    handlePlayerLeave(socket);
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }

    // Cleanup any Ludo room this socket was part of
    try {
      for (const [roomId, state] of activeLudoGames.entries()) {
        const isP1 = state.players?.P1?.socketId === socket.id;
        const isP2 = state.players?.P2?.socketId === socket.id;
        if (isP1 || isP2) {
          // Notify opponent
          try {
            io.to(roomId).emit('opponentLeft', {
              message: 'Your opponent disconnected'
            });
          } catch (_) {}

          activeLudoGames.delete(roomId);
          break;
        }
      }
    } catch (e) {
      console.error('❌ Ludo cleanup on disconnect failed:', e);
    }
  });

}); // <--- end io.on('connection')

// Game Logic Functions
function processMove(room, move, player) {
  const position = typeof move === 'object' ? move.position : move;
  const state = room.gameState;
  
  if (position < 0 || position > 8) {
    return { valid: false, message: 'Invalid position' };
  }
  
  if (state.board[position] !== null) {
    return { valid: false, message: 'Position already occupied' };
  }

  const newBoard = [...state.board];
  newBoard[position] = player.symbol;
  
  const newMoves = [...state.moves, { position, player: player.userId, symbol: player.symbol }];
  
  const winnerResult = checkWinner(newBoard);
  const winnerSymbol = winnerResult ? winnerResult.symbol : null;
  const isDraw = !winnerSymbol && newBoard.every(cell => cell !== null);
  
  let winnerUserId = null;
  let winningLine = null;
  if (winnerSymbol) {
    const winningPlayer = room.players.find(p => p.symbol === winnerSymbol);
    winnerUserId = winningPlayer ? winningPlayer.userId : null;
    winningLine = winnerResult.line; // Get winning line indices
  }
  
  const newState = {
    board: newBoard,
    moves: newMoves,
    winner: winnerSymbol,
    isDraw: isDraw,
    gameOver: winnerSymbol !== null || isDraw,
    winningLine: winningLine // Include winning line in state
  };
  
  return {
    valid: true,
    newState: newState,
    gameOver: newState.gameOver,
    winner: winnerUserId || (isDraw ? 'draw' : null),
    winningLine: winningLine // Return winning line for animation
  };
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        symbol: board[a],
        line: line, // Return the winning line indices
        type: getLineType(line) // Return line type (row, column, diagonal)
      };
    }
  }
  return null;
}

function getLineType(line) {
  // Determine line type for animation
  const [a, b, c] = line;
  
  // Rows (horizontal)
  if ((a === 0 && b === 1 && c === 2) || 
      (a === 3 && b === 4 && c === 5) || 
      (a === 6 && b === 7 && c === 8)) {
    return 'row';
  }
  
  // Columns (vertical)
  if ((a === 0 && b === 3 && c === 6) || 
      (a === 1 && b === 4 && c === 7) || 
      (a === 2 && b === 5 && c === 8)) {
    return 'column';
  }
  
  // Diagonals
  return 'diagonal';
}

function sanitizeRoom(room) {
  return {
    roomId: room.roomId,
    players: room.players.map(p => ({ 
      userId: p.userId, 
      username: p.username, 
      avatar: p.avatar, 
      symbol: p.symbol,
      ready: p.ready 
    })),
    status: room.status,
    game: room.game || 'tic-tac-toe',
    gameState: room.gameState,
    currentTurn: room.currentTurn
  };
}

function startGame(room) {
  // Verify both players are ready and there are exactly 2 players
  if (room.players.length !== 2) {
    console.error(`❌ Cannot start game - need 2 players, got ${room.players.length}`);
    return;
  }
  
  const allReady = room.players.every(p => p.ready === true);
  if (!allReady) {
    console.error(`❌ Cannot start game - not all players ready`);
    console.log(`Players:`, room.players.map(p => ({ username: p.username, ready: p.ready })));
    return;
  }
  
  room.status = 'active';
  room.currentTurn = room.players[0].userId;
  room.startTime = new Date();
  room.winner = null;
  room.endTime = null;

  if (room.game === 'ludo') {
    console.log(`🎮 Ludo started in room ${room.roomId}`);
    io.to(room.roomId).emit('gameStarted', {
      game: 'ludo',
      currentTurn: room.currentTurn,
      players: room.players.map(p => ({ userId: p.userId, username: p.username, avatar: p.avatar }))
    });
    return;
  }

  // Tic Tac Toe default
  room.gameState = initializeGame();
  console.log(`🎮 Game started in room ${room.roomId} with board:`, room.gameState.board);

  io.to(room.roomId).emit('gameStarted', {
    game: 'tic-tac-toe',
    gameState: {
      board: [...room.gameState.board],
      moves: [],
      winner: null,
      isDraw: false,
      gameOver: false
    },
    currentTurn: room.currentTurn,
    players: room.players.map(p => ({ 
      userId: p.userId, 
      username: p.username, 
      avatar: p.avatar,
      symbol: p.symbol
    }))
  });
  console.log(`🎮 Tic Tac Toe started in room ${room.roomId}`);
}

function resetGame(room) {
  // Reset game state - ALWAYS create completely fresh empty game
  room.gameState = initializeGame();
  room.status = 'waiting';
  room.currentTurn = null;
  room.winner = null;
  room.startTime = null;
  room.endTime = null;
  room.playAgainRequests = []; // Reset play again requests
  
  // Reset all players to not ready
  room.players.forEach(player => {
    player.ready = false;
  });

  // Verify the board is actually empty
  const isEmpty = room.gameState.board.every(cell => cell === null);
  console.log(`🔄 Game reset in room ${room.roomId} - Board empty: ${isEmpty}`, room.gameState.board);

  // Notify both players that game is reset - send fresh empty board
  io.to(room.roomId).emit('gameReset', {
    room: {
      roomId: room.roomId,
      players: room.players.map(p => ({ 
        userId: p.userId, 
        username: p.username, 
        avatar: p.avatar, 
        symbol: p.symbol,
        ready: false // Always false after reset
      })),
      status: 'waiting',
      gameState: {
        board: Array(9).fill(null), // ALWAYS send fresh empty board
        moves: [],
        winner: null,
        isDraw: false,
        gameOver: false
      },
      currentTurn: null
    },
    message: 'Game reset! Both players need to mark ready to start again.'
  });

  console.log(`🔄 Game reset in room ${room.roomId} - All players unready`);
}

function getNextPlayer(room, currentUserId) {
  const currentIndex = room.players.findIndex(p => p.userId === currentUserId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  return room.players[nextIndex].userId;
}

function endGame(room, result) {
  room.status = 'finished';
  room.endTime = new Date();
  room.winner = result.winner;
  room.gameState.gameOver = true;
  room.gameState.winner = result.winner;

  io.to(room.roomId).emit('gameOver', {
    winner: result.winner,
    reason: result.reason || 'normal',
    gameState: room.gameState,
    winningLine: result.winningLine || room.gameState.winningLine || null, // Include winning line
    duration: room.startTime ? Math.floor((room.endTime - room.startTime) / 1000) : 0
  });

  setTimeout(() => {
    activeRooms.delete(room.roomId);
    console.log(`🗑️ Room ${room.roomId} cleaned up`);
  }, 120000);
}

function handlePlayerLeave(socket) {
  if (socket.roomId) {
    const room = activeRooms.get(socket.roomId);
    if (room) {
      const leavingPlayer = room.players.find(p => p.socketId === socket.id);
      
      if (room.status === 'active') {
        const opponent = room.players.find(p => p.socketId !== socket.id);
        if (opponent) {
          endGame(room, {
            gameOver: true,
            winner: opponent.userId,
            reason: 'opponent_left'
          });
        }
      } else {
        room.players = room.players.filter(p => p.socketId !== socket.id);
        
        if (room.players.length === 0) {
          activeRooms.delete(room.roomId);
        } else {
          io.to(room.roomId).emit('playerLeft', {
            player: leavingPlayer,
            room: sanitizeRoom(room)
          });
        }
      }
    }
  }
}

// Start server for Render deployment
const PORT = process.env.PORT || 4000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 WebSocket server ready for connections`);
  });
}

// Export for Vercel (keep for compatibility)
module.exports = app;