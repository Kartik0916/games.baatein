// ===== routes/gameRoutes.js =====
// Tic Tac Toe Game Routes

const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Tic Tac Toe Routes
router.post('/tic-tac-toe/create', gameController.createTicTacToeGame);
router.post('/tic-tac-toe/join', gameController.joinTicTacToeGame);
router.post('/tic-tac-toe/move', gameController.handleTicTacToeMove);
router.post('/tic-tac-toe/restart', gameController.restartTicTacToeGame);

// General Game Routes
router.get('/room/:roomId', gameController.getGameRoom);
router.get('/history/:userId', gameController.getUserGameHistory);
router.get('/stats/:userId', gameController.getUserStats);
router.get('/top-players', gameController.getTopPlayers);

module.exports = router;