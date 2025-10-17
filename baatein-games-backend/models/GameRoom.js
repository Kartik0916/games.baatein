const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
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
  host: {
    userId: String,
    username: String,
    avatar: String
  },
  players: [{
    userId: String,
    username: String,
    avatar: String,
    ready: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  maxPlayers: {
    type: Number,
    default: 2
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
  password: {
    type: String,
    default: null
  },
  agoraChannel: {
    type: String,
    required: true
  },
  agoraToken: {
    type: String
  },
  gameSettings: {
    timeLimit: Number, // in seconds per move
    allowSpectators: { type: Boolean, default: false },
    enableChat: { type: Boolean, default: true },
    enableVoice: { type: Boolean, default: true },
    enableVideo: { type: Boolean, default: true }
  },
  spectators: [{
    userId: String,
    username: String,
    joinedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-delete after 1 hour
  }
}, {
  timestamps: true
});

// Indexes
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

// Static method to get available rooms
gameRoomSchema.statics.getAvailableRooms = function(gameType = null) {
  const query = {
    status: 'waiting',
    isPrivate: false
  };
  
  if (gameType) {
    query.gameType = gameType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .exec();
};

module.exports = mongoose.model('GameRoom', gameRoomSchema);