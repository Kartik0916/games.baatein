# Baatein Games Backend - Tic Tac Toe

A simplified backend server for the Baatein Games Tic Tac Toe multiplayer game.

## Features

- 🎮 **2-Player Tic Tac Toe Game**
- 🔄 **Real-time Gameplay** with Socket.IO
- 🏠 **Room Management** (Create/Join/Leave)
- 💬 **In-game Chat**
- 📊 **User Statistics & Leaderboards**
- 🗄️ **MongoDB Database** for game history
- 🔄 **Game Restart & Draw Offers**

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/baatein-games
   PORT=4000
   NODE_ENV=development
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Server Endpoints

#### Health Check
- `GET /` - Server status and info

#### Game Routes (`/api/games`)
- `POST /tic-tac-toe/create` - Create new game room
- `POST /tic-tac-toe/join` - Join existing room
- `POST /tic-tac-toe/move` - Make a move
- `POST /tic-tac-toe/restart` - Restart game
- `GET /room/:roomId` - Get room details
- `GET /history/:userId` - Get user game history
- `GET /stats/:userId` - Get user statistics
- `GET /top-players` - Get leaderboard

#### Room Routes (`/api/rooms`)
- `POST /create` - Create new room
- `POST /:roomId/join` - Join room
- `POST /:roomId/leave` - Leave room
- `GET /active` - Get active rooms
- `GET /:roomId` - Get room by ID

### Socket.IO Events

#### Client → Server
- `authenticate` - User authentication
- `createRoom` - Create game room
- `joinRoom` - Join game room
- `playerReady` - Mark player as ready
- `makeMove` - Make game move
- `chatMessage` - Send chat message
- `offerDraw` - Offer draw
- `acceptDraw` - Accept draw offer
- `resign` - Resign from game
- `restartGame` - Restart game
- `leaveRoom` - Leave room

#### Server → Client
- `authenticated` - Authentication confirmation
- `roomCreated` - Room created successfully
- `playerJoined` - Player joined room
- `playerLeft` - Player left room
- `playerReadyUpdate` - Player ready status update
- `gameStarted` - Game started
- `moveMade` - Move made by player
- `gameOver` - Game finished
- `gameRestarted` - Game restarted
- `chatMessage` - Chat message received
- `drawOffered` - Draw offer received
- `error` - Error message

## Database Models

### Game
- Stores completed game history
- Tracks moves, winner, duration
- Links to players and room

### GameRoom
- Active game rooms
- Player management
- Room settings and status

### User
- User profiles and statistics
- Tic-tac-toe specific stats
- Game history tracking

## Game Logic

### Tic Tac Toe Rules
- 3x3 grid game
- Players alternate turns (X goes first)
- Win by getting 3 in a row (horizontal, vertical, diagonal)
- Draw if all cells filled with no winner

### Room Management
- Maximum 2 players per room
- Host gets X symbol, second player gets O
- Both players must be ready to start
- Rooms auto-delete after 1 hour of inactivity

## Development

### Project Structure
```
baatein-games-backend/
├── server.js              # Main server file
├── models/                 # Database models
│   ├── Game.js
│   ├── GameRoom.js
│   └── User.js
├── controllers/           # Route controllers
│   ├── gameController.js
│   └── roomController.js
├── routes/               # API routes
│   ├── gameRoutes.js
│   └── roomRoutes.js
├── config/               # Configuration
│   └── db.js
└── package.json
```

### Testing
```bash
npm test
```

## Deployment

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)

### Production Considerations
- Use MongoDB Atlas for cloud database
- Set up proper CORS origins
- Enable HTTPS
- Use PM2 for process management
- Set up monitoring and logging

## API Examples

### Create Game Room
```javascript
POST /api/games/tic-tac-toe/create
{
  "userId": "user123",
  "username": "Player1",
  "avatar": "😀"
}
```

### Join Game Room
```javascript
POST /api/games/tic-tac-toe/join
{
  "roomId": "room_abc123",
  "userId": "user456",
  "username": "Player2",
  "avatar": "😎"
}
```

### Make Move
```javascript
POST /api/games/tic-tac-toe/move
{
  "roomId": "room_abc123",
  "userId": "user123",
  "position": 4
}
```

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Check the console logs for errors
- Verify MongoDB connection
- Ensure all required environment variables are set
- Check Socket.IO connection in browser developer tools

---

**Ready to play Tic Tac Toe! 🎮**