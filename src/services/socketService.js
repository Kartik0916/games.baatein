import io from 'socket.io-client';

class SocketService {
  socket = null;
  listeners = new Map();

  connect(serverUrl, userId, username, avatar) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to game server:', this.socket.id);
          
          // Authenticate user
          this.socket.emit('authenticate', {
            userId,
            username,
            avatar
          });

          resolve(this.socket);
        });

        this.socket.on('authenticated', (data) => {
          console.log('✅ User authenticated:', data);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error('❌ Socket error:', error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected:', reason);
        });

        // Setup default listeners
        this.setupDefaultListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  setupDefaultListeners() {
    const events = [
      'roomCreated',
      'playerJoined',
      'playerLeft',
      'playerReadyUpdate',
      'gameStarted',
      'moveMade',
      'gameOver',
      'chatMessage',
      'drawOffered',
      'error'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        console.log(`📨 Event received: ${event}`, data);
        
        // Notify all registered listeners for this event
        if (this.listeners.has(event)) {
          this.listeners.get(event).forEach(callback => callback(data));
        }
      });
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  createRoom(gameType, userId, username, avatar) {
    return new Promise((resolve) => {
      this.socket.emit('createRoom', {
        gameType,
        userId,
        username,
        avatar
      });

      const handler = (data) => {
        this.off('roomCreated', handler);
        resolve(data);
      };

      this.on('roomCreated', handler);
    });
  }

  joinRoom(roomId, userId, username, avatar) {
    return new Promise((resolve) => {
      this.socket.emit('joinRoom', {
        roomId,
        userId,
        username,
        avatar
      });

      const handler = (data) => {
        this.off('playerJoined', handler);
        resolve(data);
      };

      this.on('playerJoined', handler);
    });
  }

  playerReady(roomId) {
    this.socket.emit('playerReady', { roomId });
  }

  makeMove(roomId, move) {
    this.socket.emit('makeMove', {
      roomId,
      move
    });
  }

  sendChatMessage(roomId, message) {
    this.socket.emit('chatMessage', {
      roomId,
      message
    });
  }

  leaveRoom(roomId) {
    this.socket.emit('leaveRoom', { roomId });
  }

  offerDraw(roomId) {
    this.socket.emit('offerDraw', { roomId });
  }

  acceptDraw(roomId) {
    this.socket.emit('acceptDraw', { roomId });
  }

  resign(roomId) {
    this.socket.emit('resign', { roomId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('🔌 Socket disconnected');
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

export default new SocketService();