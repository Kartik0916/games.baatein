// ===== controllers/gameController.js =====
// Tic Tac Toe Game Controller

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

      // Create or update user
      await User.findOneAndUpdate(
        { userId },
        {
          userId,
          username,
          avatar: avatar || '😀',
          lastActive: new Date()
        },
        { upsert: true }
      );

      const roomId = this.generateRoomId();
      
      const roomData = {
        roomId,
        gameType: 'tic-tac-toe',
        host: {
          userId,
          username,
          avatar: avatar || '😀'
        },
        players: [{
          userId,
          username,
          avatar: avatar || '😀',
          symbol: 'X',
          ready: false
        }],
        status: 'waiting',
        maxPlayers: 2,
        isPrivate: false,
        createdAt: new Date()
      };

      // Save room to database
      const gameRoom = new GameRoom(roomData);
      await gameRoom.save();

      console.log(`🎮 Tic Tac Toe room created: ${roomId} by ${username}`);

      res.json({
        success: true,
        room: {
          roomId: gameRoom.roomId,
          gameType: gameRoom.gameType,
          host: gameRoom.host,
          players: gameRoom.players,
          status: gameRoom.status,
          maxPlayers: gameRoom.maxPlayers,
          createdAt: gameRoom.createdAt
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
          message: 'Room ID, User ID, and username are required'
        });
      }

      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      if (room.status !== 'waiting') {
        return res.status(400).json({
          success: false,
          message: 'Game already started or finished'
        });
      }

      if (room.players.length >= room.maxPlayers) {
        return res.status(400).json({
          success: false,
          message: 'Room is full'
        });
      }

      // Check if user is already in the room
      if (room.hasPlayer(userId)) {
        return res.status(400).json({
          success: false,
          message: 'User already in this room'
        });
      }

      // Create or update user
      await User.findOneAndUpdate(
        { userId },
        {
          userId,
          username,
          avatar: avatar || '😀',
          lastActive: new Date()
        },
        { upsert: true }
      );

      // Add player to room
      room.players.push({
        userId,
        username,
        avatar: avatar || '😀',
        symbol: 'O', // Second player gets O
        ready: false,
        joinedAt: new Date()
      });

      await room.save();

      console.log(`👥 Player ${username} joined Tic Tac Toe room ${roomId}`);

      res.json({
        success: true,
        room: {
          roomId: room.roomId,
          gameType: room.gameType,
          host: room.host,
          players: room.players,
          status: room.status,
          maxPlayers: room.maxPlayers
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

  // Handle Tic Tac Toe move
  async handleTicTacToeMove(req, res) {
    try {
      const { roomId, userId, position } = req.body;

      if (!roomId || !userId || position === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Room ID, User ID, and position are required'
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
          message: 'Game is not active'
        });
      }

      const player = room.getPlayer(userId);
      if (!player) {
        return res.status(400).json({
          success: false,
          message: 'Player not found in room'
        });
      }

      // Validate move
      if (position < 0 || position > 8) {
        return res.status(400).json({
          success: false,
          message: 'Invalid position'
        });
      }

      // Check if it's player's turn (this would be handled by socket in real-time)
      // For API endpoint, we'll just validate the move structure
      const move = {
        position,
        player: userId,
        symbol: player.symbol,
        timestamp: new Date()
      };

      res.json({
        success: true,
        message: 'Move processed',
        move
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

  // Restart Tic Tac Toe game
  async restartTicTacToeGame(req, res) {
    try {
      const { roomId, userId } = req.body;

      if (!roomId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID and User ID are required'
        });
      }

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

      // Check if user is in the room
      if (!room.hasPlayer(userId)) {
        return res.status(400).json({
          success: false,
          message: 'User not in this room'
        });
      }

      // Reset game state
      room.status = 'waiting';
      room.players.forEach(player => {
        player.ready = false;
      });

      await room.save();

      console.log(`🔄 Tic Tac Toe game restarted in room ${roomId}`);

      res.json({
        success: true,
        message: 'Game restarted successfully',
        room: {
          roomId: room.roomId,
          status: room.status,
          players: room.players
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

  // Get game room by ID
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
          host: room.host,
          players: room.players,
          status: room.status,
          maxPlayers: room.maxPlayers,
          createdAt: room.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Error getting game room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get room',
        error: error.message
      });
    }
  }

  // Get user's Tic Tac Toe game history
  async getUserGameHistory(req, res) {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const games = await Game.getUserTicTacToeHistory(userId, limit);

      res.json({
        success: true,
        games: games.map(game => game.getGameSummary())
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

  // Get user's Tic Tac Toe statistics
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

      res.json({
        success: true,
        stats: user.getProfileSummary()
      });

    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user stats',
        error: error.message
      });
    }
  }

  // Get top Tic Tac Toe players
  async getTopPlayers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const topPlayers = await User.getTopTicTacToePlayers(limit);

      res.json({
        success: true,
        players: topPlayers.map(player => ({
          username: player.username,
          avatar: player.avatar,
          stats: player.ticTacToeStats
        }))
      });

    } catch (error) {
      console.error('❌ Error getting top players:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get top players',
        error: error.message
      });
    }
  }

  // Helper method to generate room ID
  generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new GameController();