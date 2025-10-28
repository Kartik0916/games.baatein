# Baatein Games 🎮

A real-time multiplayer Tic Tac Toe game with Flutter WebView integration, built with Node.js, Socket.IO, and Flutter.

## 🌟 Features

- **Real-time Multiplayer**: Play Tic Tac Toe with friends using Socket.IO
- **Flutter Integration**: Native mobile app with WebView for game interface
- **Cross-platform**: Works on web browsers and mobile devices
- **Room System**: Create and join game rooms with unique codes
- **Chat System**: In-game chat for players
- **Responsive Design**: Optimized for both desktop and mobile

## 🏗️ Architecture

### Backend (Node.js + Socket.IO)
- **Server**: Express.js server with Socket.IO for real-time communication
- **Database**: MongoDB for game history and user statistics
- **CORS**: Configured for mobile WebView clients
- **Deployment**: Hosted on Vercel

### Frontend (Flutter + WebView)
- **Mobile App**: Flutter app with WebView integration
- **Game Interface**: HTML/CSS/JavaScript game loaded in WebView
- **Communication**: FlutterBridge for bidirectional communication
- **Assets**: Game files bundled as Flutter assets

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Flutter SDK
- MongoDB (local or cloud)

### Backend Setup
```bash
# Install dependencies
npm install

# Set environment variables
cp env.template .env
# Edit .env with your MongoDB URI

# Start development server
npm run dev
```

### Production URLs
- **Frontend**: https://games-baatein-frontend.vercel.app/
- **Backend API**: https://games-baatein.vercel.app/

### Flutter Setup
```bash
# Install Flutter dependencies
flutter pub get

# Run the app
flutter run
```

## 📱 Mobile App Features

### WebView Integration
- Loads game from Flutter assets
- Bidirectional communication via FlutterBridge
- Mobile-optimized viewport settings
- Performance optimizations for mobile devices

### Game Communication
```javascript
// Send game result to Flutter
sendGameOverToFlutter('win'); // 'win', 'loss', or 'draw'
```

## 🌐 Deployment

### Vercel Deployment
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Deploy automatically

### Environment Variables
Set these in Vercel dashboard:
- `MONGODB_URI`: Your MongoDB connection string
- `NODE_ENV`: production

## 🎯 Game Flow

1. **Login**: Enter username and choose avatar
2. **Room Management**: Create or join game rooms
3. **Waiting Room**: Wait for opponent and mark ready
4. **Game Play**: Real-time Tic Tac Toe with turn-based gameplay
5. **Game Over**: Results sent to Flutter app

## 🔧 API Endpoints

- `GET /` - Health check
- `GET /api/games` - Game statistics
- `GET /api/rooms` - Room management
- `GET /api/users` - User management

## 📡 Socket.IO Events

### Client → Server
- `authenticate` - User authentication
- `createRoom` - Create new game room
- `joinRoom` - Join existing room
- `playerReady` - Mark player as ready
- `makeMove` - Make game move
- `chatMessage` - Send chat message
- `leaveRoom` - Leave current room

### Server → Client
- `authenticated` - Authentication confirmation
- `roomCreated` - Room creation success
- `playerJoined` - Player joined room
- `gameStarted` - Game begins
- `moveMade` - Move processed
- `gameOver` - Game ended
- `chatMessage` - Chat message received

## 🛠️ Development

### Project Structure
```
├── baatein-games-backend/     # Node.js backend
│   ├── controllers/           # Route controllers
│   ├── models/               # Database models
│   ├── routes/               # API routes
│   ├── socket/               # Socket.IO handlers
│   └── server.js             # Main server file
├── lib/                      # Flutter app
│   └── screens/              # App screens
├── assets/game/              # Game assets
│   ├── index.html            # Game HTML
│   ├── game.js               # Game logic
│   └── styles.css            # Game styles
└── pubspec.yaml              # Flutter dependencies
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, email support@baateingames.com or create an issue on GitHub.

---

Made with ❤️ by Baatein Games Team
