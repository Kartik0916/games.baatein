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
    enum: ['tic-tac-toe'],
    default: 'tic-tac-toe'
  },
  players: [{
    userId: String,
    username: String,
    avatar: String,
    symbol: {
      type: String,
      enum: ['X', 'O']
    }
  }],
  winner: {
    type: String,
    default: null // userId of winner, 'draw', or null
  },
  moves: [{
    position: {
      type: Number,
      min: 0,
      max: 8
    },
    player: String, // userId
    symbol: {
      type: String,
      enum: ['X', 'O']
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  gameState: {
    board: {
      type: [String],
      default: Array(9).fill(null)
    },
    winner: {
      type: String,
      default: null
    },
    isDraw: {
      type: Boolean,
      default: false
    },
    gameOver: {
      type: Boolean,
      default: false
    }
  },
  duration: {
    type: Number,
    default: 0 // in seconds
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting'
  },
  endReason: {
    type: String,
    enum: ['normal', 'resignation', 'timeout', 'opponent_left', 'draw_accepted'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Create indexes for better performance
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ gameType: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ startTime: -1 });
gameSchema.index({ createdAt: -1 });

// Static method to get user's tic-tac-toe game history
gameSchema.statics.getUserTicTacToeHistory = function(userId, limit = 20) {
  return this.find({ 
    'players.userId': userId,
    gameType: 'tic-tac-toe',
    status: 'completed'
  })
  .sort({ endTime: -1 })
  .limit(limit)
  .exec();
};

// Static method to get user's tic-tac-toe statistics
gameSchema.statics.getUserTicTacToeStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        'players.userId': userId,
        gameType: 'tic-tac-toe',
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        gamesWon: {
          $sum: {
            $cond: [{ $eq: ['$winner', userId] }, 1, 0]
          }
        },
        gamesLost: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$winner', userId] },
                  { $ne: ['$winner', 'draw'] },
                  { $ne: ['$winner', null] }
                ]
              },
              1,
              0
            ]
          }
        },
        gamesDraw: {
          $sum: {
            $cond: [{ $eq: ['$winner', 'draw'] }, 1, 0]
          }
        },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
};

// Instance method to check if game is valid tic-tac-toe game
gameSchema.methods.isValidTicTacToeGame = function() {
  return this.gameType === 'tic-tac-toe' && 
         this.players.length === 2 &&
         this.gameState.board.length === 9;
};

// Instance method to get game summary
gameSchema.methods.getGameSummary = function() {
  const player1 = this.players[0];
  const player2 = this.players[1];
  
  return {
    roomId: this.roomId,
    players: [
      { username: player1.username, symbol: player1.symbol },
      { username: player2.username, symbol: player2.symbol }
    ],
    winner: this.winner,
    duration: this.duration,
    movesCount: this.moves.length,
    endReason: this.endReason,
    createdAt: this.createdAt,
    completedAt: this.endTime
  };
};

module.exports = mongoose.model('Game', gameSchema);