// server.js - Main backend server file
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Import Routes
const gameRoutes = require('./routes/gameRoutes');
const roomRoutes = require('./routes/roomRoutes');
const userRoutes = require('./routes/userRoutes');

// API Routes
app.use('/api/games', gameRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

// Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Baatein Games Server Running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount
  });
});

// Socket.IO Game Logic
const activeRooms = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // User Authentication
  socket.on('authenticate', (data) => {
    const { userId, username, avatar } = data;
    socket.userId = userId;
    socket.username = username;
    socket.avatar = avatar;
    userSockets.set(userId, socket.id);
    
    socket.emit('authenticated', { 
      success: true, 
      socketId: socket.id 
    });
    
    console.log(`✅ User authenticated: ${username} (${userId})`);
  });

  // Create Game Room
  socket.on('createRoom', async (data) => {
    const { gameType, userId, username, avatar } = data;
    const roomId = generateRoomId();
    
    const room = {
      roomId,
      gameType,
      players: [{
        userId,
        username,
        avatar,
        socketId: socket.id,
        ready: false
      }],
      status: 'waiting',
      gameState: initializeGameState(gameType),
      currentTurn: null,
      createdAt: new Date(),
      agoraChannel: `game_${roomId}`
    };

    activeRooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('roomCreated', {
      success: true,
      room: sanitizeRoom(room)
    });

    console.log(`🎮 Room created: ${roomId} for ${gameType}`);
  });

  // Join Game Room
  socket.on('joinRoom', async (data) => {
    const { roomId, userId, username, avatar } = data;
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

    room.players.push({
      userId,
      username,
      avatar,
      socketId: socket.id,
      ready: false
    });

    socket.join(roomId);
    socket.roomId = roomId;

    io.to(roomId).emit('playerJoined', {
      player: { userId, username, avatar },
      room: sanitizeRoom(room)
    });

    console.log(`👥 Player ${username} joined room ${roomId}`);
  });

  // Player Ready
  socket.on('playerReady', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);

    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.ready = true;
    }

    io.to(roomId).emit('playerReadyUpdate', {
      players: room.players.map(p => ({
        userId: p.userId,
        username: p.username,
        ready: p.ready
      }))
    });

    // Start game if both players ready
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      startGame(room, io);
    }
  });

  // Make Move
  socket.on('makeMove', (data) => {
    const { roomId, move } = data;
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

    // Validate and apply move based on game type
    const result = processMove(room, move, player.userId);

    if (result.valid) {
      room.gameState = result.newState;
      room.currentTurn = getNextPlayer(room, player.userId);

      io.to(roomId).emit('moveMade', {
        move,
        gameState: room.gameState,
        currentTurn: room.currentTurn,
        playerId: player.userId
      });

      // Check for game over
      if (result.gameOver) {
        endGame(room, result, io);
      }
    } else {
      socket.emit('error', { message: 'Invalid move' });
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
  socket.on('leaveRoom', (data) => {
    handlePlayerLeave(socket, io);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    handlePlayerLeave(socket, io);
    
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
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

    endGame(room, { gameOver: true, winner: 'draw' }, io);
  });

  // Resign
  socket.on('resign', (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    const opponent = room.players.find(p => p.socketId !== socket.id);

    endGame(room, { 
      gameOver: true, 
      winner: opponent.userId,
      reason: 'resignation' 
    }, io);
  });
});

// Helper Functions
function generateRoomId() {
  return 'room_' + Math.random().toString(36).substr(2, 9);
}

function initializeGameState(gameType) {
  switch(gameType) {
    case 'tic-tac-toe':
      return { board: Array(9).fill(null), moves: [] };
    case 'chess':
      return { board: getInitialChessBoard(), moves: [], capturedPieces: { white: [], black: [] } };
    case 'ludo':
      return { board: getInitialLudoBoard(), dice: null, currentRoll: null };
    case '8ball-pool':
      return { balls: getInitial8BallPositions(), cuePosition: null, power: 0 };
    default:
      return {};
  }
}

function sanitizeRoom(room) {
  return {
    roomId: room.roomId,
    gameType: room.gameType,
    players: room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      ready: p.ready
    })),
    status: room.status,
    gameState: room.gameState,
    currentTurn: room.currentTurn,
    agoraChannel: room.agoraChannel
  };
}

function startGame(room, io) {
  room.status = 'active';
  room.currentTurn = room.players[0].userId;
  room.startTime = new Date();

  io.to(room.roomId).emit('gameStarted', {
    gameState: room.gameState,
    currentTurn: room.currentTurn,
    players: room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar
    }))
  });

  console.log(`🎮 Game started in room ${room.roomId}`);
}

