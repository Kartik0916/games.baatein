// ===== utils/gameLogic.js =====

// ==================== TIC TAC TOE LOGIC ====================
export const TicTacToeLogic = {
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
  },

  // Create initial game state for multiplayer
  createGameState: (roomId, players) => {
    return {
      roomId,
      gameType: 'tic-tac-toe',
      board: Array(9).fill(null),
      moves: [],
      currentTurn: players[0].userId,
      players: players.map((player, index) => ({
        ...player,
        symbol: TicTacToeLogic.getPlayerSymbol(index),
        ready: false
      })),
      status: 'waiting',
      winner: null,
      createdAt: new Date()
    };
  }
};


// ==================== CONNECT FOUR LOGIC ====================
export const ConnectFourLogic = {
  ROWS: 6,
  COLS: 7,
  
  createBoard: () => Array(6).fill(null).map(() => Array(7).fill(null)),
  
  makeMove: (board, column, player) => {
    // Find the lowest empty row in the column
    for (let row = 5; row >= 0; row--) {
      if (board[row][column] === null) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][column] = player;
        return { success: true, board: newBoard, row, column };
      }
    }
    return { success: false, board, row: -1, column: -1 };
  },
  
  checkWinner: (board) => {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        if (board[row][col] && 
            board[row][col] === board[row][col + 1] &&
            board[row][col] === board[row][col + 2] &&
            board[row][col] === board[row][col + 3]) {
          return {
            winner: board[row][col],
            line: [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]]
          };
        }
      }
    }
    
    // Check vertical
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col] &&
            board[row][col] === board[row + 2][col] &&
            board[row][col] === board[row + 3][col]) {
          return {
            winner: board[row][col],
            line: [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]]
          };
        }
      }
    }
    
    // Check diagonal (down-right)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col + 1] &&
            board[row][col] === board[row + 2][col + 2] &&
            board[row][col] === board[row + 3][col + 3]) {
          return {
            winner: board[row][col],
            line: [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]]
          };
        }
      }
    }
    
    // Check diagonal (down-left)
    for (let row = 0; row < 3; row++) {
      for (let col = 3; col < 7; col++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col - 1] &&
            board[row][col] === board[row + 2][col - 2] &&
            board[row][col] === board[row + 3][col - 3]) {
          return {
            winner: board[row][col],
            line: [[row, col], [row + 1, col - 1], [row + 2, col - 2], [row + 3, col - 3]]
          };
        }
      }
    }
    
    // Check for draw
    const isFull = board.every(row => row.every(cell => cell !== null));
    return isFull ? { winner: 'draw' } : null;
  },
  
  isValidMove: (board, column) => {
    return column >= 0 && column < 7 && board[0][column] === null;
  }
};


// ==================== ROCK PAPER SCISSORS LOGIC ====================
export const RockPaperScissorsLogic = {
  choices: ['rock', 'paper', 'scissors'],
  
  determineWinner: (player1Choice, player2Choice) => {
    if (player1Choice === player2Choice) {
      return 'draw';
    }
    
    const winConditions = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };
    
    return winConditions[player1Choice] === player2Choice ? 'player1' : 'player2';
  },
  
  getChoiceEmoji: (choice) => {
    const emojis = {
      rock: '✊',
      paper: '✋',
      scissors: '✌️'
    };
    return emojis[choice] || '';
  },
  
  createInitialState: (rounds = 3) => ({
    rounds,
    currentRound: 1,
    player1Score: 0,
    player2Score: 0,
    player1Choice: null,
    player2Choice: null,
    roundWinner: null,
    gameWinner: null,
    history: []
  }),
  
  processRound: (state, player1Choice, player2Choice) => {
    const roundWinner = RockPaperScissorsLogic.determineWinner(player1Choice, player2Choice);
    
    const newState = { ...state };
    newState.player1Choice = player1Choice;
    newState.player2Choice = player2Choice;
    newState.roundWinner = roundWinner;
    
    if (roundWinner === 'player1') {
      newState.player1Score++;
    } else if (roundWinner === 'player2') {
      newState.player2Score++;
    }
    
    newState.history.push({
      round: state.currentRound,
      player1Choice,
      player2Choice,
      winner: roundWinner
    });
    
    // Check if game is over
    if (newState.currentRound >= newState.rounds) {
      if (newState.player1Score > newState.player2Score) {
        newState.gameWinner = 'player1';
      } else if (newState.player2Score > newState.player1Score) {
        newState.gameWinner = 'player2';
      } else {
        newState.gameWinner = 'draw';
      }
    } else {
      newState.currentRound++;
      newState.player1Choice = null;
      newState.player2Choice = null;
      newState.roundWinner = null;
    }
    
    return newState;
  }
};


