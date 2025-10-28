// ===== controllers/roomController.js =====
// Tic Tac Toe Room Controller

const GameRoom = require('../models/GameRoom');
const User = require('../models/User');

class RoomController {
  // Create a new Tic Tac Toe room
  async createRoom(req, res) {
    try {
      const { userId, username, avatar, isPrivate = false, password = null, gameSettings = {} } = req.body;

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
          ready: false,
          joinedAt: new Date()
        }],
        status: 'waiting',
        maxPlayers: 2,
        isPrivate,
        password,
        gameSettings: {
          enableChat: gameSettings.enableChat !== false,
          timeLimit: gameSettings.timeLimit || null
        },
        createdAt: new Date()
      };

      const room = new GameRoom(roomData);
      await room.save();

      console.log(`🎮 Tic Tac Toe room created: ${roomId} by ${username}`);

      res.json({
        success: true,
        room: {
          roomId: room.roomId,
          gameType: room.gameType,
          host: room.host,
          players: room.players,
          status: room.status,
          maxPlayers: room.maxPlayers,
          isPrivate: room.isPrivate,
          gameSettings: room.gameSettings,
          createdAt: room.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Error creating room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create room',
        error: error.message
      });
    }
  }

  // Join a Tic Tac Toe room
  async joinRoom(req, res) {
    try {
      const { roomId } = req.params;
      const { userId, username, avatar, password } = req.body;

      if (!userId || !username) {
        return res.status(400).json({
          success: false,
          message: 'User ID and username are required'
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

      if (room.isFull()) {
        return res.status(400).json({
          success: false,
          message: 'Room is full'
        });
      }

      if (room.isPrivate && room.password && room.password !== password) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }

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
          maxPlayers: room.maxPlayers,
          gameSettings: room.gameSettings
        }
      });

    } catch (error) {
      console.error('❌ Error joining room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join room',
        error: error.message
      });
    }
  }

  // Leave a Tic Tac Toe room
  async leaveRoom(req, res) {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      if (!room.hasPlayer(userId)) {
        return res.status(400).json({
          success: false,
          message: 'User not in this room'
        });
      }

      // Remove player from room
      room.players = room.players.filter(p => p.userId !== userId);

      // If no players left, delete the room
      if (room.players.length === 0) {
        await GameRoom.deleteOne({ roomId });
        console.log(`🗑️ Room ${roomId} deleted (no players left)`);
      } else {
        // If host left, assign new host
        if (room.host.userId === userId) {
          room.host = {
            userId: room.players[0].userId,
            username: room.players[0].username,
            avatar: room.players[0].avatar
          };
        }
        await room.save();
        console.log(`👋 Player ${userId} left room ${roomId}`);
      }

      res.json({
        success: true,
        message: 'Left room successfully'
      });

    } catch (error) {
      console.error('❌ Error leaving room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to leave room',
        error: error.message
      });
    }
  }

  // Get all active Tic Tac Toe rooms
  async getActiveRooms(req, res) {
    try {
      const rooms = await GameRoom.getAvailableTicTacToeRooms();

      res.json({
        success: true,
        rooms: rooms.map(room => ({
          roomId: room.roomId,
          gameType: room.gameType,
          host: room.host,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          isPrivate: room.isPrivate,
          createdAt: room.createdAt
        }))
      });

    } catch (error) {
      console.error('❌ Error getting active rooms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active rooms',
        error: error.message
      });
    }
  }

  // Get room by ID
  async getRoomById(req, res) {
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
          isPrivate: room.isPrivate,
          gameSettings: room.gameSettings,
          createdAt: room.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Error getting room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get room',
        error: error.message
      });
    }
  }

  // Helper method to generate room ID
  generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new RoomController();