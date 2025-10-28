// game.js - Complete Working Game Logic
class BaateinGame {
    constructor() {
        this.socket = null;
        this.user = null;
        this.currentRoom = null;
        this.gameState = null;
        this.isMyTurn = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.showLoginScreen();
    }

    initializeElements() {
        // Screen elements
        this.loginScreen = document.getElementById('loginScreen');
        this.gameScreen = document.getElementById('gameScreen');
        
        // Login elements
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('usernameInput');
        this.userInfo = document.getElementById('userInfo');
        this.username = document.getElementById('username');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // Room elements
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.roomInput = document.getElementById('roomInput');
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.joinWithCodeBtn = document.getElementById('joinWithCodeBtn');
        this.cancelJoinBtn = document.getElementById('cancelJoinBtn');
        
        // Waiting room elements
        this.waitingRoom = document.getElementById('waitingRoom');
        this.roomCode = document.getElementById('roomCode');
        this.playersList = document.getElementById('playersList');
        this.readyBtn = document.getElementById('readyBtn');
        
        // Game elements
        this.gameBoardContainer = document.getElementById('gameBoardContainer');
        this.gameBoard = document.getElementById('gameBoard');
        this.currentPlayerText = document.getElementById('currentPlayerText');
        this.gameStatus = document.getElementById('gameStatus');
        
        // Game over elements
        this.gameOver = document.getElementById('gameOver');
        this.gameOverTitle = document.getElementById('gameOverTitle');
        this.gameOverMessage = document.getElementById('gameOverMessage');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.leaveRoomBtn = document.getElementById('leaveRoomBtn');
        
        // Chat elements
        this.chatSection = document.getElementById('chatSection');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendMessageBtn = document.getElementById('sendMessageBtn');
        
        // Other elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notifications = document.getElementById('notifications');
    }

