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
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
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

// Initialize Game
function initializeGame() {
  return { 
    board: Array(9).fill(null), 
    moves: [],
    winner: null,
    isDraw: false,
    gameOver: false
  };
}

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Set connection timeout
  socket.setTimeout(30000); // 30 seconds timeout

  // Authentication
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
      console.log(`✅ User authenticated: ${username}`);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  });

  // Create Room
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
        players: [{ 
          userId, 
          username, 
          avatar: avatar || '😀', 
          socketId: socket.id, 
          ready: false,
          symbol: 'X'
        }],
        status: 'waiting',
        gameState: initializeGame(),
        currentTurn: null,
        createdAt: new Date()
      };

      activeRooms.set(roomId, room);
      socket.join(roomId);
      socket.roomId = roomId;

      socket.emit('roomCreated', { 
        success: true, 
        room: sanitizeRoom(room) 
      });
      
      console.log(`🎮 Room created: ${roomId}`);
    } catch (error) {
      console.error('❌ Create room error:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Join Room
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
      
      if (room.players.length >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      if (room.players.some(p => p.userId === userId)) {
        socket.emit('error', { message: 'User already in this room' });
        return;
      }

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
        startGame(room);
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

      const result = processMove(room, move, player);
      
      if (result.valid) {
        room.gameState = result.newState;
        room.currentTurn = getNextPlayer(room, player.userId);
        
        io.to(roomId).emit('moveMade', {
          move,
          gameState: room.gameState,
          currentTurn: room.currentTurn,
          playerId: player.userId,
          playerSymbol: player.symbol
        });

        if (result.gameOver) {
          endGame(room, result);
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
  });
});

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
  
  const winnerSymbol = checkWinner(newBoard);
  const isDraw = !winnerSymbol && newBoard.every(cell => cell !== null);
  
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

function checkWinner(board) {
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
    gameState: room.gameState,
    currentTurn: room.currentTurn
  };
}

function startGame(room) {
  room.status = 'active';
  room.currentTurn = room.players[0].userId;
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

  console.log(`🎮 Game started in room ${room.roomId}`);
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