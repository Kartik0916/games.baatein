// ===== models/Game.js =====
// Game model for storing completed games

const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
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
    }
  }],
  winner: {
    type: String,
    default: null
  },
  moves: [{
    position: Number,
    player: String,
    symbol: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  duration: {
    type: Number, // in seconds
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'abandoned'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Index for better query performance
gameSchema.index({ roomId: 1 });
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ gameType: 1 });
gameSchema.index({ endTime: -1 });

module.exports = mongoose.model('Game', gameSchema);