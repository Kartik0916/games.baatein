// game.js - Baatein Tic Tac Toe Game
class BaateinGame {
    constructor() {
        this.socket = null;
        this.user = null;
        this.currentRoom = null;
        this.gameState = null;
        this.isMyTurn = false;
        this.pingInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.showLoginScreen();
    }

    initializeElements() {
        this.loginScreen = document.getElementById('loginScreen');
        this.gameSelection = document.getElementById('gameSelection');
        this.gameScreen = document.getElementById('gameScreen');
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('usernameInput');
        this.userInfo = document.getElementById('userInfo');
        this.username = document.getElementById('username');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.createLudoRoomBtn = document.getElementById('createLudoRoomBtn');
        this.selectTicTacToeBtn = document.getElementById('selectTicTacToe');
        this.selectLudoBtn = document.getElementById('selectLudo');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.roomInput = document.getElementById('roomInput');
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.joinWithCodeBtn = document.getElementById('joinWithCodeBtn');
        this.cancelJoinBtn = document.getElementById('cancelJoinBtn');
        this.waitingRoom = document.getElementById('waitingRoom');
        this.roomCode = document.getElementById('roomCode');
        this.playersList = document.getElementById('playersList');
        this.readyBtn = document.getElementById('readyBtn');
        this.gameBoardContainer = document.getElementById('gameBoardContainer');
        this.gameBoard = document.getElementById('gameBoard');
        this.currentPlayerText = document.getElementById('currentPlayerText');
        this.gameStatus = document.getElementById('gameStatus');
        this.offerDrawBtn = document.getElementById('offerDrawBtn');
        this.resignBtn = document.getElementById('resignBtn');
        this.gameOver = document.getElementById('gameOver');
        this.gameOverTitle = document.getElementById('gameOverTitle');
        this.gameOverMessage = document.getElementById('gameOverMessage');
        this.gameOverContent = document.querySelector('.game-over-content');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.leaveRoomBtn = document.getElementById('leaveRoomBtn');
        // Chat removed
        this.chatSection = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.sendMessageBtn = null;
        this.matchStats = document.getElementById('matchStats');
        this.matchStatsBar = document.getElementById('matchStatsBar');
        this.sessionStats = { wins: 0, losses: 0, draws: 0 };
        this.seriesStats = {}; // keyed by opponent userId
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notifications = document.getElementById('notifications');
        this.selectedGame = null;
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.createRoomBtn.addEventListener('click', () => this.createRoom(this.selectedGame || 'tic-tac-toe'));
        if (this.createLudoRoomBtn) {
            this.createLudoRoomBtn.addEventListener('click', () => this.createRoom('ludo'));
        }
        if (this.selectTicTacToeBtn) {
            this.selectTicTacToeBtn.addEventListener('click', () => this.selectGame('tic-tac-toe'));
        }
        if (this.selectLudoBtn) {
            this.selectLudoBtn.addEventListener('click', () => this.selectGame('ludo'));
        }
        this.joinRoomBtn.addEventListener('click', () => this.showJoinRoomInput());
        this.joinWithCodeBtn.addEventListener('click', () => this.joinRoom());
        this.cancelJoinBtn.addEventListener('click', () => this.hideJoinRoomInput());
        this.readyBtn.addEventListener('click', () => this.markReady());
        this.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.offerDrawBtn.addEventListener('click', () => this.offerDraw());
        this.resignBtn.addEventListener('click', () => this.resign());
        // Chat removed: no listeners
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }

    showLoginScreen() {
        this.loginScreen.style.display = 'block';
        this.gameScreen.style.display = 'none';
        this.userInfo.style.display = 'none';
    }

    showGameScreen() {
        this.loginScreen.style.display = 'none';
        this.gameSelection.style.display = 'none';
        this.gameScreen.style.display = 'block';
        this.userInfo.style.display = 'flex';
        // Show initial stats immediately
        this.renderMatchStats();
    }

    showGameSelection() {
        this.loginScreen.style.display = 'none';
        this.userInfo.style.display = 'flex';
        this.gameSelection.style.display = 'block';
        this.gameScreen.style.display = 'none';
    }

    selectGame(game) {
        this.selectedGame = game;
        // Update the subsequent screen to reflect selection and go to room screen
        this.showGameScreen();
        // Update waiting room header label
        const gameNameEl = document.getElementById('gameName');
        if (gameNameEl) gameNameEl.textContent = game === 'ludo' ? 'Ludo' : 'Tic Tac Toe';
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = this.usernameInput.value.trim();
        const avatar = document.querySelector('input[name="avatar"]:checked').value;
        
        if (!username) {
            this.showNotification('Please enter a username', 'error');
            return;
        }
        
        this.showLoading('Connecting to server...');
        
        try {
            const userId = 'user_' + Math.random().toString(36).substr(2, 9);
            this.user = { userId, username, avatar };
            await this.connectToServer();
            this.username.textContent = username;
            this.showGameSelection();
            this.showNotification(`Welcome, ${username}!`, 'success');
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Failed to connect to server', 'error');
        } finally {
            this.hideLoading();
        }
    }

    connectToServer() {
        return new Promise((resolve, reject) => {
            const wsUrl = window.WEBSOCKET_URL || 'https://games-baatein-backend.onrender.com';
            console.log('🔌 Connecting to WebSocket:', wsUrl);
            
            this.socket = io(wsUrl, {
                transports: ['websocket', 'polling']
            });
            
            this.socket.on('connect', () => {
                console.log('🔍 Connected to server');
                this.socket.emit('authenticate', this.user);
                this.setupSocketListeners();
                this.startPingInterval();
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                reject(error);
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.showNotification('Disconnected from server', 'warning');
            });
            
            this.socket.on('pong', () => {
                console.log('🔍 Server pong received');
            });
        });
    }

