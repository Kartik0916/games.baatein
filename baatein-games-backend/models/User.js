const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  avatar: {
    type: String,
    default: '😀'
  },
  stats: {
    gamesPlayed: { 
      type: Number, 
      default: 0 
    },
    gamesWon: { 
      type: Number, 
      default: 0 
    },
    gamesLost: { 
      type: Number, 
      default: 0 
    },
    gamesDraw: { 
      type: Number, 
      default: 0 
    },
    totalPlayTime: { 
      type: Number, 
      default: 0 
    }
  },
  ticTacToeStats: {
    played: { 
      type: Number, 
      default: 0 
    },
    wins: { 
      type: Number, 
      default: 0 
    },
    losses: { 
      type: Number, 
      default: 0 
    },
    draws: { 
      type: Number, 
      default: 0 
    },
    winStreak: {
      type: Number,
      default: 0
    },
    longestWinStreak: {
      type: Number,
      default: 0
    },
    averageGameTime: {
      type: Number,
      default: 0
    }
  },
  settings: {
    notifications: { 
      type: Boolean, 
      default: true 
    },
    soundEnabled: { 
      type: Boolean, 
      default: true 
    },
    publicProfile: { 
      type: Boolean, 
      default: true 
    }
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

// Create indexes for better performance
userSchema.index({ username: 1 });
userSchema.index({ 'stats.gamesWon': -1 });
userSchema.index({ 'ticTacToeStats.wins': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActive: -1 });

// Virtual for overall win rate
userSchema.virtual('winRate').get(function() {
  if (this.stats.gamesPlayed === 0) return 0;
  return ((this.stats.gamesWon / this.stats.gamesPlayed) * 100).toFixed(2);
});

// Virtual for tic-tac-toe win rate
userSchema.virtual('ticTacToeWinRate').get(function() {
  if (this.ticTacToeStats.played === 0) return 0;
  return ((this.ticTacToeStats.wins / this.ticTacToeStats.played) * 100).toFixed(2);
});

// Method to update tic-tac-toe stats after game
userSchema.methods.updateTicTacToeStats = async function(result, gameDuration = 0) {
  // Update overall stats
  this.stats.gamesPlayed += 1;
  this.stats.totalPlayTime += gameDuration;
  
  if (result === 'win') {
    this.stats.gamesWon += 1;
    this.ticTacToeStats.wins += 1;
    this.ticTacToeStats.winStreak += 1;
    
    // Update longest win streak
    if (this.ticTacToeStats.winStreak > this.ticTacToeStats.longestWinStreak) {
      this.ticTacToeStats.longestWinStreak = this.ticTacToeStats.winStreak;
    }
  } else if (result === 'loss') {
    this.stats.gamesLost += 1;
    this.ticTacToeStats.losses += 1;
    this.ticTacToeStats.winStreak = 0; // Reset win streak
  } else if (result === 'draw') {
    this.stats.gamesDraw += 1;
    this.ticTacToeStats.draws += 1;
    this.ticTacToeStats.winStreak = 0; // Reset win streak
  }

  // Update tic-tac-toe specific stats
  this.ticTacToeStats.played += 1;
  
  // Update average game time
  const totalTime = this.ticTacToeStats.averageGameTime * (this.ticTacToeStats.played - 1) + gameDuration;
  this.ticTacToeStats.averageGameTime = Math.round(totalTime / this.ticTacToeStats.played);

  this.lastActive = new Date();
  await this.save();
};

// Static method to get top tic-tac-toe players
userSchema.statics.getTopTicTacToePlayers = function(limit = 10) {
  return this.find({
    'ticTacToeStats.played': { $gte: 1 }
  })
  .sort({ 'ticTacToeStats.wins': -1, 'ticTacToeStats.winRate': -1 })
  .limit(limit)
  .select('username avatar ticTacToeStats')
  .exec();
};

// Static method to get user by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

// Method to get user profile summary
userSchema.methods.getProfileSummary = function() {
  return {
    userId: this.userId,
    username: this.username,
    avatar: this.avatar,
    stats: {
      gamesPlayed: this.stats.gamesPlayed,
      gamesWon: this.stats.gamesWon,
      gamesLost: this.stats.gamesLost,
      gamesDraw: this.stats.gamesDraw,
      winRate: this.winRate,
      totalPlayTime: this.stats.totalPlayTime
    },
    ticTacToeStats: {
      played: this.ticTacToeStats.played,
      wins: this.ticTacToeStats.wins,
      losses: this.ticTacToeStats.losses,
      draws: this.ticTacToeStats.draws,
      winRate: this.ticTacToeWinRate,
      winStreak: this.ticTacToeStats.winStreak,
      longestWinStreak: this.ticTacToeStats.longestWinStreak,
      averageGameTime: this.ticTacToeStats.averageGameTime
    },
    lastActive: this.lastActive,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);