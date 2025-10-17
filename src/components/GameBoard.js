import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated
} from 'react-native';

const { width } = Dimensions.get('window');
const BOARD_SIZE = width - 80;
const CELL_SIZE = (BOARD_SIZE - 20) / 3;

const GameBoard = ({
  board,
  onCellPress,
  currentTurn,
  myUserId,
  gameStatus,
  winningLine,
  disabled = false
}) => {
  const scaleAnims = useRef(Array(9).fill(null).map(() => new Animated.Value(1))).current;
  const [lastMoveIndex, setLastMoveIndex] = useState(null);

  useEffect(() => {
    // Animate the last moved cell
    if (lastMoveIndex !== null) {
      animateCell(lastMoveIndex);
    }
  }, [lastMoveIndex]);

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

  const handleCellPress = (index) => {
    if (disabled || gameStatus !== 'active' || board[index] !== null) {
      return;
    }

    if (currentTurn !== myUserId) {
      return;
    }

    setLastMoveIndex(index);
    onCellPress(index);
  };

  const renderCell = (index) => {
    const value = board[index];
    const isWinningCell = winningLine && winningLine.includes(index);
    const isLastMove = lastMoveIndex === index;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.cell,
          isWinningCell && styles.winningCell,
          isLastMove && styles.lastMoveCell
        ]}
        onPress={() => handleCellPress(index)}
        disabled={disabled || gameStatus !== 'active' || value !== null}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
          <Text style={[
            styles.cellText,
            value === 'X' ? styles.xText : styles.oText,
            isWinningCell && styles.winningText
          ]}>
            {value || ''}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderBoard = () => {
    return (
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {Array(9).fill(null).map((_, index) => renderCell(index))}
        </View>
      </View>
    );
  };

  return renderBoard();
};

const styles = StyleSheet.create({
  boardContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2a2a3e'
  },
  cellText: {
    fontSize: 60,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  xText: {
    color: '#4ECDC4',
    textShadowColor: '#4ECDC4',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  oText: {
    color: '#FF6B6B',
    textShadowColor: '#FF6B6B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  winningCell: {
    backgroundColor: '#FFD93D',
    borderColor: '#FFD93D',
    shadowColor: '#FFD93D',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  winningText: {
    color: '#1a1a2e',
    fontWeight: '900'
  },
  lastMoveCell: {
    borderColor: '#4ECDC4',
    borderWidth: 3
  }
});

export default GameBoard;