    setupSocketListeners() {
        this.socket.on('authenticated', (data) => {
            console.log('🔍 Authenticated:', data);
        });
        
        this.socket.on('roomCreated', (data) => {
            if (data.success && data.room) {
                this.currentRoom = data.room;
                this.showWaitingRoom();
                this.renderMatchStats();
                this.showNotification('Room created successfully!', 'success');
            } else {
                this.showNotification('Failed to create room', 'error');
            }
        });
        
        this.socket.on('playerJoined', (data) => {
            if (data.room) {
                this.currentRoom = data.room;
                this.showWaitingRoom();
                this.updatePlayersList();
                this.checkIfCanStart();
                this.showNotification(`${data.player.username} joined the room`, 'info');
            }
        });
        
        this.socket.on('playerLeft', (data) => {
            if (data.room) {
                this.currentRoom = data.room;
                this.updatePlayersList();
                this.checkIfCanStart();
                this.showNotification(`${data.player.username} left the room`, 'warning');
            }
        });
        
        this.socket.on('playerReadyUpdate', (data) => {
            console.log('🔍 Player ready update received:', data);
            if (data.players && this.currentRoom) {
                // CRITICAL: Update the currentRoom.players array with fresh data
                this.currentRoom.players = data.players.map(p => ({ ...p }));
            }
            this.updatePlayersList(data.players);
            this.checkIfCanStart();
        });
        
        this.socket.on('gameStarted', (data) => {
            console.log('🔍 Game started received:', data);
            
            if (data.gameState && data.gameState.board) {
                // ALWAYS create completely fresh empty game state - ignore what server sends
                // The server should send empty board, but we enforce it here too
                const boardArray = Array.isArray(data.gameState.board) 
                    ? [...data.gameState.board] 
                    : Array(9).fill(null);
                
                // FORCE empty board - new game should ALWAYS be empty
                const isEmpty = boardArray.every(cell => cell === null);
                
                this.gameState = {
                    board: Array(9).fill(null), // ALWAYS start with empty board
                    moves: [],
                    winner: null,
                    isDraw: false,
                    gameOver: false
                };
                
                console.log('🔍 New game state created:', this.gameState.board);
                
                if (this.currentRoom) {
                    this.currentRoom.status = 'active';
                    this.currentRoom.currentTurn = data.currentTurn;
                }
                
                // Force clear any existing board HTML and cells
                if (this.gameBoard) {
                    this.gameBoard.innerHTML = '';
                }
                
                // Also clear from container if exists
                if (this.gameBoardContainer) {
                    const existingCells = this.gameBoardContainer.querySelectorAll('.cell');
                    existingCells.forEach(cell => cell.remove());
                }
                
                // Small delay to ensure DOM is cleared before creating new board
                setTimeout(() => {
                    this.showGameBoard();
                    this.updateGameStatus();
                    this.showNotification('Game started with fresh board!', 'success');
                }, 50);
            }
        });

        // Ludo start: create client, mount, and render immediately
        this.socket.on('ludo:started', (data) => {
            // Switch UI to game board
            if (this.waitingRoom) this.waitingRoom.style.display = 'none';
            if (this.gameBoardContainer) this.gameBoardContainer.style.display = 'block';
            if (!this.ludo) {
                this.ludo = new window.LudoClient(this.socket, this.user, this.currentRoom);
                this.ludo.mount(this.gameBoardContainer);
            }
            this.currentRoom.status = 'active';
            this.currentRoom.currentTurn = data.currentTurn;
            this.ludo.state = data.state;
            this.ludo.room = this.currentRoom;
            this.ludo.render();
        });

        // Ludo events are handled in LudoClient (instantiated on ludo:started)
        
        this.socket.on('moveMade', (data) => {
            if (data.gameState && data.gameState.board) {
                // Create fresh copy of game state
                this.gameState = {
                    board: [...data.gameState.board],
                    moves: data.gameState.moves ? [...data.gameState.moves] : [],
                    winner: data.gameState.winner || null,
                    isDraw: data.gameState.isDraw || false,
                    gameOver: data.gameState.gameOver || false
                };
                
                if (this.currentRoom) {
                    this.currentRoom.currentTurn = data.currentTurn;
                }
                
                this.updateGameBoard();
                this.updateGameStatus();
            }
        });
        
        this.socket.on('gameOver', (data) => {
            console.log('🎯 Game Over received:', data);
            
            // Clear any previous animations first
            this.clearAllAnimations();
            
            // Add winning line animation if there's a winner
            if (data.winner && data.winner !== 'draw' && data.winningLine) {
                console.log('🎯 Drawing winning line:', data.winningLine);
                
                // Draw line BEFORE hiding the board
                this.drawWinningLine(data.winningLine);
                
                // Delay showing game over screen to see the line (shorter delay)
                setTimeout(() => {
                    this.showGameOver(data);
                }, 1100); // Reduced from 1500ms to 1100ms for faster transition
            } else {
                // No winner or draw - show immediately
                this.showGameOver(data);
            }
        });
        
        // Draw offer events
        this.socket.on('drawOffered', (data) => {
            console.log('🔍 Draw offered by:', data.from);
            
            // Show custom notification with accept/reject buttons
            const notification = document.createElement('div');
            notification.className = 'notification info';
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.zIndex = '10000';
            notification.style.padding = '2rem';
            notification.style.minWidth = '300px';
            notification.style.textAlign = 'center';
            notification.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
            
            notification.innerHTML = `
                <h3 style="margin-bottom: 1rem;">Draw Offer</h3>
                <p style="margin-bottom: 1.5rem;">${data.from} has offered a draw. Do you accept?</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-success" id="acceptDrawBtn" style="padding: 0.75rem 2rem;">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn btn-danger" id="rejectDrawBtn" style="padding: 0.75rem 2rem;">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Add event listeners
            document.getElementById('acceptDrawBtn').addEventListener('click', () => {
                this.socket.emit('acceptDraw', { roomId: this.currentRoom.roomId });
                notification.remove();
            });
            
            document.getElementById('rejectDrawBtn').addEventListener('click', () => {
                this.socket.emit('rejectDraw', { roomId: this.currentRoom.roomId });
                notification.remove();
                this.showNotification('Draw offer declined', 'info');
            });
        });
        
        this.socket.on('drawAccepted', (data) => {
            console.log('🔍 Draw accepted');
            this.showNotification('Draw accepted by opponent', 'success');
        });
        
        this.socket.on('drawRejected', (data) => {
            console.log('🔍 Draw rejected');
            this.showNotification('Draw offer was declined', 'info');
            // Re-enable draw button when offer is rejected
            if (this.offerDrawBtn) {
                this.offerDrawBtn.disabled = false;
                this.offerDrawBtn.innerHTML = '<i class="fas fa-handshake"></i> Offer Draw';
            }
        });
        
        this.socket.on('drawOfferSent', (data) => {
            console.log('🔍 Draw offer sent:', data);
            // Button is already disabled, just confirm the message
        });
        
        // Resign event
        this.socket.on('playerResigned', (data) => {
            console.log('🔍 Player resigned:', data);
            
            // Determine winner
            let winner;
            if (data.resignedPlayerId === this.user.userId) {
                // I resigned, opponent wins
                winner = data.winner;
            } else {
                // Opponent resigned, I win
                winner = this.user.userId;
            }
            
            // Show game over with appropriate message
            this.showGameOver({
                winner: winner,
                reason: 'resignation'
            });
        });
        
        // Draw accepted - show game over as draw
        this.socket.on('drawAccepted', (data) => {
            console.log('🔍 Draw accepted:', data);
            // Trigger game over with draw result
            this.showGameOver({
                winner: 'draw',
                reason: 'draw_accepted'
            });
        });
        
        // Chat removed
        
        // Play Again events
        this.socket.on('playAgainRequested', (data) => {
            console.log('🔍 Play again requested by:', data.from);
            this.showNotification(`${data.from} wants to play again. Click "Play Again" to confirm!`, 'info');
            // Enable the play again button if it was disabled
            if (this.playAgainBtn) {
                this.playAgainBtn.disabled = false;
                this.playAgainBtn.textContent = 'Confirm Play Again';
            }
        });
        
        this.socket.on('playAgainRequestSent', (data) => {
            this.showNotification(data.message || 'Play again request sent!', 'info');
        });
        
        this.socket.on('playAgainConfirmed', (data) => {
            this.showNotification(data.message || 'Waiting for opponent...', 'info');
        });
        
        this.socket.on('gameReset', (data) => {
            console.log('🔍 Game reset:', data);
            
            // CRITICAL: Clean up all animations BEFORE resetting
            this.clearAllAnimations();
            
            if (data.room) {
                // Update room and game state with fresh copy
                this.currentRoom = {
                    ...data.room,
                    players: data.room.players ? [...data.room.players] : []
                };
                
                // ALWAYS create completely fresh empty game state on reset
                this.gameState = {
                    board: Array(9).fill(null), // Always empty board
                    moves: [],
                    winner: null,
                    isDraw: false,
                    gameOver: false
                };
                
                // Force clear the game board HTML
                if (this.gameBoard) {
                    this.gameBoard.innerHTML = '';
                }
                
                // Clear all cells if board container exists
                if (this.gameBoardContainer) {
                    const cells = this.gameBoardContainer.querySelectorAll('.cell');
                    cells.forEach(cell => cell.remove());
                    
                    // Remove all winning lines
                    const winningLines = this.gameBoardContainer.querySelectorAll('.winning-line');
                    winningLines.forEach(line => line.remove());
                }
                
                // Remove winning class from any cells
                const winningCells = document.querySelectorAll('.cell.winning');
                winningCells.forEach(cell => cell.classList.remove('winning'));
                
                // Explicitly hide all game-related screens
                this.gameOver.style.display = 'none';
                this.gameBoardContainer.style.display = 'none';
                
                // Ensure waiting room is shown
                this.showWaitingRoom();
                
                // Reset play again button
                if (this.playAgainBtn) {
                    this.playAgainBtn.disabled = false;
                    this.playAgainBtn.innerHTML = '<i class="fas fa-redo"></i> Play Again';
                }
                
                // Clear any turn indicators
                if (this.currentPlayerText) {
                    this.currentPlayerText.textContent = '';
                }
                
                // Clear game status
                if (this.gameStatus) {
                    this.gameStatus.textContent = '';
                }
                
                this.showNotification(data.message || 'Game reset! Both players need to mark ready.', 'success');
            }
        });
        
        this.socket.on('error', (data) => {
            this.showNotification(data.message || 'An error occurred', 'error');
        });
    }

    createRoom(game = 'tic-tac-toe') {
        if (!this.socket || !this.user.userId || !this.user.username) {
            this.showNotification('Not connected or missing user info', 'error');
            return;
        }
        
        this.socket.emit('createRoom', {
            userId: this.user.userId,
            username: this.user.username,
            avatar: this.user.avatar,
            game
        });
    }

    showJoinRoomInput() {
        this.roomInput.style.display = 'block';
        this.roomCodeInput.focus();
    }

    hideJoinRoomInput() {
        this.roomInput.style.display = 'none';
        this.roomCodeInput.value = '';
    }

    joinRoom() {
        const roomId = this.roomCodeInput.value.trim();
        
        if (!roomId || !this.socket || !this.user.userId || !this.user.username) {
            this.showNotification('Please enter a room code or check connection', 'error');
            return;
        }
        
        this.socket.emit('joinRoom', {
            roomId,
            userId: this.user.userId,
            username: this.user.username,
            avatar: this.user.avatar
        });
        
        this.hideJoinRoomInput();
    }

    showWaitingRoom() {
        // CRITICAL: Clean up all animations when entering waiting room
        this.clearAllAnimations();
        
        // Force hide game screens first
        this.gameOver.style.display = 'none';
        if (this.gameBoardContainer) {
            this.gameBoardContainer.style.display = 'none';
            
            // Aggressively remove all cells
            const allCells = this.gameBoardContainer.querySelectorAll('.cell');
            allCells.forEach(cell => cell.remove());
            
            // Remove all winning lines
            const winningLines = this.gameBoardContainer.querySelectorAll('.winning-line');
            winningLines.forEach(line => line.remove());
        }
        
        // Clear game board HTML completely
        if (this.gameBoard) {
            this.gameBoard.innerHTML = '';
        }
        
        // Remove winning class from any remaining cells
        const winningCells = document.querySelectorAll('.cell.winning');
        winningCells.forEach(cell => cell.classList.remove('winning'));
        
        // Disable draw and resign buttons when in waiting room
        if (this.offerDrawBtn) {
            this.offerDrawBtn.disabled = true;
        }
        if (this.resignBtn) {
            this.resignBtn.disabled = true;
        }
        
        // Reset game state to empty if needed (should already be done but ensure it)
        if (this.gameState && this.gameState.board) {
            // Verify it's actually empty
            const hasMoves = this.gameState.board.some(cell => cell !== null);
            if (hasMoves && this.currentRoom && this.currentRoom.status === 'waiting') {
                // Force empty if game was reset
                this.gameState.board = Array(9).fill(null);
            }
        }
        
        // Show waiting room
        this.waitingRoom.style.display = 'block';
        // Update game name dynamically
        const gameNameEl = document.getElementById('gameName');
        if (gameNameEl) {
            const g = (this.currentRoom && this.currentRoom.game) ? this.currentRoom.game : 'tic-tac-toe';
            gameNameEl.textContent = g === 'ludo' ? 'Ludo' : 'Tic Tac Toe';
        }
        // Chat removed
        
        // Update room code if room exists
        if (this.currentRoom && this.currentRoom.roomId) {
            this.roomCode.textContent = this.currentRoom.roomId;
        }
        
        // Reset turn indicator
        if (this.currentPlayerText) {
            this.currentPlayerText.textContent = '';
        }
        
        // Clear game status
        if (this.gameStatus) {
            this.gameStatus.textContent = '';
        }
        
        // Update players list
        this.updatePlayersList();
        this.checkIfCanStart();
    }

    updatePlayersList(players = null) {
        const playersToShow = players || (this.currentRoom ? this.currentRoom.players : []);
        
        // Also update currentRoom.players if players array is provided
        if (players && this.currentRoom) {
            this.currentRoom.players = players.map(p => ({ ...p }));
        }
        
        this.playersList.innerHTML = '';
        
        playersToShow.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <span class="player-avatar">${player.avatar}</span>
                <span class="player-name">${player.username}</span>
                <span class="player-status ${player.ready ? 'ready' : 'waiting'}">
                    ${player.ready ? 'Ready' : 'Waiting'}
                </span>
            `;
            this.playersList.appendChild(playerItem);
        });
        
        console.log('🔍 Players list updated:', playersToShow.map(p => ({ username: p.username, ready: p.ready })));

        // Track current opponent when two players are present
        if (this.currentRoom && this.currentRoom.players && this.currentRoom.players.length === 2) {
            const opponent = this.currentRoom.players.find(p => p.userId !== this.user.userId);
            if (opponent) {
                this.currentOpponentId = opponent.userId;
                this.currentOpponentName = opponent.username;
                if (!this.seriesStats[this.currentOpponentId]) {
                    this.seriesStats[this.currentOpponentId] = { wins: 0, losses: 0, draws: 0 };
                }
            }
        }
    }

