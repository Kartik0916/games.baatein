# Baatein Games - Tic Tac Toe with Video Chat

A real-time multiplayer Tic Tac Toe game with integrated video/audio chat using React Native, Node.js, Socket.io, and Agora.

## 🎮 Features

- **Real-time Multiplayer Tic Tac Toe**: Play against friends with instant move synchronization
- **Live Video/Audio Chat**: See and talk to your opponent during gameplay using Agora
- **Modern UI/UX**: Beautiful, responsive design optimized for mobile devices
- **Game Statistics**: Track your wins, losses, and game history
- **Room Management**: Create or join game rooms with unique IDs
- **Draw/Resign Options**: Professional game features for fair play

## 🏗️ Architecture

### Backend (Node.js + Express + Socket.io)
- **Real-time Communication**: Socket.io for instant game updates
- **Database**: MongoDB for storing games, users, and statistics
- **Game Logic**: Server-side validation and state management
- **API Endpoints**: RESTful API for room management and user stats

### Frontend (React Native)
- **Real-time Updates**: Socket.io client for live game synchronization
- **Video Chat**: Agora SDK for high-quality video/audio communication
- **Game Components**: Modular, reusable UI components
- **State Management**: Local state with real-time sync

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- React Native development environment
- Agora.io account and App ID

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
cd baatein-games-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# MONGODB_URI=mongodb://localhost:27017/baatein-games
# PORT=3000
# NODE_ENV=development

# Start the server
npm start
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# For iOS
cd ios && pod install && cd ..

# Start Metro bundler
npx react-native start

# Run on device/simulator
npx react-native run-ios
# or
npx react-native run-android
```

### 3. Agora Configuration

1. Create an account at [Agora.io](https://www.agora.io/)
2. Create a new project and get your App ID
3. Update the Agora App ID in:
   - `src/screens/GamesSelectionScreen.js`
   - `src/screens/TicTacToeScreen.js`
   - `src/components/VideoCallView.js`

## 🎯 How to Play

1. **Start the App**: Open the Baatein Games app
2. **Create/Join Room**: 
   - Create a new Tic Tac Toe room
   - Or join an existing room with a room ID
3. **Video Chat**: Automatically connects when both players join
4. **Play**: Take turns placing X's and O's on the 3x3 grid
5. **Win**: Get three in a row (horizontal, vertical, or diagonal)
6. **Play Again**: Restart the game or create a new room

## 🔧 API Endpoints

### Game Routes
- `POST /api/games/tic-tac-toe/create` - Create new game room
- `POST /api/games/tic-tac-toe/join` - Join existing room
- `POST /api/games/tic-tac-toe/move` - Make a move
- `POST /api/games/tic-tac-toe/restart` - Restart game

### Room Routes
- `GET /api/rooms/active` - Get active rooms
- `GET /api/rooms/:roomId` - Get room details

### User Routes
- `POST /api/users/create` - Create/update user
- `GET /api/users/:userId` - Get user details
- `GET /api/users/:userId/stats` - Get user statistics

## 🎮 Socket Events

### Client → Server
- `authenticate` - Authenticate user
- `createRoom` - Create game room
- `joinRoom` - Join existing room
- `playerReady` - Mark player as ready
- `makeMove` - Make game move
- `restartGame` - Restart finished game
- `chatMessage` - Send chat message
- `offerDraw` - Offer draw
- `acceptDraw` - Accept draw offer
- `resign` - Resign from game

### Server → Client
- `authenticated` - Authentication confirmed
- `roomCreated` - Room created successfully
- `playerJoined` - Player joined room
- `gameStarted` - Game has begun
- `moveMade` - Move was made
- `gameOver` - Game finished
- `gameRestarted` - Game was restarted
- `chatMessage` - Chat message received
- `drawOffered` - Draw was offered
- `playerLeft` - Player left room
- `error` - Error occurred

## 🧪 Testing

Run the Tic Tac Toe logic tests:

```bash
cd baatein-games-backend
node test/ticTacToeTest.js
```

## 📱 Screenshots

- **Games Selection**: Choose Tic Tac Toe and create/join rooms
- **Game Screen**: Play with live video chat overlay
- **Game Board**: Interactive 3x3 grid with animations
- **Video Chat**: Floating video windows with controls

## 🔧 Troubleshooting

### Common Issues

1. **Connection Failed**: Check if backend server is running on correct port
2. **Video Not Working**: Verify Agora App ID is correctly configured
3. **Database Errors**: Ensure MongoDB is running and connection string is correct
4. **Build Errors**: Clear Metro cache and rebuild: `npx react-native start --reset-cache`

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in backend `.env` file.

## 🚀 Deployment

### Backend Deployment
1. Deploy to cloud platform (Heroku, AWS, etc.)
2. Set environment variables
3. Configure MongoDB Atlas or cloud database

### Frontend Deployment
1. Build for production
2. Deploy to app stores (iOS App Store, Google Play)
3. Update server URLs in production build

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎯 Future Enhancements

- [ ] Chess implementation
- [ ] Ludo multiplayer
- [ ] Tournament mode
- [ ] AI opponents
- [ ] Spectator mode
- [ ] Game replays
- [ ] Social features (friends, chat)

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Enjoy playing Baatein Games! 🎮**
