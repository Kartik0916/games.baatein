const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
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
    avatar: String,
    color: String, // For games like Ludo
    score: {
      type: Number,
      default: 0
    }
  }],
  winner: {
    type: String, // userId or 'draw'
    default: null
  },
  moves: [{
    playerId: String,
    moveData: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  gameState: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting'
  },
  endReason: {
    type: String,
    enum: ['normal', 'resignation', 'timeout', 'opponent_left', 'draw_agreement'],
    default: 'normal'
  },
  videoDuration: {
    type: Number, // in seconds
    default: 0
  },
  chatMessages: [{
    userId: String,
    username: String,
    message: String,
    timestamp: Date
  }]
}, {
  timestamps: true
});

// Indexes
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ gameType: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ startTime: -1 });
gameSchema.index({ createdAt: -1 });

// Static method to get user's game history
gameSchema.statics.getUserGameHistory = function(userId, limit = 20) {
  return this.find({ 
    'players.userId': userId,
    status: 'completed'
  })
  .sort({ endTime: -1 })
  .limit(limit)
  .exec();
};

// Static method to get leaderboard
gameSchema.statics.getLeaderboard = async function(gameType = null) {
  const User = mongoose.model('User');
  const query = gameType ? {} : {};
  
  return User.find(query)
    .sort({ 'stats.gamesWon': -1 })
    .limit(100)
    .select('userId username avatar stats gameStats')
    .exec();
};

module.exports = mongoose.model('Game', gameSchema);