// ==================== QUIZ GAME LOGIC ====================
export const QuizGameLogic = {
  // Sample questions - you can expand this
  questionBank: [
    {
      id: 1,
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      category: "Geography"
    },
    {
      id: 2,
      question: "What is 15 + 27?",
      options: ["40", "42", "43", "45"],
      correctAnswer: 1,
      category: "Math"
    },
    {
      id: 3,
      question: "Who painted the Mona Lisa?",
      options: ["Van Gogh", "Da Vinci", "Picasso", "Michelangelo"],
      correctAnswer: 1,
      category: "Art"
    },
    {
      id: 4,
      question: "What is the largest planet in our solar system?",
      options: ["Mars", "Saturn", "Jupiter", "Neptune"],
      correctAnswer: 2,
      category: "Science"
    },
    {
      id: 5,
      question: "Which programming language is known as the language of the web?",
      options: ["Python", "JavaScript", "Java", "C++"],
      correctAnswer: 1,
      category: "Technology"
    },
    {
      id: 6,
      question: "What is the chemical symbol for gold?",
      options: ["Go", "Gd", "Au", "Ag"],
      correctAnswer: 2,
      category: "Science"
    },
    {
      id: 7,
      question: "Which country is home to the kangaroo?",
      options: ["New Zealand", "Australia", "South Africa", "Brazil"],
      correctAnswer: 1,
      category: "Geography"
    },
    {
      id: 8,
      question: "What is 12 × 8?",
      options: ["84", "92", "96", "108"],
      correctAnswer: 2,
      category: "Math"
    },
    {
      id: 9,
      question: "Who wrote 'Romeo and Juliet'?",
      options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
      correctAnswer: 1,
      category: "Literature"
    },
    {
      id: 10,
      question: "What is the smallest prime number?",
      options: ["0", "1", "2", "3"],
      correctAnswer: 2,
      category: "Math"
    }
  ],
  
  createGameState: (totalQuestions = 5) => {
    const selectedQuestions = QuizGameLogic.getRandomQuestions(totalQuestions);
    return {
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      player1Answers: [],
      player2Answers: [],
      player1Score: 0,
      player2Score: 0,
      player1Answered: false,
      player2Answered: false,
      gameOver: false,
      winner: null
    };
  },
  
  getRandomQuestions: (count) => {
    const shuffled = [...QuizGameLogic.questionBank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },
  
  submitAnswer: (state, playerId, answerIndex) => {
    const newState = { ...state };
    const currentQuestion = state.questions[state.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    if (playerId === 'player1') {
      newState.player1Answers.push({
        questionId: currentQuestion.id,
        answer: answerIndex,
        correct: isCorrect
      });
      newState.player1Answered = true;
      if (isCorrect) newState.player1Score++;
    } else {
      newState.player2Answers.push({
        questionId: currentQuestion.id,
        answer: answerIndex,
        correct: isCorrect
      });
      newState.player2Answered = true;
      if (isCorrect) newState.player2Score++;
    }
    
    // Move to next question if both answered
    if (newState.player1Answered && newState.player2Answered) {
      if (newState.currentQuestionIndex < newState.questions.length - 1) {
        newState.currentQuestionIndex++;
        newState.player1Answered = false;
        newState.player2Answered = false;
      } else {
        newState.gameOver = true;
        if (newState.player1Score > newState.player2Score) {
          newState.winner = 'player1';
        } else if (newState.player2Score > newState.player1Score) {
          newState.winner = 'player2';
        } else {
          newState.winner = 'draw';
        }
      }
    }
    
    return newState;
  },
  
  getCurrentQuestion: (state) => {
    return state.questions[state.currentQuestionIndex];
  }
};


// ==================== DOTS AND BOXES LOGIC ====================
export const DotsAndBoxesLogic = {
  GRID_SIZE: 4, // 4x4 grid (5x5 dots)
  
  createBoard: () => ({
    horizontalLines: Array(5).fill(null).map(() => Array(4).fill(null)),
    verticalLines: Array(4).fill(null).map(() => Array(5).fill(null)),
    boxes: Array(4).fill(null).map(() => Array(4).fill(null)),
    player1Score: 0,
    player2Score: 0
  }),
  
  makeMove: (board, type, row, col, player) => {
    const newBoard = JSON.parse(JSON.stringify(board));
    
    if (type === 'horizontal') {
      if (newBoard.horizontalLines[row][col] !== null) {
        return { success: false, board, completedBox: false };
      }
      newBoard.horizontalLines[row][col] = player;
    } else {
      if (newBoard.verticalLines[row][col] !== null) {
        return { success: false, board, completedBox: false };
      }
      newBoard.verticalLines[row][col] = player;
    }
    
    // Check if any box is completed
    const completedBoxes = DotsAndBoxesLogic.checkCompletedBoxes(newBoard, type, row, col, player);
    
    if (completedBoxes.length > 0) {
      completedBoxes.forEach(([boxRow, boxCol]) => {
        newBoard.boxes[boxRow][boxCol] = player;
        if (player === 'player1') {
          newBoard.player1Score++;
        } else {
          newBoard.player2Score++;
        }
      });
    }
    
    return {
      success: true,
      board: newBoard,
      completedBox: completedBoxes.length > 0,
      completedBoxes
    };
  },
  
  checkCompletedBoxes: (board, type, row, col, player) => {
    const completed = [];
    
    if (type === 'horizontal') {
      // Check box above
      if (row > 0) {
        if (DotsAndBoxesLogic.isBoxComplete(board, row - 1, col)) {
          completed.push([row - 1, col]);
        }
      }
      // Check box below
      if (row < 4) {
        if (DotsAndBoxesLogic.isBoxComplete(board, row, col)) {
          completed.push([row, col]);
        }
      }
    } else {
      // Check box left
      if (col > 0) {
        if (DotsAndBoxesLogic.isBoxComplete(board, row, col - 1)) {
          completed.push([row, col - 1]);
        }
      }
      // Check box right
      if (col < 4) {
        if (DotsAndBoxesLogic.isBoxComplete(board, row, col)) {
          completed.push([row, col]);
        }
      }
    }
    
    return completed;
  },
  
  isBoxComplete: (board, row, col) => {
    return (
      board.horizontalLines[row][col] !== null &&
      board.horizontalLines[row + 1][col] !== null &&
      board.verticalLines[row][col] !== null &&
      board.verticalLines[row][col + 1] !== null &&
      board.boxes[row][col] === null
    );
  },
  
  checkWinner: (board) => {
    const totalBoxes = 16; // 4x4 grid
    const filledBoxes = board.player1Score + board.player2Score;
    
    if (filledBoxes === totalBoxes) {
      if (board.player1Score > board.player2Score) {
        return { winner: 'player1', score: [board.player1Score, board.player2Score] };
      } else if (board.player2Score > board.player1Score) {
        return { winner: 'player2', score: [board.player1Score, board.player2Score] };
      } else {
        return { winner: 'draw', score: [board.player1Score, board.player2Score] };
      }
    }
    
    return null;
  }
};


// ==================== MEMORY MATCH GAME LOGIC ====================
export const MemoryMatchLogic = {
  emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
  
  createBoard: (pairs = 8) => {
    const selectedEmojis = MemoryMatchLogic.emojis.slice(0, pairs);
    const cards = [...selectedEmojis, ...selectedEmojis];
    
    // Shuffle cards
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    return {
      cards: cards.map((emoji, index) => ({
        id: index,
        emoji,
        flipped: false,
        matched: false
      })),
      player1Matches: 0,
      player2Matches: 0,
      flippedCards: [],
      currentPlayer: 'player1'
    };
  },
  
  flipCard: (state, cardId, player) => {
    const newState = JSON.parse(JSON.stringify(state));
    const card = newState.cards.find(c => c.id === cardId);
    
    if (!card || card.flipped || card.matched || newState.flippedCards.length >= 2) {
      return { success: false, state };
    }
    
    card.flipped = true;
    newState.flippedCards.push(cardId);
    
    // Check for match if 2 cards are flipped
    if (newState.flippedCards.length === 2) {
      const card1 = newState.cards.find(c => c.id === newState.flippedCards[0]);
      const card2 = newState.cards.find(c => c.id === newState.flippedCards[1]);
      
      if (card1.emoji === card2.emoji) {
        // Match found
        card1.matched = true;
        card2.matched = true;
        
        if (player === 'player1') {
          newState.player1Matches++;
        } else {
          newState.player2Matches++;
        }
        
        newState.flippedCards = [];
        // Same player gets another turn
      } else {
        // No match - will need to flip back and switch player
        // This should be handled with a delay in the UI
      }
    }
    
    return { success: true, state: newState };
  },
  
  resetFlippedCards: (state) => {
    const newState = JSON.parse(JSON.stringify(state));
    
    newState.flippedCards.forEach(cardId => {
      const card = newState.cards.find(c => c.id === cardId);
      if (!card.matched) {
        card.flipped = false;
      }
    });
    
    newState.flippedCards = [];
    newState.currentPlayer = newState.currentPlayer === 'player1' ? 'player2' : 'player1';
    
    return newState;
  },
  
  checkWinner: (state) => {
    const totalPairs = state.cards.length / 2;
    const matchedPairs = state.player1Matches + state.player2Matches;
    
    if (matchedPairs === totalPairs) {
      if (state.player1Matches > state.player2Matches) {
        return { winner: 'player1', score: [state.player1Matches, state.player2Matches] };
      } else if (state.player2Matches > state.player1Matches) {
        return { winner: 'player2', score: [state.player1Matches, state.player2Matches] };
      } else {
        return { winner: 'draw', score: [state.player1Matches, state.player2Matches] };
      }
    }
    
    return null;
  }
};

export default {
  TicTacToeLogic,
  ConnectFourLogic,
  RockPaperScissorsLogic,
  QuizGameLogic,
  DotsAndBoxesLogic,
  MemoryMatchLogic
};