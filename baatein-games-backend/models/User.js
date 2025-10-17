const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true
  },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=User'
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    gamesDraw: { type: Number, default: 0 },
    totalPlayTime: { type: Number, default: 0 } // in seconds
  },
  gameStats: {
    ticTacToe: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 }
    },
    chess: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 }
    },
    ludo: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    pool8Ball: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    }
  },
  achievements: [{
    name: String,
    description: String,
    earnedAt: Date,
    icon: String
  }],
  friends: [{
    userId: String,
    username: String,
    addedAt: { type: Date, default: Date.now }
  }],
  settings: {
    notifications: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    publicProfile: { type: Boolean, default: true }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ 'stats.gamesWon': -1 });
userSchema.index({ createdAt: -1 });

// Virtual for win rate
userSchema.virtual('winRate').get(function() {
  if (this.stats.gamesPlayed === 0) return 0;
  return ((this.stats.gamesWon / this.stats.gamesPlayed) * 100).toFixed(2);
});

// Method to update stats
userSchema.methods.updateStats = async function(gameType, result) {
  this.stats.gamesPlayed += 1;
  
  if (result === 'win') {
    this.stats.gamesWon += 1;
  } else if (result === 'loss') {
    this.stats.gamesLost += 1;
  } else if (result === 'draw') {
    this.stats.gamesDraw += 1;
  }

  // Update game-specific stats
  const gameTypeMap = {
    'tic-tac-toe': 'ticTacToe',
    'chess': 'chess',
    'ludo': 'ludo',
    '8ball-pool': 'pool8Ball'
  };

  const statKey = gameTypeMap[gameType];
  if (statKey && this.gameStats[statKey]) {
    this.gameStats[statKey].played += 1;
    if (result === 'win') this.gameStats[statKey].wins += 1;
    if (result === 'loss') this.gameStats[statKey].losses += 1;
    if (result === 'draw' && this.gameStats[statKey].draws !== undefined) {
      this.gameStats[statKey].draws += 1;
    }
  }

  this.lastActive = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);