    setupEventListeners() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Room management
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.showJoinRoomInput());
        this.joinWithCodeBtn.addEventListener('click', () => this.joinRoom());
        this.cancelJoinBtn.addEventListener('click', () => this.hideJoinRoomInput());
        
        // Game controls
        this.readyBtn.addEventListener('click', () => this.markReady());
        
        // Game over actions
        this.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        
        // Chat
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Room code input
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
        this.gameScreen.style.display = 'block';
        this.userInfo.style.display = 'flex';
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
            
            this.user = {
                userId,
                username,
                avatar
            };
            
            await this.connectToServer();
            
            this.username.textContent = username;
            this.showGameScreen();
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
            this.socket = io('https://games-baatein.vercel.app', {
                transports: ['websocket', 'polling']
            });
            
            this.socket.on('connect', () => {
                console.log('🔍 Connected to server');
                
                this.socket.emit('authenticate', this.user);
                
                this.setupSocketListeners();
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
        });
    }

    setupSocketListeners() {
        // Authentication
        this.socket.on('authenticated', (data) => {
            console.log('🔍 Authenticated:', data);
        });
        
        // Room events
        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            if (data.success && data.room) {
                this.currentRoom = data.room;
                this.showWaitingRoom();
                this.showNotification('Room created successfully!', 'success');
            } else {
                this.showNotification('Failed to create room', 'error');
            }
        });
        
        this.socket.on('playerJoined', (data) => {
            console.log('🔍 Player joined:', data);
            if (data.room) {
                this.currentRoom = data.room;
                this.showWaitingRoom();
                this.updatePlayersList();
                this.checkIfCanStart();
                this.showNotification(`${data.player.username} joined the room`, 'info');
            }
        });
        
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            if (data.room) {
                this.currentRoom = data.room;
                this.updatePlayersList();
                this.checkIfCanStart();
                this.showNotification(`${data.player.username} left the room`, 'warning');
            }
        });
        
        this.socket.on('playerReadyUpdate', (data) => {
            console.log('Player ready update:', data);
            this.updatePlayersList(data.players);
            this.checkIfCanStart();
        });
        
        // Game events
        this.socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
            if (data.gameState) {
                this.gameState = data.gameState;
                this.currentRoom.status = 'active';
                this.currentRoom.currentTurn = data.currentTurn;
                this.showGameBoard();
                this.updateGameStatus();
                this.showNotification('Game started!', 'success');
            }
        });
        
        this.socket.on('moveMade', (data) => {
            console.log('Move made:', data);
            if (data.gameState) {
                this.gameState = data.gameState;
                this.currentRoom.currentTurn = data.currentTurn;
                this.updateGameBoard();
                this.updateGameStatus();
            }
        });
        
        this.socket.on('gameOver', (data) => {
            console.log('Game over:', data);
            if (data) {
                this.showGameOver(data);
            }
        });
        
        // Chat events
        this.socket.on('chatMessage', (data) => {
            if (data && data.username && data.message) {
                this.addChatMessage(data);
            }
        });
        
        // Error handling
        this.socket.on('error', (data) => {
            console.error('🔍 Socket error:', data);
            this.showNotification(data.message || 'An error occurred', 'error');
        });
    }

    createRoom() {
        if (!this.socket) {
            this.showNotification('Not connected to server', 'error');
            return;
        }
        
        if (!this.user.userId || !this.user.username) {
            this.showNotification('User information missing', 'error');
            return;
        }
        
        this.socket.emit('createRoom', {
            userId: this.user.userId,
            username: this.user.username,
            avatar: this.user.avatar
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
        
        if (!roomId) {
            this.showNotification('Please enter a room code', 'error');
            return;
        }
        
        if (!this.socket) {
            this.showNotification('Not connected to server', 'error');
            return;
        }
        
        if (!this.user.userId || !this.user.username) {
            this.showNotification('User information missing', 'error');
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
        this.waitingRoom.style.display = 'block';
        this.gameBoardContainer.style.display = 'none';
        this.gameOver.style.display = 'none';
        this.chatSection.style.display = 'block';
        
        this.roomCode.textContent = this.currentRoom.roomId;
        this.updatePlayersList();
        this.checkIfCanStart();
    }

    updatePlayersList(players = null) {
        const playersToShow = players || this.currentRoom.players;
        
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
    }

    checkIfCanStart() {
        const allReady = this.currentRoom.players.every(p => p.ready);
        const hasTwoPlayers = this.currentRoom.players.length === 2;
        
        this.readyBtn.disabled = !hasTwoPlayers;
        
        if (hasTwoPlayers && allReady) {
            this.readyBtn.textContent = 'Starting Game...';
            this.readyBtn.disabled = true;
        } else if (hasTwoPlayers) {
            this.readyBtn.innerHTML = '<i class="fas fa-check"></i> Ready to Play';
        } else {
            this.readyBtn.innerHTML = `<i class="fas fa-users"></i> Waiting for Players (${this.currentRoom.players.length}/2)`;
        }
    }

    markReady() {
        if (!this.socket || !this.currentRoom) {
            this.showNotification('Not connected or no room', 'error');
            return;
        }
        
        if (!this.currentRoom.roomId) {
            this.showNotification('Invalid room', 'error');
            return;
        }
        
        this.socket.emit('playerReady', {
            roomId: this.currentRoom.roomId
        });
        
        this.readyBtn.disabled = true;
        this.readyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ready';
    }

    showGameBoard() {
        this.waitingRoom.style.display = 'none';
        this.gameBoardContainer.style.display = 'block';
        this.gameOver.style.display = 'none';
        
        this.createGameBoard();
        this.updateGameStatus();
    }

    createGameBoard() {
        this.gameBoard.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            
            if (this.gameState.board[i]) {
                cell.textContent = this.gameState.board[i];
                cell.classList.add('occupied', this.gameState.board[i].toLowerCase());
            }
            
            cell.addEventListener('click', () => this.makeMove(i));
            this.gameBoard.appendChild(cell);
        }
    }

    updateGameBoard() {
        const cells = this.gameBoard.querySelectorAll('.cell');
        
        cells.forEach((cell, index) => {
            const value = this.gameState.board[index];
            
            if (value) {
                cell.textContent = value;
                cell.classList.add('occupied', value.toLowerCase());
            } else {
                cell.textContent = '';
                cell.classList.remove('occupied', 'x', 'o');
            }
        });
    }

    makeMove(position) {
        if (!this.socket || !this.currentRoom || this.currentRoom.status !== 'active') {
            console.error('Invalid game state for move');
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
        console.log('🔍 Game over:', data);
        
        this.gameBoardContainer.style.display = 'none';
        this.gameOver.style.display = 'block';
        
        let title, message, score;
        
        if (data.winner === 'draw') {
            title = 'Game Draw!';
            message = 'The game ended in a draw.';
            score = 'draw';
        } else if (data.winner === this.user.userId) {
            title = 'You Won!';
            message = 'Congratulations! You won the game.';
            score = 'win';
        } else {
            title = 'You Lost!';
            message = 'Better luck next time!';
            score = 'loss';
        }
        
        this.gameOverTitle.textContent = title;
        this.gameOverMessage.textContent = message;
        
        // Send game over message to Flutter
        sendGameOverToFlutter(score);
    }

    playAgain() {
        if (!this.socket || !this.currentRoom) return;
        
        // Reset game state
        this.currentRoom.status = 'waiting';
        this.currentRoom.players.forEach(player => player.ready = false);
        this.showWaitingRoom();
        this.showNotification('Game reset!', 'info');
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
        this.chatSection.style.display = 'none';
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message || !this.socket || !this.currentRoom) return;
        
        this.socket.emit('chatMessage', {
            roomId: this.currentRoom.roomId,
            message
        });
        
        this.chatInput.value = '';
    }

    addChatMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${data.userId === this.user.userId ? 'own' : 'other'}`;
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="username">${data.username}</div>
            <div class="message">${data.message}</div>
            <div class="timestamp">${timestamp}</div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleLogout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
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
}

// Flutter WebView Communication Bridge
function sendGameOverToFlutter(finalScore) {
    if (window.FlutterBridge) {
        try {
            window.FlutterBridge.postMessage('gameOver:' + finalScore);
            console.log('📱 Game result sent to Flutter:', finalScore);
        } catch (error) {
            console.error('❌ Error sending message to Flutter:', error);
        }
    } else {
        console.log('🔍 FlutterBridge not available - running outside mobile app');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BaateinGame();
});