function processMove(room, move, userId) {
  switch(room.gameType) {
    case 'tic-tac-toe':
      return processTicTacToeMove(room.gameState, move, userId, room);
    case 'chess':
      return processChessMove(room.gameState, move, userId);
    case 'ludo':
      return processLudoMove(room.gameState, move, userId);
    case '8ball-pool':
      return process8BallMove(room.gameState, move, userId);
    default:
      return { valid: false };
  }
}

function processTicTacToeMove(state, move, userId, room) {
  const { position } = move;
  
  if (state.board[position] !== null) {
    return { valid: false };
  }

  const playerIndex = room.players.findIndex(p => p.userId === userId);
  const symbol = playerIndex === 0 ? 'X' : 'O';
  
  const newBoard = [...state.board];
  newBoard[position] = symbol;
  
  const winner = checkTicTacToeWinner(newBoard);
  const isDraw = !winner && newBoard.every(cell => cell !== null);
  
  return {
    valid: true,
    newState: { board: newBoard, moves: [...state.moves, move] },
    gameOver: winner !== null || isDraw,
    winner: winner || (isDraw ? 'draw' : null)
  };
}

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

function processChessMove(state, move, userId) {
  // Simplified chess validation - implement full chess rules
  return {
    valid: true,
    newState: { ...state, moves: [...state.moves, move] },
    gameOver: false,
    winner: null
  };
}

function processLudoMove(state, move, userId) {
  // Ludo move logic
  return {
    valid: true,
    newState: { ...state },
    gameOver: false,
    winner: null
  };
}

function process8BallMove(state, move, userId) {
  // 8 Ball Pool physics
  return {
    valid: true,
    newState: { ...state },
    gameOver: false,
    winner: null
  };
}

function getNextPlayer(room, currentUserId) {
  const currentIndex = room.players.findIndex(p => p.userId === currentUserId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  return room.players[nextIndex].userId;
}

function endGame(room, result, io) {
  room.status = 'finished';
  room.endTime = new Date();
  room.winner = result.winner;

  io.to(room.roomId).emit('gameOver', {
    winner: result.winner,
    reason: result.reason || 'normal',
    gameState: room.gameState,
    duration: Math.floor((room.endTime - room.startTime) / 1000)
  });

  // Save game to database
  saveGameToDatabase(room);

  // Clean up room after 1 minute
  setTimeout(() => {
    activeRooms.delete(room.roomId);
    console.log(`🗑️ Room ${room.roomId} cleaned up`);
  }, 60000);
}

function handlePlayerLeave(socket, io) {
  if (socket.roomId) {
    const room = activeRooms.get(socket.roomId);
    if (room) {
      const leavingPlayer = room.players.find(p => p.socketId === socket.id);
      
      if (room.status === 'active') {
        // Player left during game - opponent wins
        const opponent = room.players.find(p => p.socketId !== socket.id);
        if (opponent) {
          endGame(room, {
            gameOver: true,
            winner: opponent.userId,
            reason: 'opponent_left'
          }, io);
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

async function saveGameToDatabase(room) {
  try {
    const Game = require('./models/Game');
    const User = require('./models/User');

    const gameDoc = new Game({
      roomId: room.roomId,
      gameType: room.gameType,
      players: room.players.map(p => ({
        userId: p.userId,
        username: p.username
      })),
      winner: room.winner,
      moves: room.gameState.moves || [],
      duration: Math.floor((room.endTime - room.startTime) / 1000),
      startTime: room.startTime,
      endTime: room.endTime,
      status: 'completed'
    });

    await gameDoc.save();

    // Update user stats
    for (let player of room.players) {
      await User.findOneAndUpdate(
        { userId: player.userId },
        {
          $inc: {
            'stats.gamesPlayed': 1,
            ...(room.winner === player.userId && { 'stats.gamesWon': 1 }),
            ...(room.winner !== player.userId && room.winner !== 'draw' && { 'stats.gamesLost': 1 }),
            ...(room.winner === 'draw' && { 'stats.gamesDraw': 1 })
          }
        },
        { upsert: true }
      );
    }

    console.log('💾 Game saved to database');
  } catch (error) {
    console.error('❌ Error saving game:', error);
  }
}

function getInitialChessBoard() {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
}

function getInitialLudoBoard() {
  return {
    pieces: {
      red: [0, 0, 0, 0],
      blue: [0, 0, 0, 0],
      green: [0, 0, 0, 0],
      yellow: [0, 0, 0, 0]
    }
  };
}

function getInitial8BallPositions() {
  return []; // Ball positions array
}

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  🎮 Baatein Games Server Running      ║
  ║  📡 Port: ${PORT}                        ║
  ║  🌐 Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║  ⏰ Started: ${new Date().toLocaleString()}    ║
  ╚════════════════════════════════════════╝
  `);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    mongoose.connection.close();
    console.log('Server closed');
    process.exit(0);
  });
});