    checkIfCanStart() {
        if (!this.currentRoom || !this.currentRoom.players) {
            return;
        }
        
        const players = this.currentRoom.players;
        const allReady = players.length === 2 && players.every(p => p.ready === true);
        const hasTwoPlayers = players.length === 2;
        
        console.log('🔍 Can start check:', {
            playersCount: players.length,
            allReady: allReady,
            players: players.map(p => ({ username: p.username, ready: p.ready }))
        });
        
        this.readyBtn.disabled = !hasTwoPlayers;
        
        if (hasTwoPlayers && allReady) {
            this.readyBtn.textContent = 'Starting Game...';
            this.readyBtn.disabled = true;
        } else if (hasTwoPlayers) {
            this.readyBtn.innerHTML = '<i class="fas fa-check"></i> Ready to Play';
            this.readyBtn.disabled = false;
        } else {
            this.readyBtn.innerHTML = `<i class="fas fa-users"></i> Waiting for Players (${players.length}/2)`;
        }
    }

    markReady() {
        if (!this.socket || !this.currentRoom || !this.currentRoom.roomId) {
            this.showNotification('Not connected or invalid room', 'error');
            return;
        }
        
        this.socket.emit('playerReady', { roomId: this.currentRoom.roomId });
        this.readyBtn.disabled = true;
        this.readyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ready';
    }

