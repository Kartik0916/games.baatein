// ===== utils/gameLogic.js =====
// Game logic utilities for backend

const TicTacToeLogic = {
  createBoard: () => Array(9).fill(null),
  
  checkWinner: (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    
    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    
    return board.every(cell => cell !== null) ? { winner: 'draw' } : null;
  },
  
  makeMove: (board, position, player) => {
    if (board[position]) return null;
    const newBoard = [...board];
    newBoard[position] = player;
    return newBoard;
  },

  isValidMove: (board, position) => {
    return position >= 0 && position < 9 && board[position] === null;
  },

  // Get player symbol based on player index
  getPlayerSymbol: (playerIndex) => {
    return playerIndex === 0 ? 'X' : 'O';
  },

  // Check if game is over
  isGameOver: (board) => {
    const result = TicTacToeLogic.checkWinner(board);
    return result !== null;
  },

  // Get available moves
  getAvailableMoves: (board) => {
    return board
      .map((cell, index) => cell === null ? index : null)
      .filter(index => index !== null);
  }
};

module.exports = {
  TicTacToeLogic
};
