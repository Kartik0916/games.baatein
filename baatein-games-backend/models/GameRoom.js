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
    enum: ['tic-tac-toe'],
    default: 'tic-tac-toe'
  },
  host: {
    userId: String,
    username: String,
    avatar: String
  },
  players: [{
    userId: String,
    username: String,
    avatar: String,
    symbol: {
      type: String,
      enum: ['X', 'O']
    },
    ready: { 
      type: Boolean, 
      default: false 
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  maxPlayers: {
    type: Number,
    default: 2,
    min: 2,
    max: 2
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: String,
  gameSettings: {
    enableChat: { 
      type: Boolean, 
      default: true 
    },
    timeLimit: {
      type: Number,
      default: null // No time limit by default
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-delete after 1 hour
  }
}, {
  timestamps: true
});

// Create indexes for better performance
gameRoomSchema.index({ status: 1 });
gameRoomSchema.index({ gameType: 1, status: 1 });
gameRoomSchema.index({ 'host.userId': 1 });
gameRoomSchema.index({ createdAt: -1 });

// Method to check if room is full
gameRoomSchema.methods.isFull = function() {
  return this.players.length >= this.maxPlayers;
};

// Method to check if user is in room
gameRoomSchema.methods.hasPlayer = function(userId) {
  return this.players.some(p => p.userId === userId);
};

// Method to get player by userId
gameRoomSchema.methods.getPlayer = function(userId) {
  return this.players.find(p => p.userId === userId);
};

// Method to check if all players are ready
gameRoomSchema.methods.allPlayersReady = function() {
  return this.players.length === this.maxPlayers && 
         this.players.every(p => p.ready);
};

// Method to assign symbols to players
gameRoomSchema.methods.assignSymbols = function() {
  if (this.players.length === 2) {
    this.players[0].symbol = 'X';
    this.players[1].symbol = 'O';
  }
};

// Static method to get available tic-tac-toe rooms
gameRoomSchema.statics.getAvailableTicTacToeRooms = function() {
  return this.find({
    gameType: 'tic-tac-toe',
    status: 'waiting',
    isPrivate: false
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .exec();
};

// Static method to create a new tic-tac-toe room
gameRoomSchema.statics.createTicTacToeRoom = function(hostData) {
  const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
  
  return new this({
    roomId,
    gameType: 'tic-tac-toe',
    host: {
      userId: hostData.userId,
      username: hostData.username,
      avatar: hostData.avatar
    },
    players: [{
      userId: hostData.userId,
      username: hostData.username,
      avatar: hostData.avatar,
      symbol: 'X', // Host gets X
      ready: false
    }],
    maxPlayers: 2,
    status: 'waiting',
    isPrivate: false
  });
};

// Pre-save middleware to assign symbols
gameRoomSchema.pre('save', function(next) {
  if (this.players.length === 2 && !this.players[0].symbol) {
    this.assignSymbols();
  }
  next();
});

module.exports = mongoose.model('GameRoom', gameRoomSchema);