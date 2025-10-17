import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
  Modal
} from 'react-native';
import socketService from '../services/socketService';
import GameBoard from '../components/GameBoard';
import VideoCallView from '../components/VideoCallView';
import { TicTacToeLogic } from '../utils/gameLogic';

const { width, height } = Dimensions.get('window');
const CELL_SIZE = (width - 80) / 3;

const TicTacToeScreen = ({ route, navigation }) => {
  const { roomData, userId, username, avatar } = route.params;

  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [players, setPlayers] = useState(roomData.players || []);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [mySymbol, setMySymbol] = useState(null);
  const [opponentSymbol, setOpponentSymbol] = useState(null);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);

  const scaleAnims = useRef(Array(9).fill(null).map(() => new Animated.Value(1))).current;

  useEffect(() => {
    initializeGame();
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, []);

  const initializeGame = async () => {
    try {
      // Determine player symbols
      const playerIndex = players.findIndex(p => p.userId === userId);
      setMySymbol(playerIndex === 0 ? 'X' : 'O');
      setOpponentSymbol(playerIndex === 0 ? 'O' : 'X');

      console.log('✅ Game initialized');
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      Alert.alert('Error', 'Failed to initialize game');
    }
  };

  const setupSocketListeners = () => {
    socketService.on('gameStarted', (data) => {
      console.log('🎮 Game started', data);
      setGameStatus('active');
      setCurrentTurn(data.currentTurn);
      setBoard(data.gameState.board);
    });

    socketService.on('moveMade', (data) => {
      console.log('🎯 Move made', data);
      setBoard(data.gameState.board);
      setCurrentTurn(data.currentTurn);
      
      // Animate the cell
      const position = data.move.position;
      animateCell(position);
    });

    socketService.on('gameOver', (data) => {
      console.log('🏁 Game over', data);
      setGameStatus('finished');
      setWinner(data.winner);
      
      if (data.winner !== 'draw') {
        // Find winning line using game logic
        const result = TicTacToeLogic.checkWinner(data.gameState.board);
        if (result && result.line) {
          setWinningLine(result.line);
        }
      }

      setTimeout(() => {
        showGameOverDialog(data);
      }, 1000);
    });

    socketService.on('gameRestarted', (data) => {
      console.log('🔄 Game restarted', data);
      setGameStatus('waiting');
      setBoard(data.room.gameState.board);
      setCurrentTurn(null);
      setWinner(null);
      setWinningLine(null);
      setPlayers(data.room.players);
    });

    socketService.on('playerLeft', (data) => {
      Alert.alert(
        'Player Left',
        'Your opponent has left the game. You win!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    });

    socketService.on('chatMessage', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    socketService.on('drawOffered', (data) => {
      setShowDrawOffer(true);
    });
  };


  const cleanup = async () => {
    try {
      socketService.removeAllListeners('gameStarted');
      socketService.removeAllListeners('moveMade');
      socketService.removeAllListeners('gameOver');
      socketService.removeAllListeners('playerLeft');
      socketService.removeAllListeners('chatMessage');
      socketService.removeAllListeners('drawOffered');

      socketService.leaveRoom(roomData.roomId);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleCellPress = (index) => {
    if (gameStatus !== 'active') {
      Alert.alert('Wait', 'Game has not started yet');
      return;
    }

    if (currentTurn !== userId) {
      Alert.alert('Wait', 'Not your turn');
      return;
    }

    if (board[index] !== null) {
      Alert.alert('Invalid', 'Cell already occupied');
      return;
    }

    // Make move
    socketService.makeMove(roomData.roomId, { position: index });
  };

  const animateCell = (index) => {
    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 100,
        friction: 3
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3
      })
    ]).start();
  };


  const showGameOverDialog = (data) => {
    let title = 'Game Over';
    let message = '';

    if (data.winner === 'draw') {
      title = "It's a Draw!";
      message = 'Well played by both players!';
    } else if (data.winner === userId) {
      title = 'You Won! 🎉';
      message = 'Congratulations! You are the winner!';
    } else {
      title = 'You Lost';
      message = 'Better luck next time!';
    }

    Alert.alert(title, message, [
      { text: 'Play Again', onPress: handlePlayAgain },
      { text: 'Exit', onPress: () => navigation.goBack() }
    ]);
  };

  const handlePlayAgain = () => {
    // Restart the current game
    socketService.restartGame(roomData.roomId);
  };


  const handleOfferDraw = () => {
    Alert.alert(
      'Offer Draw',
      'Do you want to offer a draw to your opponent?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Offer Draw',
          onPress: () => socketService.offerDraw(roomData.roomId)
        }
      ]
    );
  };

  const handleAcceptDraw = () => {
    socketService.acceptDraw(roomData.roomId);
    setShowDrawOffer(false);
  };

  const handleResign = () => {
    Alert.alert(
      'Resign',
      'Are you sure you want to resign? You will lose the game.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resign',
          style: 'destructive',
          onPress: () => socketService.resign(roomData.roomId)
        }
      ]
    );
  };



  const renderGameInfo = () => {
    const isMyTurn = currentTurn === userId;
    const opponent = players.find(p => p.userId !== userId);

    return (
      <View style={styles.gameInfo}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>You ({mySymbol})</Text>
          {isMyTurn && <View style={styles.turnIndicator} />}
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {opponent?.username || 'Opponent'} ({opponentSymbol})
          </Text>
          {!isMyTurn && gameStatus === 'active' && <View style={styles.turnIndicator} />}
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (gameStatus !== 'active') return null;

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.drawButton]}
          onPress={handleOfferDraw}
        >
          <Text style={styles.actionButtonText}>Offer Draw</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.resignButton]}
          onPress={handleResign}
        >
          <Text style={styles.actionButtonText}>Resign</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Video Call */}
      <VideoCallView
        channelName={roomData.agoraChannel}
        uid={parseInt(userId) || 0}
        agoraAppId={roomData.agoraAppId || 'YOUR_AGORA_APP_ID'}
        agoraToken={roomData.agoraToken || null}
        style="floating"
      />

      {/* Game Info */}
      {renderGameInfo()}

      {/* Game Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {gameStatus === 'waiting' && 'Waiting for game to start...'}
          {gameStatus === 'active' && currentTurn === userId && '🟢 Your Turn'}
          {gameStatus === 'active' && currentTurn !== userId && '⏳ Opponent\'s Turn'}
          {gameStatus === 'finished' && 'Game Over'}
        </Text>
      </View>

      {/* Tic Tac Toe Board */}
      <GameBoard
        board={board}
        onCellPress={handleCellPress}
        currentTurn={currentTurn}
        myUserId={userId}
        gameStatus={gameStatus}
        winningLine={winningLine}
        disabled={gameStatus !== 'active'}
      />

      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Draw Offer Modal */}
      <Modal
        visible={showDrawOffer}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Draw Offer</Text>
            <Text style={styles.modalMessage}>
              Your opponent is offering a draw. Do you accept?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.declineButton]}
                onPress={() => setShowDrawOffer(false)}
              >
                <Text style={styles.modalButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton]}
                onPress={handleAcceptDraw}
              >
                <Text style={styles.modalButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 12
  },
  playerInfo: {
    flex: 1,
    alignItems: 'center'
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  turnIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
    marginTop: 5
  },
  vsContainer: {
    paddingHorizontal: 20
  },
  vsText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold'
  },
  statusContainer: {
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center'
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20
  },
  actionButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center'
  },
  drawButton: {
    backgroundColor: '#4ECDC4'
  },
  resignButton: {
    backgroundColor: '#FF6B6B'
  },
  actionButtonText: {
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
    width: '80%',
    alignItems: 'center'
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15
  },
  modalMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
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
  declineButton: {
    backgroundColor: '#888'
  },
  acceptButton: {
    backgroundColor: '#4ECDC4'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default TicTacToeScreen;