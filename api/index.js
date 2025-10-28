// api/index.js - Complete Vercel-compatible API
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration for Vercel
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:5000", 
      "http://127.0.0.1:3000", 
      "http://127.0.0.1:5000", 
      "https://games-baatein-frontend.vercel.app",
      "https://games-baatein-frontend.vercel.app/",
      "*"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:5000", 
    "http://127.0.0.1:3000", 
    "http://127.0.0.1:5000", 
    "https://games-baatein-frontend.vercel.app",
    "https://games-baatein-frontend.vercel.app/",
    "*"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/baatein-games';
console.log('🔗 Connecting to MongoDB:', mongoUri ? 'MongoDB Atlas' : 'Local MongoDB');

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
    version: '2.0'
  });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeRooms: activeRooms.size,
    connectedUsers: userSockets.size
  });
});

// Game state storage
const activeRooms = new Map();
const userSockets = new Map();

// Initialize Tic Tac Toe Game State
function initializeTicTacToeGame() {
  return { 
    board: Array(9).fill(null), 
    moves: [],
    winner: null,
    isDraw: false,
    gameOver: false
  };
}

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // User Authentication
  socket.on('authenticate', (data) => {
    try {
      const { userId, username, avatar } = data;
      
      if (!userId || !username) {
        socket.emit('error', { message: 'User ID and username are required' });
        return;
      }
      
      socket.userId = userId;
      socket.username = username;
      socket.avatar = avatar || '😀';
      userSockets.set(userId, socket.id);
      socket.emit('authenticated', { success: true, socketId: socket.id });
      console.log(`✅ User authenticated: ${username} (${userId})`);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  });

  // Create Game Room
  socket.on('createRoom', (data) => {
    try {
      const { userId, username, avatar } = data;
      
      if (!userId || !username) {
        socket.emit('error', { message: 'User ID and username are required' });
        return;
      }
      
      const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
      
      const room = {
        roomId,
        gameType: 'tic-tac-toe',
        players: [{ 
          userId, 
          username, 
          avatar: avatar || '😀', 
          socketId: socket.id, 
          ready: false,
          symbol: 'X' // First player gets X
        }],
        status: 'waiting',
        gameState: initializeTicTacToeGame(),
        currentTurn: null,
        createdAt: new Date(),
        maxPlayers: 2
      };

      activeRooms.set(roomId, room);
      socket.join(roomId);
      socket.roomId = roomId;

      socket.emit('roomCreated', { 
        success: true, 
        room: sanitizeRoom(room) 
      });
      
      console.log(`🎮 Room created: ${roomId} for tic-tac-toe`);
    } catch (error) {
      console.error('❌ Create room error:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Join Game Room
  socket.on('joinRoom', (data) => {
    try {
      const { roomId, userId, username, avatar } = data;
      
      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'Room ID, User ID, and username are required' });
        return;
      }
      
      const room = activeRooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      // Check if user is already in the room
      if (room.players.some(p => p.userId === userId)) {
        socket.emit('error', { message: 'User already in this room' });
        return;
      }

      // Second player gets O
      room.players.push({ 
        userId, 
        username, 
        avatar: avatar || '😀', 
        socketId: socket.id, 
        ready: false,
        symbol: 'O'
      });
      
      socket.join(roomId);
      socket.roomId = roomId;

      io.to(roomId).emit('playerJoined', {
        player: { userId, username, avatar: avatar || '😀' },
        room: sanitizeRoom(room)
      });
      
      console.log(`👥 Player ${username} joined room ${roomId}`);
    } catch (error) {
      console.error('❌ Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Player Ready
  socket.on('playerReady', (data) => {
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

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }
      
      player.ready = true;

      io.to(roomId).emit('playerReadyUpdate', {
        players: room.players.map(p => ({ 
          userId: p.userId, 
          username: p.username, 
          avatar: p.avatar,
          symbol: p.symbol,
          ready: p.ready 
        }))
      });

      // Start game if both players ready
      if (room.players.length === 2 && room.players.every(p => p.ready)) {
        startTicTacToeGame(room);
      }
    } catch (error) {
      console.error('❌ Player ready error:', error);
      socket.emit('error', { message: 'Failed to mark player as ready' });
    }
  });

  // Make Move
  socket.on('makeMove', (data) => {
    try {
      const { roomId, move } = data;
      
      if (!roomId || move === undefined || move === null) {
        socket.emit('error', { message: 'Room ID and move are required' });
        return;
      }
      
      const room = activeRooms.get(roomId);
      
      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'Invalid game state' });
        return;
      }

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player || room.currentTurn !== player.userId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      const result = processTicTacToeMove(room, move, player);
      
      if (result.valid) {
        room.gameState = result.newState;
        
        // Switch turns
        room.currentTurn = getNextPlayer(room, player.userId);
        
        io.to(roomId).emit('moveMade', {
          move,
          gameState: room.gameState,
          currentTurn: room.currentTurn,
          playerId: player.userId,
          playerSymbol: player.symbol
        });

        // Check for game over
        if (result.gameOver) {
          endTicTacToeGame(room, result);
        }
      } else {
        socket.emit('error', { message: result.message || 'Invalid move' });
      }
    } catch (error) {
      console.error('❌ Make move error:', error);
      socket.emit('error', { message: 'Failed to process move' });
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

  // Offer Draw
  socket.on('offerDraw', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    socket.to(roomId).emit('drawOffered', {
      fromPlayer: player.username
    });
  });

  // Accept Draw
  socket.on('acceptDraw', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    if (!room) return;

    endTicTacToeGame(room, { 
      gameOver: true, 
      winner: 'draw',
      reason: 'draw_accepted'
    });
  });

  // Resign
  socket.on('resign', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    const opponent = room.players.find(p => p.socketId !== socket.id);
    
    if (opponent) {
      endTicTacToeGame(room, { 
        gameOver: true, 
        winner: opponent.userId,
        reason: 'resignation' 
      });
    }
  });

  // Restart Game
  socket.on('restartGame', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);

    if (!room || room.status !== 'finished') {
      socket.emit('error', { message: 'Cannot restart game' });
      return;
    }

    // Reset game state
    room.status = 'waiting';
    room.gameState = initializeTicTacToeGame();
    room.currentTurn = null;
    room.winner = null;
    room.players.forEach(player => player.ready = false);

    io.to(roomId).emit('gameRestarted', {
      room: sanitizeRoom(room)
    });

    console.log(`🔄 Game restarted in room ${roomId}`);
  });

  // Leave Room
  socket.on('leaveRoom', () => {
    handlePlayerLeave(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    handlePlayerLeave(socket);
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
  });
});

