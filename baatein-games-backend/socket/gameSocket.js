// ===== socket/gameSocket.js =====
// Socket.IO game event handlers for Baatein Games

const { TicTacToeLogic } = require('../utils/gameLogic');

class GameSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeRooms = new Map();
    this.userSockets = new Map();
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔌 New client connected:', socket.id);

      // User Authentication
      socket.on('authenticate', (data) => {
        this.handleAuthenticate(socket, data);
      });

      // Create Game Room
      socket.on('createRoom', (data) => {
        this.handleCreateRoom(socket, data);
      });

      // Join Game Room
      socket.on('joinRoom', (data) => {
        this.handleJoinRoom(socket, data);
      });

      // Player Ready
      socket.on('playerReady', (data) => {
        this.handlePlayerReady(socket, data);
      });

      // Make Move
      socket.on('makeMove', (data) => {
        this.handleMakeMove(socket, data);
      });

      // Restart Game
      socket.on('restartGame', (data) => {
        this.handleRestartGame(socket, data);
      });

      // Chat Message
      socket.on('chatMessage', (data) => {
        this.handleChatMessage(socket, data);
      });

      // Leave Room
      socket.on('leaveRoom', (data) => {
        this.handlePlayerLeave(socket);
      });

      // Offer Draw
      socket.on('offerDraw', (data) => {
        this.handleOfferDraw(socket, data);
      });

      // Accept Draw
      socket.on('acceptDraw', (data) => {
        this.handleAcceptDraw(socket, data);
      });

      // Resign
      socket.on('resign', (data) => {
        this.handleResign(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        this.handlePlayerLeave(socket);
        
        if (socket.userId) {
          this.userSockets.delete(socket.userId);
        }
      });
    });
  }

  handleAuthenticate(socket, data) {
    const { userId, username, avatar } = data;
    socket.userId = userId;
    socket.username = username;
    socket.avatar = avatar;
    this.userSockets.set(userId, socket.id);
    
    socket.emit('authenticated', { 
      success: true, 
      socketId: socket.id 
    });
    
    console.log(`✅ User authenticated: ${username} (${userId})`);
  }

  handleCreateRoom(socket, data) {
    const { gameType, userId, username, avatar } = data;
    const roomId = this.generateRoomId();
    
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
      gameState: this.initializeGameState(gameType),
      currentTurn: null,
      createdAt: new Date(),
      agoraChannel: `game_${roomId}`
    };

    this.activeRooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('roomCreated', {
      success: true,
      room: this.sanitizeRoom(room)
    });

    console.log(`🎮 Room created: ${roomId} for ${gameType}`);
  }

  handleJoinRoom(socket, data) {
    const { roomId, userId, username, avatar } = data;
    const room = this.activeRooms.get(roomId);

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

    this.io.to(roomId).emit('playerJoined', {
      player: { userId, username, avatar },
      room: this.sanitizeRoom(room)
    });

    console.log(`👥 Player ${username} joined room ${roomId}`);
  }

  handlePlayerReady(socket, data) {
    const { roomId } = data;
    const room = this.activeRooms.get(roomId);

    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) {
      player.ready = true;
    }

    this.io.to(roomId).emit('playerReadyUpdate', {
      players: room.players.map(p => ({
        userId: p.userId,
        username: p.username,
        ready: p.ready
      }))
    });

    // Start game if both players ready
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      this.startGame(room);
    }
  }

  handleMakeMove(socket, data) {
    const { roomId, move } = data;
    const room = this.activeRooms.get(roomId);

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
    const result = this.processMove(room, move, player.userId);

    if (result.valid) {
      room.gameState = result.newState;
      room.currentTurn = this.getNextPlayer(room, player.userId);

      this.io.to(roomId).emit('moveMade', {
        move,
        gameState: room.gameState,
        currentTurn: room.currentTurn,
        playerId: player.userId
      });

      // Check for game over
      if (result.gameOver) {
        this.endGame(room, result);
      }
    } else {
      socket.emit('error', { message: 'Invalid move' });
    }
  }

  handleRestartGame(socket, data) {
    const { roomId } = data;
    const room = this.activeRooms.get(roomId);

    if (!room || room.status !== 'finished') {
      socket.emit('error', { message: 'Cannot restart game' });
      return;
    }

    // Reset game state
    room.status = 'waiting';
    room.gameState = this.initializeGameState(room.gameType);
    room.currentTurn = null;
    room.winner = null;
    room.players.forEach(player => player.ready = false);

    this.io.to(roomId).emit('gameRestarted', {
      room: this.sanitizeRoom(room)
    });

    console.log(`🔄 Game restarted in room ${roomId}`);
  }

  handleChatMessage(socket, data) {
    const { roomId, message } = data;
    const room = this.activeRooms.get(roomId);

    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    this.io.to(roomId).emit('chatMessage', {
      userId: player.userId,
      username: player.username,
      message,
      timestamp: new Date().toISOString()
    });
  }

  handleOfferDraw(socket, data) {
    const { roomId } = data;
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    socket.to(roomId).emit('drawOffered', {
      fromPlayer: player.username
    });
  }

  handleAcceptDraw(socket, data) {
    const { roomId } = data;
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    this.endGame(room, { gameOver: true, winner: 'draw' });
  }

  handleResign(socket, data) {
    const { roomId } = data;
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    const opponent = room.players.find(p => p.socketId !== socket.id);

    this.endGame(room, { 
      gameOver: true, 
      winner: opponent.userId,
      reason: 'resignation' 
    });
  }

  handlePlayerLeave(socket) {
    if (socket.roomId) {
      const room = this.activeRooms.get(socket.roomId);
      if (room) {
        const leavingPlayer = room.players.find(p => p.socketId === socket.id);
        
        if (room.status === 'active') {
          // Player left during game - opponent wins
          const opponent = room.players.find(p => p.socketId !== socket.id);
          if (opponent) {
            this.endGame(room, {
              gameOver: true,
              winner: opponent.userId,
              reason: 'opponent_left'
            });
          }
        } else {
          // Player left waiting room
          room.players = room.players.filter(p => p.socketId !== socket.id);
          
          if (room.players.length === 0) {
            this.activeRooms.delete(room.roomId);
          } else {
            this.io.to(room.roomId).emit('playerLeft', {
              player: leavingPlayer,
              room: this.sanitizeRoom(room)
            });
          }
        }
      }
    }
  }

  // Helper Functions
  generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9);
  }

  initializeGameState(gameType) {
    switch(gameType) {
      case 'tic-tac-toe':
        return { board: Array(9).fill(null), moves: [] };
      case 'chess':
        return { board: this.getInitialChessBoard(), moves: [], capturedPieces: { white: [], black: [] } };
      case 'ludo':
        return { board: this.getInitialLudoBoard(), dice: null, currentRoll: null };
      case '8ball-pool':
        return { balls: this.getInitial8BallPositions(), cuePosition: null, power: 0 };
      default:
        return {};
    }
  }

  sanitizeRoom(room) {
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

  startGame(room) {
    room.status = 'active';
    room.currentTurn = room.players[0].userId;
    room.startTime = new Date();

    this.io.to(room.roomId).emit('gameStarted', {
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

  processMove(room, move, userId) {
    switch(room.gameType) {
      case 'tic-tac-toe':
        return this.processTicTacToeMove(room.gameState, move, userId, room);
      case 'chess':
        return this.processChessMove(room.gameState, move, userId);
      case 'ludo':
        return this.processLudoMove(room.gameState, move, userId);
      case '8ball-pool':
        return this.process8BallMove(room.gameState, move, userId);
      default:
        return { valid: false };
    }
  }

  processTicTacToeMove(state, move, userId, room) {
    const { position } = move;
    
    if (state.board[position] !== null) {
      return { valid: false };
    }

    const playerIndex = room.players.findIndex(p => p.userId === userId);
    const symbol = playerIndex === 0 ? 'X' : 'O';
    
    const newBoard = [...state.board];
    newBoard[position] = symbol;
    
    const winner = this.checkTicTacToeWinner(newBoard);
    const isDraw = !winner && newBoard.every(cell => cell !== null);
    
    return {
      valid: true,
      newState: { board: newBoard, moves: [...state.moves, move] },
      gameOver: winner !== null || isDraw,
      winner: winner || (isDraw ? 'draw' : null)
    };
  }

  checkTicTacToeWinner(board) {
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

  processChessMove(state, move, userId) {
    // Simplified chess validation - implement full chess rules
    return {
      valid: true,
      newState: { ...state, moves: [...state.moves, move] },
      gameOver: false,
      winner: null
    };
  }

  processLudoMove(state, move, userId) {
    // Ludo move logic
    return {
      valid: true,
      newState: { ...state },
      gameOver: false,
      winner: null
    };
  }

  process8BallMove(state, move, userId) {
    // 8 Ball Pool physics
    return {
      valid: true,
      newState: { ...state },
      gameOver: false,
      winner: null
    };
  }

  getNextPlayer(room, currentUserId) {
    const currentIndex = room.players.findIndex(p => p.userId === currentUserId);
    const nextIndex = (currentIndex + 1) % room.players.length;
    return room.players[nextIndex].userId;
  }

  endGame(room, result) {
    room.status = 'finished';
    room.endTime = new Date();
    room.winner = result.winner;

    this.io.to(room.roomId).emit('gameOver', {
      winner: result.winner,
      reason: result.reason || 'normal',
      gameState: room.gameState,
      duration: Math.floor((room.endTime - room.startTime) / 1000)
    });

    // Save game to database
    this.saveGameToDatabase(room);

    // Clean up room after 1 minute
    setTimeout(() => {
      this.activeRooms.delete(room.roomId);
      console.log(`🗑️ Room ${room.roomId} cleaned up`);
    }, 60000);
  }

  async saveGameToDatabase(room) {
    try {
      const Game = require('../models/Game');
      const User = require('../models/User');

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

  getInitialChessBoard() {
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

  getInitialLudoBoard() {
    return {
      pieces: {
        red: [0, 0, 0, 0],
        blue: [0, 0, 0, 0],
        green: [0, 0, 0, 0],
        yellow: [0, 0, 0, 0]
      }
    };
  }

  getInitial8BallPositions() {
    return []; // Ball positions array
  }

  // Public methods for external access
  getActiveRooms() {
    return this.activeRooms;
  }

  getRoomById(roomId) {
    return this.activeRooms.get(roomId);
  }
}

module.exports = GameSocketHandler;