    showGameBoard() {
        // Only show game board if game is actually active
        if (!this.currentRoom || this.currentRoom.status !== 'active') {
            console.warn('Cannot show game board - game not active');
            return;
        }
        
        this.waitingRoom.style.display = 'none';
        this.gameBoardContainer.style.display = 'block';
        this.gameOver.style.display = 'none';
        
        // Enable draw and resign buttons when game is active
        if (this.offerDrawBtn) {
            this.offerDrawBtn.disabled = false;
        }
        if (this.resignBtn) {
            this.resignBtn.disabled = false;
        }
        
        this.createGameBoard();
        this.updateGameStatus();
    }

    createGameBoard() {
        // Clear existing board
        this.gameBoard.innerHTML = '';
        
        // Ensure we have valid game state
        if (!this.gameState || !this.gameState.board || !Array.isArray(this.gameState.board)) {
            console.error('Invalid game state for creating board');
            return;
        }
        
        // Only create board if game is active
        if (!this.currentRoom || this.currentRoom.status !== 'active') {
            console.warn('Cannot create board - game not active');
            return;
        }
        
        // Create 9 cells for the board
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            
            // Only show marks if board has values
            if (this.gameState.board[i]) {
                cell.textContent = this.gameState.board[i];
                cell.classList.add('occupied', this.gameState.board[i].toLowerCase());
                // Add smooth animation for existing moves
                setTimeout(() => {
                    cell.classList.add('move-animation');
                    setTimeout(() => {
                        cell.classList.remove('move-animation');
                    }, 300);
                }, i * 50); // Stagger animation
            }
            
            cell.addEventListener('click', () => this.makeMove(i));
            this.gameBoard.appendChild(cell);
        }
    }

    updateGameBoard() {
        if (!this.gameBoard || !this.gameState || !this.gameState.board) {
            return;
        }
        
        const cells = this.gameBoard.querySelectorAll('.cell');
        
        // Ensure we have the right number of cells
        if (cells.length !== 9) {
            // Recreate board if cells don't match
            this.createGameBoard();
            return;
        }
        
        // Update each cell based on current game state
        cells.forEach((cell, index) => {
            const value = this.gameState.board[index];
            if (value) {
                // Add smooth animation when updating
                if (!cell.classList.contains('occupied')) {
                    cell.classList.add('move-animation');
                    setTimeout(() => {
                        cell.classList.remove('move-animation');
                    }, 300);
                }
                cell.textContent = value;
                cell.classList.add('occupied', value.toLowerCase());
                cell.classList.remove('x', 'o');
                cell.classList.add(value.toLowerCase());
            } else {
                cell.textContent = '';
                cell.classList.remove('occupied', 'x', 'o', 'winning', 'move-animation');
            }
        });
    }

    makeMove(position) {
        if (!this.socket || !this.currentRoom) {
            this.showNotification('Not connected or no room', 'error');
            return;
        }
        
        // Strict check: only allow moves if game is active
        if (!this.currentRoom.status || this.currentRoom.status !== 'active') {
            this.showNotification('Game is not active. Please wait for the game to start.', 'warning');
            // Also ensure board is hidden if game is not active
            if (this.gameBoardContainer && this.currentRoom.status === 'waiting') {
                this.gameBoardContainer.style.display = 'none';
                if (this.waitingRoom) {
                    this.waitingRoom.style.display = 'block';
                }
            }
            return;
        }
        
        // Check if game board is actually visible
        if (this.gameBoardContainer && this.gameBoardContainer.style.display === 'none') {
            // Board shouldn't be clickable if hidden, but just in case
            return;
        }
        
        if (!this.gameState || !this.gameState.board) {
            this.showNotification('Game state not ready', 'error');
            return;
        }
        
        // Check if game is over
        if (this.gameState.gameOver) {
            this.showNotification('Game is over. Please reset to play again.', 'warning');
            return;
        }
        
        if (this.currentRoom.currentTurn !== this.user.userId) {
            this.showNotification('Not your turn!', 'warning');
            return;
        }
        
        if (this.gameState.board[position] !== null) {
            this.showNotification('Cell already occupied!', 'warning');
            return;
        }
        
        if (position < 0 || position > 8) {
            console.error('Invalid move position:', position);
            return;
        }
        
        this.socket.emit('makeMove', {
            roomId: this.currentRoom.roomId,
            move: position
        });
    }

    updateGameStatus() {
        if (!this.currentRoom) return;
        
        this.isMyTurn = this.currentRoom.currentTurn === this.user.userId;
        
        if (this.currentRoom.status === 'active') {
            if (this.isMyTurn) {
                this.currentPlayerText.textContent = 'Your turn';
                this.currentPlayerText.style.color = '#28a745';
            } else {
                const currentPlayer = this.currentRoom.players.find(p => p.userId === this.currentRoom.currentTurn);
                this.currentPlayerText.textContent = `${currentPlayer?.username || 'Opponent'}'s turn`;
                this.currentPlayerText.style.color = '#dc3545';
            }
        }
    }

    showGameOver(data) {
        // Don't hide board immediately if there's a winning line animation
        // Keep it visible until animation completes
        if (!data.winner || data.winner === 'draw' || !data.winningLine) {
            this.gameBoardContainer.style.display = 'none';
        } else {
            // Hide board after a delay to allow line animation to be seen
            setTimeout(() => {
                if (this.gameBoardContainer) {
                    this.gameBoardContainer.style.display = 'none';
                }
            }, 1800); // Reduced from 2000ms for faster transition
        }
        
        this.gameOver.style.display = 'block';
        
        // Disable draw and resign buttons when game is over
        if (this.offerDrawBtn) {
            this.offerDrawBtn.disabled = true;
        }
        if (this.resignBtn) {
            this.resignBtn.disabled = true;
        }
        
        let title, message, score, isWin = false;
        
        // Remove previous classes and clean up old animations
        if (this.gameOverContent) {
            this.gameOverContent.classList.remove('won', 'lost');
            
            // Remove any existing crying face container
            const existingCryingFace = this.gameOverContent.querySelector('.crying-face-container');
            if (existingCryingFace) {
                existingCryingFace.remove();
            }
        }
        
        if (data.winner === 'draw') {
            title = 'Game Draw!';
            if (data.reason === 'draw_accepted') {
                message = 'The game ended in a draw by mutual agreement.';
            } else {
                message = 'The game ended in a draw.';
            }
            score = 'draw';
        } else if (data.winner === this.user.userId) {
            title = 'You Won!';
            isWin = true;
            if (data.reason === 'resignation') {
                message = 'Congratulations! Your opponent resigned. You win!';
            } else {
                message = 'Congratulations! You won the game.';
            }
            score = 'win';
            this.gameOverContent.classList.add('won');
            
            // Confetti rain across the screen
            setTimeout(() => {
                this.createConfettiRain();
            }, 200);
        } else {
            title = 'You Lost!';
            if (data.reason === 'resignation') {
                message = 'You resigned. Your opponent wins.';
            } else {
                message = 'Better luck next time!';
            }
            score = 'loss';
            this.gameOverContent.classList.add('lost');
            
            // Simple crying emoji only (no extra tear animation)
        }
        
        // Add simple crying emoji before title for loss
        if (score === 'loss') {
            this.gameOverTitle.textContent = '😢 ' + title;
            this.gameOverTitle.classList.add('emoji-bounce');
        } else {
            this.gameOverTitle.textContent = title;
            this.gameOverTitle.classList.remove('emoji-bounce');
        }
        this.gameOverMessage.textContent = message;
        
        // Reset play again button state
        if (this.playAgainBtn) {
            this.playAgainBtn.disabled = false;
            this.playAgainBtn.innerHTML = '<i class="fas fa-redo"></i> Play Again';
        }
        
        // Update session stats and UI
        this.updateMatchStats(score);
        
        // Send game over message to Flutter if available
        sendGameOverToFlutter(score);
    }

    playAgain() {
        if (!this.socket || !this.currentRoom || !this.currentRoom.roomId) {
            this.showNotification('Not connected or invalid room', 'error');
            return;
        }
        
        // Check if this is a confirmation (button text changed)
        if (this.playAgainBtn && this.playAgainBtn.textContent.includes('Confirm')) {
            // This is a confirmation - send confirm event
            this.socket.emit('confirmPlayAgain', {
                roomId: this.currentRoom.roomId
            });
            this.playAgainBtn.disabled = true;
            this.playAgainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
        } else {
            // This is a request - ask the other player
            this.socket.emit('requestPlayAgain', {
                roomId: this.currentRoom.roomId
            });
            this.playAgainBtn.disabled = true;
            this.playAgainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting...';
        }
    }

    leaveRoom() {
        if (!this.socket) return;
        
        this.socket.emit('leaveRoom');
        this.currentRoom = null;
        this.gameState = null;
        this.hideAllGameScreens();
        this.showNotification('Left the room', 'info');
    }

    hideAllGameScreens() {
        this.waitingRoom.style.display = 'none';
        this.gameBoardContainer.style.display = 'none';
        this.gameOver.style.display = 'none';
        // Chat removed
    }

    // Chat removed

    handleLogout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.stopPingInterval();
        this.user = null;
        this.currentRoom = null;
        this.gameState = null;
        
        this.showLoginScreen();
        this.hideAllGameScreens();
        this.showNotification('Logged out successfully', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showLoading(message = 'Loading...') {
        this.loadingOverlay.style.display = 'flex';
        this.loadingOverlay.querySelector('p').textContent = message;
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    startPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping');
                console.log('🔍 Sent ping to server');
            }
        }, 30000);
    }
    
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    offerDraw() {
        if (!this.socket || !this.currentRoom || !this.currentRoom.roomId) {
            this.showNotification('Not connected or invalid room', 'error');
            return;
        }
        
        if (this.currentRoom.status !== 'active') {
            this.showNotification('Game is not active', 'warning');
            return;
        }
        
        // Send draw offer to server
        this.socket.emit('offerDraw', {
            roomId: this.currentRoom.roomId
        });
        
        this.showNotification('Draw offer sent to opponent', 'info');
        this.offerDrawBtn.disabled = true;
        this.offerDrawBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Offering...';
        
        // Re-enable after a timeout
        setTimeout(() => {
            if (this.offerDrawBtn) {
                this.offerDrawBtn.disabled = false;
                this.offerDrawBtn.innerHTML = '<i class="fas fa-handshake"></i> Offer Draw';
            }
        }, 5000);
    }
    
    resign() {
        if (!this.socket || !this.currentRoom || !this.currentRoom.roomId) {
            this.showNotification('Not connected or invalid room', 'error');
            return;
        }
        
        if (this.currentRoom.status !== 'active') {
            this.showNotification('Game is not active', 'warning');
            return;
        }
        
        // Confirm resignation
        const confirmResign = confirm('Are you sure you want to resign? Your opponent will win.');
        if (!confirmResign) {
            return;
        }
        
        // Send resignation to server
        this.socket.emit('resign', {
            roomId: this.currentRoom.roomId
        });
        
        this.resignBtn.disabled = true;
        this.resignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resigning...';
        this.showNotification('You have resigned', 'warning');
    }
    
    // Draw winning line through winning cells
    drawWinningLine(winningLine) {
        console.log('🎯 drawWinningLine called with:', winningLine);
        
        if (!this.gameBoard) {
            console.error('❌ No game board element found');
            return;
        }
        
        if (!winningLine || winningLine.length !== 3) {
            console.error('❌ Invalid winning line:', winningLine);
            return;
        }
        
        const cells = this.gameBoard.querySelectorAll('.cell');
        if (cells.length !== 9) {
            console.error('❌ Invalid cell count:', cells.length);
            return;
        }
        
        console.log('🎯 Cells found:', cells.length);
        
        // Mark winning cells
        winningLine.forEach(index => {
            const cell = cells[index];
            if (cell) {
                cell.classList.add('winning');
                console.log('🎯 Marked cell', index, 'as winning');
            } else {
                console.error('❌ Cell not found at index:', index);
            }
        });
        
        // Determine line type
        const [a, b, c] = winningLine;
        let lineType = '';
        
        // Check if row (0,1,2), (3,4,5), or (6,7,8)
        if ((a === 0 && b === 1 && c === 2) || 
            (a === 3 && b === 4 && c === 5) || 
            (a === 6 && b === 7 && c === 8)) {
            lineType = 'horizontal';
        }
        // Check if column (0,3,6), (1,4,7), or (2,5,8)
        else if ((a === 0 && b === 3 && c === 6) || 
                 (a === 1 && b === 4 && c === 7) || 
                 (a === 2 && b === 5 && c === 8)) {
            lineType = 'vertical';
        }
        // Check if diagonal
        else if (a === 0 && b === 4 && c === 8) {
            lineType = 'diagonal-tl-br'; // Top-left to bottom-right
        }
        else if (a === 2 && b === 4 && c === 6) {
            lineType = 'diagonal-tr-bl'; // Top-right to bottom-left
        }
        
        // Remove any existing winning line
        const existingLine = this.gameBoard.querySelector('.winning-line');
        if (existingLine) {
            existingLine.remove();
        }
        
        // Create line element
        const line = document.createElement('div');
        line.className = `winning-line ${lineType}`;
        
        // Ensure board has relative positioning
        if (this.gameBoard) {
            this.gameBoard.style.position = 'relative';
            this.gameBoard.style.overflow = 'visible';
        }
        
        console.log('🎯 Creating line with type:', lineType);
        
        // Position the line based on winning cells
        if (lineType === 'horizontal') {
            // For horizontal lines, find which row (0, 1, or 2)
            const row = Math.floor(a / 3);
            const cellSize = this.gameBoard.clientWidth / 3; // Each cell is 1/3 of board width
            const gap = 10; // Gap between cells
            
            // Calculate exact position - middle of the row
            const topPosition = (row * cellSize) + (cellSize / 2) + (row * gap) - 4; // -4 to center 8px line
            
            line.style.position = 'absolute';
            line.style.top = `${topPosition}px`;
            line.style.left = '0';
            line.style.width = '100%';
            line.style.height = '8px';
            
            console.log('🎯 Horizontal line positioned at:', topPosition);
            this.gameBoard.appendChild(line);
        }
        else if (lineType === 'vertical') {
            // For vertical lines, find which column (0, 1, or 2)
            const col = a % 3;
            const cellSize = this.gameBoard.clientWidth / 3;
            const gap = 10;
            
            // Calculate exact position - middle of the column
            const leftPosition = (col * cellSize) + (cellSize / 2) + (col * gap) - 4; // -4 to center 8px line
            
            line.style.position = 'absolute';
            line.style.left = `${leftPosition}px`;
            line.style.top = '0';
            line.style.width = '8px';
            line.style.height = '100%';
            
            console.log('🎯 Vertical line positioned at:', leftPosition);
            this.gameBoard.appendChild(line);
        }
        else if (lineType.includes('diagonal')) {
            // For diagonal, center it on the board
            line.style.position = 'absolute';
            line.style.top = '50%';
            line.style.left = '50%';
            line.style.width = '141.42%'; // sqrt(2) * 100% for diagonal
            line.style.height = '8px';
            line.style.setProperty('--rotation', lineType === 'diagonal-tl-br' ? '45deg' : '-45deg');
            
            console.log('🎯 Diagonal line created');
            this.gameBoard.appendChild(line);
        }
        
        // Remove line after animation completes
        setTimeout(() => {
            if (line && line.parentNode) {
                // Keep the line but ensure it stays visible
            }
        }, 100);
    }
    
    // Create fireworks effect
    createFireworks() {
        console.log('🎆 Creating fireworks');
        
        // Remove existing fireworks container
        const existing = document.querySelector('.fireworks-container');
        if (existing) {
            existing.remove();
        }
        
        const container = document.createElement('div');
        container.className = 'fireworks-container';
        document.body.appendChild(container);
        
        console.log('🎆 Fireworks container created');
        
        // Get board center for fireworks origin
        const boardRect = this.gameBoard ? this.gameBoard.getBoundingClientRect() : null;
        const centerX = boardRect ? boardRect.left + boardRect.width / 2 : window.innerWidth / 2;
        const centerY = boardRect ? boardRect.top + boardRect.height / 2 : window.innerHeight / 2;
        
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
        const particleCount = 60; // Reduced from 100 for better performance
        
        // Create multiple firework bursts (reduced for performance)
        for (let burst = 0; burst < 3; burst++) { // Reduced from 5 to 3 bursts
            setTimeout(() => {
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'firework';
                    
                    const angle = (Math.PI * 2 * i) / particleCount;
                    const velocity = 200 + Math.random() * 300;
                    const x = Math.cos(angle) * velocity;
                    const y = Math.sin(angle) * velocity;
                    
                    particle.style.left = `${centerX}px`;
                    particle.style.top = `${centerY}px`;
                    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                    particle.style.setProperty('--x-end', `${x}px`);
                    particle.style.setProperty('--y-end', `${y}px`);
                    particle.style.animationDelay = `${burst * 0.3}s`;
                    
                    container.appendChild(particle);
                    
                    // Remove particle after animation
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.remove();
                        }
                    }, 2000);
                }
            }, burst * 300);
        }
        
        // Create confetti falling from top (reduced for performance)
        for (let i = 0; i < 30; i++) { // Reduced from 50 to 30
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = `${Math.random() * 0.5}s`;
                container.appendChild(confetti);
                
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.remove();
                    }
                }, 3500);
            }, i * 50);
        }
        
        // Remove container after all animations
        setTimeout(() => {
            if (container.parentNode) {
                container.remove();
            }
        }, 5000);
    }
    
    // (removed) addCryingFace - using simple emoji only
    
    // Clear all animations - CRITICAL for preventing animation buildup
    clearAllAnimations() {
        console.log('🧹 Clearing all animations');
        
        // Remove fireworks container
        const fireworksContainer = document.querySelector('.fireworks-container');
        if (fireworksContainer) {
            fireworksContainer.remove();
        }
        
        // Remove all firework particles
        const fireworks = document.querySelectorAll('.firework');
        fireworks.forEach(fw => fw.remove());
        
        // Remove all confetti & containers
        const confetti = document.querySelectorAll('.confetti');
        confetti.forEach(c => c.remove());
        const confettiContainers = document.querySelectorAll('.confetti-container');
        confettiContainers.forEach(cc => cc.remove());
        
        // Remove winning lines
        const winningLines = document.querySelectorAll('.winning-line');
        winningLines.forEach(line => line.remove());
        
        // Remove crying face container
        if (this.gameOverContent) {
            const cryingFace = this.gameOverContent.querySelector('.crying-face-container');
            if (cryingFace) {
                cryingFace.remove();
            }
            // Remove winner celebration backdrop
            const winnerBackdrop = this.gameOverContent.querySelector('.winner-celebration');
            if (winnerBackdrop) {
                winnerBackdrop.remove();
            }
        }
        
        // Remove winning class from cells
        const winningCells = document.querySelectorAll('.cell.winning');
        winningCells.forEach(cell => cell.classList.remove('winning'));
        
        // Remove move animation classes
        const moveAnimatedCells = document.querySelectorAll('.cell.move-animation');
        moveAnimatedCells.forEach(cell => cell.classList.remove('move-animation'));
        
        console.log('🧹 All animations cleared');
    }

    // Update and render session/series match stats
    updateMatchStats(result) {
        // result: 'win' | 'loss' | 'draw'
        if (!this.sessionStats) this.sessionStats = { wins: 0, losses: 0, draws: 0 };
        if (result === 'win') this.sessionStats.wins++;
        else if (result === 'loss') this.sessionStats.losses++;
        else this.sessionStats.draws++;
        
        if (this.currentOpponentId) {
            if (!this.seriesStats[this.currentOpponentId]) {
                this.seriesStats[this.currentOpponentId] = { wins: 0, losses: 0, draws: 0 };
            }
            if (result === 'win') this.seriesStats[this.currentOpponentId].wins++;
            else if (result === 'loss') this.seriesStats[this.currentOpponentId].losses++;
            else this.seriesStats[this.currentOpponentId].draws++;
        }
        this.renderMatchStats();
    }

    renderMatchStats() {
        // Only head-to-head; hide if no opponent yet
        const hasOpponent = Boolean(this.currentOpponentId);
        if (!hasOpponent) {
            if (this.matchStats) this.matchStats.style.display = 'none';
            if (this.matchStatsBar) this.matchStatsBar.style.display = 'none';
            return;
        }

        const series = this.seriesStats[this.currentOpponentId] || { wins: 0, losses: 0, draws: 0 };
        const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
        const oppName = this.currentOpponentName || 'opponent';

        const line = `
            <div class=\"stats-row\">\n                <span class=\"stats-label\">You vs ${oppName}</span>\n                <span class=\"stats-value\">${plural(series.wins, 'win')} — ${plural(series.losses, 'loss')}${series.draws ? ` — ${plural(series.draws, 'draw')}` : ''}</span>\n            </div>`;

        const html = `
            <div class=\"stats-card\">\n                ${line}\n            </div>
        `;

        if (this.matchStats) {
            this.matchStats.innerHTML = html;
            this.matchStats.style.display = 'block';
        }
        if (this.matchStatsBar) {
            this.matchStatsBar.innerHTML = html;
            this.matchStatsBar.style.display = 'flex';
        }
    }

    // Confetti rain across the screen
    createConfettiRain() {
        // Avoid duplicates
        const existing = document.querySelector('.confetti-container');
        if (existing) existing.remove();
        
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);
        
        const colors = ['#ff577f', '#ff884b', '#ffd166', '#06d6a0', '#118ab2', '#9c6efb'];
        const total = 320; // more pieces over longer time
        const durationMin = 1800;
        const durationMax = 3600;
        const maxDelay = 8500; // spread creation over ~8.5s
        
        for (let i = 0; i < total; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti';
            
            // Random starting X position and size
            piece.style.left = `${Math.random() * 100}%`;
            const size = 6 + Math.random() * 8;
            piece.style.width = `${size}px`;
            piece.style.height = `${size}px`;
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            // Staggered start and varied duration
            const delay = Math.random() * maxDelay; // ms
            const duration = durationMin + Math.random() * (durationMax - durationMin);
            piece.style.animationDelay = `${delay / 1000}s`;
            piece.style.animationDuration = `${duration / 1000}s`;
            
            // Slight random rotation via CSS variable
            piece.style.setProperty('--rotate', `${Math.random() * 720}deg`);
            
            container.appendChild(piece);
            
            // Cleanup each piece after it finishes
            setTimeout(() => {
                if (piece.parentNode) piece.remove();
            }, delay + duration + 200);
        }
        
        // Remove container after the rain ends (~10s)
        setTimeout(() => {
            if (container.parentNode) container.remove();
        }, 10000);
    }
}

// Flutter WebView Bridge (for mobile app)
function sendGameOverToFlutter(finalScore) {
    if (window.FlutterBridge) {
        try {
            window.FlutterBridge.postMessage('gameOver:' + finalScore);
            console.log('📱 Game result sent to Flutter:', finalScore);
        } catch (error) {
            console.error('❌ Error sending message to Flutter:', error);
        }
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BaateinGame();
});

