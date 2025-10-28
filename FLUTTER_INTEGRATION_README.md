# Baatein Games Flutter Integration

This project integrates a JavaScript-based Tic Tac Toe game into a Flutter app using WebView, with real-time multiplayer functionality via Socket.IO.

## Project Structure

```
├── pubspec.yaml                    # Flutter dependencies
├── lib/
│   ├── main.dart                   # Main Flutter app
│   └── screens/
│       ├── home_screen.dart         # Home screen with game button
│       └── game_webview_screen.dart # WebView screen for the game
├── assets/
│   └── game/
│       ├── index.html              # Game HTML file
│       ├── game.js                 # Game JavaScript with FlutterBridge
│       └── styles.css              # Game styles
└── baatein-games-backend/          # Node.js backend server
```

## Setup Instructions

### 1. Flutter Dependencies

The `pubspec.yaml` file includes:
- `webview_flutter: ^4.4.2` for WebView functionality
- Assets registration for the game files

### 2. Backend Setup

**Production URLs:**
- Frontend: https://games-baatein-frontend.vercel.app/
- Backend: https://games-baatein.vercel.app/

**For Local Development:**
1. Navigate to the backend directory:
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
   ```
   
   The server will run on `http://localhost:4000` by default.

### 3. Flutter App Setup

1. Install Flutter dependencies:
   ```bash
   flutter pub get
   ```

2. Run the Flutter app:
   ```bash
   flutter run
   ```

## Key Features

### WebView Integration
- **GameWebViewScreen**: Loads the HTML/JavaScript game in a WebView
- **FlutterBridge**: JavaScript channel for communication between game and Flutter
- **Asset Loading**: Game files loaded from Flutter assets

### Real-time Multiplayer
- **Socket.IO**: Backend uses Socket.IO for real-time communication
- **CORS Configuration**: Backend configured to accept connections from mobile clients
- **Room Management**: Players can create/join game rooms

### Game Flow
1. User taps "Start 2-Player Game" on home screen
2. WebView loads the game from assets
3. Game connects to backend via Socket.IO
4. Players can create/join rooms and play
5. When game ends, JavaScript sends result to Flutter via FlutterBridge
6. Flutter receives result and navigates back to home screen

## JavaScript-Flutter Communication

The game JavaScript sends messages to Flutter using:
```javascript
if (window.FlutterBridge) {
    window.FlutterBridge.postMessage('gameOver:' + score);
}
```

Flutter receives these messages in the `GameWebViewScreen`:
```dart
..addJavaScriptChannel(
  'FlutterBridge',
  onMessageReceived: (JavaScriptMessage message) {
    _handleJavaScriptMessage(message.message);
  },
)
```

## Backend CORS Configuration

The backend is configured to accept connections from:
- Local development servers (localhost:3000, localhost:5000)
- Mobile WebView clients
- Any origin (*) for development

## Testing

1. Start the backend server
2. Run the Flutter app
3. Tap "Start 2-Player Game"
4. Create a room or join an existing one
5. Play the game
6. Verify that the result is passed back to Flutter when the game ends

## Troubleshooting

- Ensure the backend server is running before starting the Flutter app
- Check that all assets are properly registered in `pubspec.yaml`
- Verify CORS settings if connection issues occur
- Check Flutter console for WebView loading errors
