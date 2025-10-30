// Ludo constants and board mapping (2-player opposite colors: red vs blue)

module.exports = {
  COLORS: {
    RED: 'red',
    BLUE: 'blue'
  },

  // Track indices 0..51 clockwise (we use abstract indices, UI maps to coordinates)
  TRACK_LENGTH: 52,

  // Opposite start indices for 2-player
  START_INDEX_BY_COLOR: {
    red: 0,
    blue: 26
  },

  // Classic safe tiles (adjustable)
  SAFE_TILES: [0, 8, 13, 21, 26, 34, 39, 47],

  // Home lane entry index before switching to lane[0]
  LANE_ENTRY_INDEX: {
    red: 51,   // red finishes loop then enters lane
    blue: 25   // blue finishes loop then enters lane
  },

  // Home lane length (steps to goal)
  LANE_LENGTH: 6,

  TOKENS_PER_PLAYER: 4,

  // Max consecutive 6 rule
  MAX_CONSECUTIVE_SIXES: 3
};


