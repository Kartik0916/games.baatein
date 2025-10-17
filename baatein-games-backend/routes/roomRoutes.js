// ===== routes/roomRoutes.js =====
// Room routes for API endpoints

const express = require('express');
const router = express.Router();
const Room = require('../models/GameRoom');

// Get all active rooms
router.get('/active', async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'waiting' })
      .select('roomId gameType players createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      rooms: rooms.map(room => ({
        roomId: room.roomId,
        gameType: room.gameType,
        playerCount: room.players.length,
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
});

// Get room by ID
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

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
        players: room.players,
        status: room.status,
        gameState: room.gameState,
        currentTurn: room.currentTurn,
        agoraChannel: room.agoraChannel,
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
});

module.exports = router;
