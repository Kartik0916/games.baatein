// ===== models/GameRoom.js =====
// GameRoom model for storing active game rooms

const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  gameType: {
    type: String,
    required: true,
    enum: ['tic-tac-toe', 'chess', 'ludo', '8ball-pool']
  },
  players: [{
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: '👤'
    },
    ready: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  gameState: {
    board: {
      type: [String],
      default: Array(9).fill(null)
    },
    moves: {
      type: [Object],
      default: []
    }
  },
  currentTurn: {
    type: String,
    default: null
  },
  winner: {
    type: String,
    default: null
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  agoraChannel: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
gameRoomSchema.index({ roomId: 1 });
gameRoomSchema.index({ status: 1 });
gameRoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // Auto-delete after 1 hour

module.exports = mongoose.model('GameRoom', gameRoomSchema);