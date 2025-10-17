import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  TextInput,
  Modal
} from 'react-native';
import socketService from '../services/socketService';
import agoraService from '../services/agoraService';

const { width } = Dimensions.get('window');

const GamesSelectionScreen = ({ navigation, route }) => {
  const { userId, username, avatar } = route.params || {};

  const [isConnected, setIsConnected] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeConnection();
    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const initializeConnection = async () => {
    try {
      // Connect to socket server
      const serverUrl = 'http://localhost:3000'; // Update with your server URL
      await socketService.connect(serverUrl, userId, username, avatar);
      setIsConnected(true);
      console.log('✅ Connected to game server');
    } catch (error) {
      console.error('❌ Failed to connect to server:', error);
      Alert.alert('Connection Error', 'Failed to connect to game server');
    }
  };

  const createTicTacToeRoom = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    setIsLoading(true);
    try {
      const result = await socketService.createRoom('tic-tac-toe', userId, username, avatar);
      
      if (result.success) {
        console.log('🎮 Tic Tac Toe room created:', result.room);
        
        // Navigate to Tic Tac Toe screen
        navigation.navigate('TicTacToe', {
          roomData: result.room,
          userId,
          username,
          avatar,
          isHost: true
        });
      } else {
        Alert.alert('Error', 'Failed to create room');
      }
    } catch (error) {
      console.error('❌ Error creating room:', error);
      Alert.alert('Error', 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const joinTicTacToeRoom = async () => {
    if (!roomIdInput.trim()) {
      Alert.alert('Error', 'Please enter a room ID');
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    setIsLoading(true);
    try {
      const result = await socketService.joinRoom(roomIdInput.trim(), userId, username, avatar);
      
      if (result) {
        console.log('👥 Joined Tic Tac Toe room:', result.room);
        setShowJoinModal(false);
        setRoomIdInput('');
        
        // Navigate to Tic Tac Toe screen
        navigation.navigate('TicTacToe', {
          roomData: result.room,
          userId,
          username,
          avatar,
          isHost: false
        });
      }
    } catch (error) {
      console.error('❌ Error joining room:', error);
      Alert.alert('Error', 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const renderGameCard = (title, description, icon, onPress, disabled = false) => {
    return (
      <TouchableOpacity
        style={[styles.gameCard, disabled && styles.disabledCard]}
        onPress={onPress}
        disabled={disabled || !isConnected}
        activeOpacity={0.8}
      >
        <View style={styles.gameIcon}>
          <Text style={styles.gameIconText}>{icon}</Text>
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameTitle}>{title}</Text>
          <Text style={styles.gameDescription}>{description}</Text>
        </View>
        <View style={styles.gameArrow}>
          <Text style={styles.arrowText}>▶</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJoinModal = () => {
    return (
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Tic Tac Toe Room</Text>
            <Text style={styles.modalDescription}>
              Enter the room ID to join an existing game
            </Text>
            
            <TextInput
              style={styles.roomIdInput}
              placeholder="Enter Room ID"
              placeholderTextColor="#888"
              value={roomIdInput}
              onChangeText={setRoomIdInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.joinButton]}
                onPress={joinTicTacToeRoom}
                disabled={isLoading}
              >
                <Text style={styles.modalButtonText}>
                  {isLoading ? 'Joining...' : 'Join Room'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎮 Baatein Games</Text>
        <Text style={styles.headerSubtitle}>Choose a game to play</Text>
        
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ECDC4' : '#FF6B6B' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userText}>Playing as: {username}</Text>
      </View>

      {/* Games List */}
      <ScrollView style={styles.gamesList} showsVerticalScrollIndicator={false}>
        {/* Tic Tac Toe */}
        <View style={styles.gameSection}>
          <Text style={styles.sectionTitle}>🎯 Strategy Games</Text>
          
          {renderGameCard(
            'Tic Tac Toe',
            'Classic 3x3 grid game with real-time multiplayer',
            '⭕',
            createTicTacToeRoom
          )}
          
          <TouchableOpacity
            style={styles.joinRoomButton}
            onPress={() => setShowJoinModal(true)}
            disabled={!isConnected}
          >
            <Text style={styles.joinRoomButtonText}>Join Existing Room</Text>
          </TouchableOpacity>
        </View>

        {/* Coming Soon Games */}
        <View style={styles.gameSection}>
          <Text style={styles.sectionTitle}>🚀 Coming Soon</Text>
          
          {renderGameCard(
            'Chess',
            'Classic chess with live video chat',
            '♟️',
            () => Alert.alert('Coming Soon', 'Chess will be available soon!'),
            true
          )}
          
          {renderGameCard(
            'Ludo',
            'Traditional board game for 4 players',
            '🎲',
            () => Alert.alert('Coming Soon', 'Ludo will be available soon!'),
            true
          )}
          
          {renderGameCard(
            'Connect Four',
            'Vertical tic-tac-toe with strategy',
            '🔴',
            () => Alert.alert('Coming Soon', 'Connect Four will be available soon!'),
            true
          )}
        </View>
      </ScrollView>

      {/* Join Modal */}
      {renderJoinModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 50
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  userInfo: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  userText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600'
  },
  gamesList: {
    flex: 1,
    paddingHorizontal: 20
  },
  gameSection: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledCard: {
    opacity: 0.5
  },
  gameIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  gameIconText: {
    fontSize: 24
  },
  gameInfo: {
    flex: 1
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  gameDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20
  },
  gameArrow: {
    marginLeft: 10
  },
  arrowText: {
    fontSize: 16,
    color: '#4ECDC4'
  },
  joinRoomButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  joinRoomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#16213e',
    padding: 30,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  modalDescription: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20
  },
  roomIdInput: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#4ECDC4',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    width: '100%',
    marginBottom: 25
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  modalButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#888'
  },
  joinButton: {
    backgroundColor: '#4ECDC4'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default GamesSelectionScreen;
