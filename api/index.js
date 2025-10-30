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
      
      const allowVercelPreview = /\.vercel\.app$/i.test(origin || '');
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*") || allowVercelPreview) {
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
        game: 'tic-tac-toe',
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

      // Start game if both players ready - VERIFY before starting
      const allReady = room.players.length === 2 && room.players.every(p => p.ready === true);
      
      console.log(`🔍 Player ready check:`, {
        roomId: roomId,
        playersCount: room.players.length,
        allReady: allReady,
        players: room.players.map(p => ({ username: p.username, ready: p.ready }))
      });
      
      if (allReady) {
        // Add small delay to ensure both players have updated their UI
        setTimeout(() => {
          startGame(room);
        }, 100);
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
          // Pass winning line information to endGame
          endGame(room, {
            winner: result.winner,
            reason: 'normal',
            winningLine: result.winningLine
          });
        }
      } else {
        socket.emit('error', { message: result.message || 'Invalid move' });
      }
    } catch (error) {
      console.error('❌ Make move error:', error);
      socket.emit('error', { message: 'Failed to process move' });
    }
  });

  // Ludo removed

  // Ludo removed

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

  // Ludo removed

  // Tic Tac Toe default
  room.gameState = initializeGame();
  console.log(`🎮 Game started in room ${room.roomId} with board:`, room.gameState.board);

  io.to(room.roomId).emit('gameStarted', {
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