# Baatein Games Frontend

A modern, responsive frontend for the Baatein Games Tic Tac Toe multiplayer game.

## Features

- 🎮 **Real-time Multiplayer Tic Tac Toe**
- 🏠 **Room Creation & Joining**
- 💬 **In-game Chat**
- 📱 **Responsive Design**
- 🎨 **Modern UI/UX**
- ⚡ **Socket.IO Real-time Communication**
- 🔄 **Game Restart & Draw Offers**
- 👤 **User Authentication & Avatars**

## Getting Started

### Prerequisites

- A modern web browser
- Node.js (optional, for development server)
- Python (for simple HTTP server)

### Installation

1. **Clone or download the frontend files**
   ```bash
   # If you have the files locally, navigate to the frontend directory
   cd frontend
   ```

2. **Install dependencies (optional)**
   ```bash
   npm install
   ```

### Running the Frontend

#### Option 1: Simple HTTP Server (Python)
```bash
# Navigate to the frontend directory
cd frontend

# Start a simple HTTP server
python -m http.server 3000

# Or for Python 2
python -m SimpleHTTPServer 3000
```

#### Option 2: Using Node.js serve
```bash
# Install serve globally
npm install -g serve

# Navigate to frontend directory and serve
cd frontend
serve -s . -l 3000
```

#### Option 3: Using npm scripts
```bash
cd frontend
npm start
```

### Access the Game

Open your browser and navigate to:
- `http://localhost:3000` (if using port 3000)
- Or whatever port your server is running on

## Backend Connection

The frontend is configured to connect to your backend server at `http://localhost:4000`. 

**Important:** Make sure your backend server is running before starting the frontend!

### Backend Setup
1. Navigate to your backend directory:
   ```bash
   cd baatein-games-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## How to Play

### 1. **Login**
- Enter your username
- Choose an avatar
- Click "Start Playing"

### 2. **Create or Join a Room**
- **Create Room**: Click "Create Room" to create a new game room
- **Join Room**: Click "Join Room" and enter a room code

### 3. **Wait for Players**
- Share your room code with friends
- Wait for another player to join
- Both players must click "Ready to Play"

### 4. **Play the Game**
- Take turns clicking on the 3x3 grid
- Player 1 uses X, Player 2 uses O
- First to get 3 in a row wins!

### 5. **Game Features**
- **Chat**: Communicate with your opponent
- **Draw Offer**: Offer a draw if the game is tied
- **Resign**: Give up if you're losing
- **Play Again**: Start a new game after finishing

## File Structure

```
frontend/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── app.js             # JavaScript application logic
├── package.json       # Node.js dependencies
└── README.md          # This file
```

## Technical Details

### Technologies Used
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with Flexbox/Grid
- **JavaScript (ES6+)**: Modern JavaScript features
- **Socket.IO Client**: Real-time communication
- **Font Awesome**: Icons
- **Google Fonts**: Typography

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Responsive Design
- Mobile-first approach
- Breakpoints: 768px, 480px
- Touch-friendly interface

## Customization

### Changing Server URL
Edit `app.js` and modify the Socket.IO connection:
```javascript
this.socket = io('http://your-server-url:port', {
    transports: ['websocket', 'polling']
});
```

### Styling
- Modify `styles.css` to change colors, fonts, or layout
- CSS variables are used for easy theming
- Responsive breakpoints can be adjusted

### Game Logic
- Game logic is handled by the backend
- Frontend only handles UI updates and user interactions
- Socket events are defined in `app.js`

## Troubleshooting

### Common Issues

1. **"Failed to connect to server"**
   - Make sure your backend server is running
   - Check the server URL in `app.js`
   - Verify CORS settings on the backend

2. **"Room not found"**
   - Double-check the room code
   - Make sure the room hasn't expired
   - Try creating a new room

3. **Game not starting**
   - Ensure both players are ready
   - Check browser console for errors
   - Verify Socket.IO connection

4. **Styling issues**
   - Clear browser cache
   - Check CSS file is loading
   - Verify Font Awesome and Google Fonts are accessible

### Debug Mode
Open browser developer tools (F12) to see:
- Console logs for debugging
- Network requests
- Socket.IO connection status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Check the troubleshooting section
- Review browser console for errors
- Ensure backend server is running properly

---

**Enjoy playing Tic Tac Toe! 🎮**
