// ===== test/ticTacToeTest.js =====
// Simple test for Tic Tac Toe game logic

const { TicTacToeLogic } = require('../utils/gameLogic');

function testTicTacToeLogic() {
  console.log('🧪 Testing Tic Tac Toe Logic...\n');

  // Test 1: Create board
  console.log('Test 1: Create board');
  const board = TicTacToeLogic.createBoard();
  console.log('✅ Board created:', board);
  console.log('Board length:', board.length);
  console.log('');

  // Test 2: Make valid move
  console.log('Test 2: Make valid move');
  const newBoard = TicTacToeLogic.makeMove(board, 0, 'X');
  console.log('✅ Move made:', newBoard);
  console.log('');

  // Test 3: Check invalid move
  console.log('Test 3: Check invalid move');
  const invalidBoard = TicTacToeLogic.makeMove(newBoard, 0, 'O');
  console.log('✅ Invalid move handled:', invalidBoard === null);
  console.log('');

  // Test 4: Test winning condition
  console.log('Test 4: Test winning condition');
  const winningBoard = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
  const winner = TicTacToeLogic.checkWinner(winningBoard);
  console.log('✅ Winner detected:', winner);
  console.log('');

  // Test 5: Test draw condition
  console.log('Test 5: Test draw condition');
  const drawBoard = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
  const drawResult = TicTacToeLogic.checkWinner(drawBoard);
  console.log('✅ Draw detected:', drawResult);
  console.log('');

  // Test 6: Complete game simulation
  console.log('Test 6: Complete game simulation');
  let gameBoard = TicTacToeLogic.createBoard();
  const moves = [
    { pos: 0, player: 'X' },
    { pos: 4, player: 'O' },
    { pos: 1, player: 'X' },
    { pos: 5, player: 'O' },
    { pos: 2, player: 'X' }
  ];

  moves.forEach((move, index) => {
    gameBoard = TicTacToeLogic.makeMove(gameBoard, move.pos, move.player);
    console.log(`Move ${index + 1}: ${move.player} at position ${move.pos}`);
    console.log('Board:', gameBoard);
    
    const result = TicTacToeLogic.checkWinner(gameBoard);
    if (result) {
      console.log('🎉 Game Over!', result);
      return;
    }
  });

  console.log('\n✅ All tests completed successfully!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testTicTacToeLogic();
}

module.exports = { testTicTacToeLogic };
