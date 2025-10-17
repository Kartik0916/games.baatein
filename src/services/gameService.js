import axios from 'axios';

const API_BASE_URL = 'http://YOUR_SERVER_URL:3000/api';

class GameService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log('📤 API Request:', config.method.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log('📥 API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('❌ Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // User APIs
  async getUser(userId) {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async createOrUpdateUser(userData) {
    try {
      const response = await this.api.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const response = await this.api.get(`/games/user/${userId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  async getUserGameHistory(userId, gameType = null, limit = 20) {
    try {
      const params = { limit };
      if (gameType) params.gameType = gameType;
      
      const response = await this.api.get(`/games/user/${userId}/history`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching game history:', error);
      throw error;
    }
  }

  async updateUserSettings(userId, settings) {
    try {
      const response = await this.api.put(`/users/${userId}/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async getUserFriends(userId) {
    try {
      const response = await this.api.get(`/users/${userId}/friends`);
      return response.data;
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  }

  async addFriend(userId, friendUserId, friendUsername) {
    try {
      const response = await this.api.post(`/users/${userId}/friends`, {
        friendUserId,
        friendUsername
      });
      return response.data;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  // Room APIs
  async getAvailableRooms(gameType = null) {
    try {
      const params = gameType ? { gameType } : {};
      const response = await this.api.get('/rooms', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  async getRoom(roomId) {
    try {
      const response = await this.api.get(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching room:', error);
      throw error;
    }
  }

  async createRoom(gameType, userId, username, avatar, options = {}) {
    try {
      const response = await this.api.post('/rooms/create', {
        gameType,
        userId,
        username,
        avatar,
        isPrivate: options.isPrivate || false,
        password: options.password || null,
        gameSettings: options.gameSettings || {}
      });
      return response.data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async joinRoom(roomId, userId, username, avatar, password = null) {
    try {
      const response = await this.api.post(`/rooms/${roomId}/join`, {
        userId,
        username,
        avatar,
        password
      });
      return response.data;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async leaveRoom(roomId, userId) {
    try {
      const response = await this.api.post(`/rooms/${roomId}/leave`, { userId });
      return response.data;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  async getAgoraToken(roomId, userId) {
    try {
      const response = await this.api.get(`/rooms/${roomId}/token`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting Agora token:', error);
      throw error;
    }
  }

  // Game APIs
  async getLeaderboard(gameType = null, limit = 100) {
    try {
      const endpoint = gameType 
        ? `/games/leaderboard/${gameType}`
        : '/games/leaderboard';
      
      const response = await this.api.get(endpoint, { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getGame(roomId) {
    try {
      const response = await this.api.get(`/games/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm, limit = 20) {
    try {
      const response = await this.api.get('/users', {
        params: { search: searchTerm, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Health check
  async checkServerHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.data;
    } catch (error) {
      console.error('Server health check failed:', error);
      return { status: 'offline' };
    }
  }
}

export default new GameService();