// Process Tic Tac Toe Move
function processTicTacToeMove(room, move, player) {
  // Handle both object and direct position formats
  const position = typeof move === 'object' ? move.position : move;
  const state = room.gameState;
  
  // Validate move
  if (position < 0 || position > 8) {
    return { valid: false, message: 'Invalid position' };
  }
  
  if (state.board[position] !== null) {
    return { valid: false, message: 'Position already occupied' };
  }

  // Make the move
  const newBoard = [...state.board];
  newBoard[position] = player.symbol;
  
  const newMoves = [...state.moves, { position, player: player.userId, symbol: player.symbol }];
  
  // Check for winner
  const winnerSymbol = checkTicTacToeWinner(newBoard);
  const isDraw = !winnerSymbol && newBoard.every(cell => cell !== null);
  
  // Convert winner symbol to userId
  let winnerUserId = null;
  if (winnerSymbol) {
    const winningPlayer = room.players.find(p => p.symbol === winnerSymbol);
    winnerUserId = winningPlayer ? winningPlayer.userId : null;
  }
  
  const newState = {
    board: newBoard,
    moves: newMoves,
    winner: winnerSymbol,
    isDraw: isDraw,
    gameOver: winnerSymbol !== null || isDraw
  };
  
  return {
    valid: true,
    newState: newState,
    gameOver: newState.gameOver,
    winner: winnerUserId || (isDraw ? 'draw' : null)
  };
}

// Check Tic Tac Toe Winner
function checkTicTacToeWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Helper Functions
function sanitizeRoom(room) {
  return {
    roomId: room.roomId,
    gameType: room.gameType,
    players: room.players.map(p => ({ 
      userId: p.userId, 
      username: p.username, 
      avatar: p.avatar, 
      symbol: p.symbol,
      ready: p.ready 
    })),
    status: room.status,
    gameState: room.gameState,
    currentTurn: room.currentTurn,
    maxPlayers: room.maxPlayers
  };
}

function startTicTacToeGame(room) {
  room.status = 'active';
  room.currentTurn = room.players[0].userId; // First player starts
  room.startTime = new Date();

  io.to(room.roomId).emit('gameStarted', {
    gameState: room.gameState,
    currentTurn: room.currentTurn,
    players: room.players.map(p => ({ 
      userId: p.userId, 
      username: p.username, 
      avatar: p.avatar,
      symbol: p.symbol
    }))
  });

  console.log(`🎮 Tic Tac Toe game started in room ${room.roomId}`);
}

function getNextPlayer(room, currentUserId) {
  const currentIndex = room.players.findIndex(p => p.userId === currentUserId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  return room.players[nextIndex].userId;
}

function endTicTacToeGame(room, result) {
  room.status = 'finished';
  room.endTime = new Date();
  room.winner = result.winner;
  room.gameState.gameOver = true;
  room.gameState.winner = result.winner;

  io.to(room.roomId).emit('gameOver', {
    winner: result.winner,
    reason: result.reason || 'normal',
    gameState: room.gameState,
    duration: room.startTime ? Math.floor((room.endTime - room.startTime) / 1000) : 0
  });

  // Clean up room after 2 minutes
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
        // Player left during game - opponent wins
        const opponent = room.players.find(p => p.socketId !== socket.id);
        if (opponent) {
          endTicTacToeGame(room, {
            gameOver: true,
            winner: opponent.userId,
            reason: 'opponent_left'
          });
        }
      } else {
        // Player left waiting room
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

// Export for Vercel
module.exports = app;