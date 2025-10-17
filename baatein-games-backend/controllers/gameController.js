// ===== controllers/gameController.js =====
// Game controller for Baatein Games API endpoints

const Game = require('../models/Game');
const GameRoom = require('../models/GameRoom');
const User = require('../models/User');

class GameController {
  // Create a new Tic Tac Toe game room
  async createTicTacToeGame(req, res) {
    try {
      const { userId, username, avatar } = req.body;

      if (!userId || !username) {
        return res.status(400).json({
          success: false,
          message: 'User ID and username are required'
        });
      }

      const roomId = this.generateRoomId();
      
      const roomData = {
        roomId,
        gameType: 'tic-tac-toe',
        players: [{
          userId,
          username,
          avatar: avatar || '👤',
          ready: false
        }],
        status: 'waiting',
        gameState: {
          board: Array(9).fill(null),
          moves: []
        },
        currentTurn: null,
        agoraChannel: `game_${roomId}`,
        createdAt: new Date()
      };

      // Save room to database
      const gameRoom = new GameRoom(roomData);
      await gameRoom.save();

      console.log(`🎮 Tic Tac Toe room created: ${roomId} by ${username}`);

      res.json({
        success: true,
        room: {
          roomId: roomData.roomId,
          gameType: roomData.gameType,
          players: roomData.players,
          status: roomData.status,
          gameState: roomData.gameState,
          currentTurn: roomData.currentTurn,
          agoraChannel: roomData.agoraChannel
        }
      });

    } catch (error) {
      console.error('❌ Error creating Tic Tac Toe game:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create game room',
        error: error.message
      });
    }
  }

  // Join a Tic Tac Toe game room
  async joinTicTacToeGame(req, res) {
    try {
      const { roomId, userId, username, avatar } = req.body;

      if (!roomId || !userId || !username) {
        return res.status(400).json({
          success: false,
          message: 'Room ID, user ID and username are required'
        });
      }

      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      if (room.players.length >= 2) {
        return res.status(400).json({
          success: false,
          message: 'Room is full'
        });
      }

      if (room.status !== 'waiting') {
        return res.status(400).json({
          success: false,
          message: 'Game already started'
        });
      }

      // Add player to room
      room.players.push({
        userId,
        username,
        avatar: avatar || '👤',
        ready: false
      });

      await room.save();

      console.log(`👥 Player ${username} joined Tic Tac Toe room ${roomId}`);

      res.json({
        success: true,
        message: 'Successfully joined room',
        room: {
          roomId: room.roomId,
          gameType: room.gameType,
          players: room.players,
          status: room.status,
          gameState: room.gameState,
          currentTurn: room.currentTurn,
          agoraChannel: room.agoraChannel
        }
      });

    } catch (error) {
      console.error('❌ Error joining Tic Tac Toe game:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join game room',
        error: error.message
      });
    }
  }

  // Get game room details
  async getGameRoom(req, res) {
    try {
      const { roomId } = req.params;

      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      res.json({
        success: true,
        room: {
          roomId: room.roomId,
          gameType: room.gameType,
          players: room.players,
          status: room.status,
          gameState: room.gameState,
          currentTurn: room.currentTurn,
          agoraChannel: room.agoraChannel,
          createdAt: room.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Error getting game room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get game room',
        error: error.message
      });
    }
  }

  // Get user's game history
  async getUserGameHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const games = await Game.find({
        'players.userId': userId,
        status: 'completed'
      })
      .sort({ endTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await Game.countDocuments({
        'players.userId': userId,
        status: 'completed'
      });

      res.json({
        success: true,
        games,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error getting user game history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get game history',
        error: error.message
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findOne({ userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Calculate additional stats
      const totalGames = user.stats.gamesPlayed || 0;
      const winRate = totalGames > 0 ? ((user.stats.gamesWon || 0) / totalGames * 100).toFixed(1) : 0;

      res.json({
        success: true,
        stats: {
          gamesPlayed: user.stats.gamesPlayed || 0,
          gamesWon: user.stats.gamesWon || 0,
          gamesLost: user.stats.gamesLost || 0,
          gamesDraw: user.stats.gamesDraw || 0,
          winRate: `${winRate}%`,
          username: user.username,
          avatar: user.avatar
        }
      });

    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: error.message
      });
    }
  }

  // Handle Tic Tac Toe move validation (for API-based moves)
  async handleTicTacToeMove(req, res) {
    try {
      const { roomId, position, userId } = req.body;

      if (position < 0 || position > 8) {
        return res.status(400).json({
          success: false,
          message: 'Invalid position'
        });
      }

      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      if (room.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Game not active'
        });
      }

      if (room.currentTurn !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Not your turn'
        });
      }

      if (room.gameState.board[position] !== null) {
        return res.status(400).json({
          success: false,
          message: 'Position already occupied'
        });
      }

      // Process the move
      const playerIndex = room.players.findIndex(p => p.userId === userId);
      const symbol = playerIndex === 0 ? 'X' : 'O';
      
      const newBoard = [...room.gameState.board];
      newBoard[position] = symbol;
      
      const winner = this.checkTicTacToeWinner(newBoard);
      const isDraw = !winner && newBoard.every(cell => cell !== null);

      // Update room state
      room.gameState.board = newBoard;
      room.gameState.moves.push({ position, player: userId, symbol });
      room.currentTurn = this.getNextPlayer(room, userId);

      if (winner || isDraw) {
        room.status = 'finished';
        room.winner = winner || 'draw';
        room.endTime = new Date();
      }

      await room.save();

      // Save completed game to Game collection
      if (room.status === 'finished') {
        await this.saveCompletedGame(room);
      }

      res.json({
        success: true,
        move: { position, symbol },
        gameState: room.gameState,
        currentTurn: room.currentTurn,
        gameOver: room.status === 'finished',
        winner: room.winner
      });

    } catch (error) {
      console.error('❌ Error handling Tic Tac Toe move:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process move',
        error: error.message
      });
    }
  }

  // Restart a finished game
  async restartTicTacToeGame(req, res) {
    try {
      const { roomId, userId } = req.body;

      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      if (room.status !== 'finished') {
        return res.status(400).json({
          success: false,
          message: 'Game is not finished'
        });
      }

      // Reset game state
      room.status = 'waiting';
      room.gameState = {
        board: Array(9).fill(null),
        moves: []
      };
      room.currentTurn = null;
      room.winner = null;
      room.endTime = null;
      room.players.forEach(player => player.ready = false);

      await room.save();

      console.log(`🔄 Tic Tac Toe game restarted in room ${roomId}`);

      res.json({
        success: true,
        message: 'Game restarted successfully',
        room: {
          roomId: room.roomId,
          gameType: room.gameType,
          players: room.players,
          status: room.status,
          gameState: room.gameState,
          currentTurn: room.currentTurn,
          agoraChannel: room.agoraChannel
        }
      });

    } catch (error) {
      console.error('❌ Error restarting Tic Tac Toe game:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restart game',
        error: error.message
      });
    }
  }

  // Helper Functions
  generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9);
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

  getNextPlayer(room, currentUserId) {
    const currentIndex = room.players.findIndex(p => p.userId === currentUserId);
    const nextIndex = (currentIndex + 1) % room.players.length;
    return room.players[nextIndex].userId;
  }

  async saveCompletedGame(room) {
    try {
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

      console.log('💾 Tic Tac Toe game saved to database');
    } catch (error) {
      console.error('❌ Error saving completed game:', error);
    }
  }
}

module.exports = new GameController();
