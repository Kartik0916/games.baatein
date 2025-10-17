// ===== routes/userRoutes.js =====
// User routes for API endpoints

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create or update user
router.post('/create', async (req, res) => {
  try {
    const { userId, username, avatar } = req.body;

    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        message: 'User ID and username are required'
      });
    }

    const user = await User.findOneAndUpdate(
      { userId },
      {
        userId,
        username,
        avatar: avatar || '👤',
        lastActive: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`👤 User created/updated: ${username} (${userId})`);

    res.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        avatar: user.avatar,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        avatar: user.avatar,
        stats: user.stats,
        winRate: user.getWinRate()
      }
    });
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

// Update user last active time
router.put('/:userId/active', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findOneAndUpdate(
      { userId },
      { lastActive: new Date() }
    );

    res.json({
      success: true,
      message: 'User activity updated'
    });
  } catch (error) {
    console.error('❌ Error updating user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user activity',
      error: error.message
    });
  }
});

module.exports = router;
