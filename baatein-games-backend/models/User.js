// ===== models/User.js =====
// User model for storing user information and statistics

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
    unique: true
  },
  avatar: {
    type: String,
    default: '👤'
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
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ userId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ lastActive: -1 });

// Method to calculate win rate
userSchema.methods.getWinRate = function() {
  if (this.stats.gamesPlayed === 0) return 0;
  return ((this.stats.gamesWon / this.stats.gamesPlayed) * 100).toFixed(1);
};

module.exports = mongoose.model('User', userSchema);