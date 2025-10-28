// ===== routes/roomRoutes.js =====
// Tic Tac Toe Room Routes

const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Create a new Tic Tac Toe room
router.post('/create', roomController.createRoom);

// Join a Tic Tac Toe room
router.post('/:roomId/join', roomController.joinRoom);

// Leave a Tic Tac Toe room
router.post('/:roomId/leave', roomController.leaveRoom);

// Get all active Tic Tac Toe rooms
router.get('/active', roomController.getActiveRooms);

// Get room by ID
router.get('/:roomId', roomController.getRoomById);

module.exports = router;