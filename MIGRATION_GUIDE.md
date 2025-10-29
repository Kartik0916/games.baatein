# Migration Guide: Vercel to Render for WebSocket Support

This guide will help you migrate your backend from Vercel to Render to enable persistent WebSocket connections.

## Overview

- **Frontend**: Remains on Vercel (Flutter WebView app)
- **Backend**: Migrates to Render (Web Service for persistent connections)
- **WebSocket**: Now works properly with persistent connections

## Changes Made

### Backend Changes (`api/` directory)

1. **Port Configuration**: Updated `api/index.js` to use `process.env.PORT` for Render
2. **CORS Configuration**: Enhanced CORS to properly handle cross-origin requests
3. **Render Configuration**: Added `render.yaml` for easy deployment
4. **Package.json**: Updated with proper start scripts

### Frontend Changes

1. **WebSocket URL**: Made configurable via environment variable
2. **Flutter Integration**: Updated to inject WebSocket URL at runtime

## Deployment Steps

### Step 1: Deploy Backend to Render

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `api/` directory as the root directory

3. **Configure Service Settings**:
   ```
   Name: baatein-games-backend
   Environment: Node
   Plan: Free
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables**:
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   FRONTEND_URL=https://games-baatein-frontend.vercel.app
   ```

5. **Deploy**: Click "Create Web Service" and wait for deployment

6. **Note the Service URL**: Copy the URL (e.g., `https://baatein-games-backend.onrender.com`)

### Step 2: Update Frontend Configuration

1. **Update Flutter Build**:
   ```bash
   flutter build web --dart-define=WEBSOCKET_URL=https://your-backend-url.onrender.com
   ```

2. **For Development**:
   ```bash
   flutter run -d chrome --dart-define=WEBSOCKET_URL=https://your-backend-url.onrender.com
   ```

3. **Update Vercel Deployment** (if using Vercel for Flutter web):
   - In Vercel dashboard, add environment variable:
   ```
   WEBSOCKET_URL=https://your-backend-url.onrender.com
   ```

### Step 3: Test the Migration

1. **Test Backend Health**: Visit `https://your-backend-url.onrender.com` - should return JSON status
2. **Test WebSocket Connection**: Open browser dev tools and check for successful WebSocket connection
3. **Test Game Functionality**: Create rooms, join games, and verify real-time features work

## Environment Variables Reference

### Backend (Render)
```
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/baatein-games  # or your MongoDB Atlas URL
FRONTEND_URL=https://games-baatein-frontend.vercel.app
```

### Frontend (Flutter/Vercel)
```
WEBSOCKET_URL=https://your-backend-url.onrender.com
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: 
   - Ensure `FRONTEND_URL` environment variable is set correctly in Render
   - Check that your Vercel frontend URL matches the CORS configuration

2. **WebSocket Connection Failed**:
   - Verify the `WEBSOCKET_URL` is correctly set in Flutter
   - Check Render service logs for any startup errors
   - Ensure the service is running (Render free tier sleeps after 15 minutes)

3. **MongoDB Connection Issues**:
   - Verify `MONGODB_URI` is correctly set
   - Ensure MongoDB Atlas allows connections from Render's IP ranges

### Render Free Tier Limitations

- **Sleep Mode**: Service sleeps after 15 minutes of inactivity
- **Cold Start**: First request after sleep may take 30+ seconds
- **Solution**: Consider upgrading to paid plan for production use

## Code Changes Summary

### Backend (`api/index.js`)
```javascript
// Port configuration for Render
const PORT = process.env.PORT || 4000;

// Enhanced CORS with environment variable support
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000", 
  "https://games-baatein-frontend.vercel.app",
  process.env.FRONTEND_URL || "https://games-baatein-frontend.vercel.app"
];

// Server startup for Render
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}
```

### Frontend (`assets/game/game.js`)
```javascript
// Configurable WebSocket URL
const wsUrl = window.WEBSOCKET_URL || 'https://games-baatein.vercel.app';
this.socket = io(wsUrl, {
  transports: ['websocket', 'polling']
});
```

### Flutter (`lib/screens/game_webview_screen.dart`)
```dart
// Inject WebSocket URL from environment
final String wsUrl = const String.fromEnvironment(
  'WEBSOCKET_URL',
  defaultValue: 'https://games-baatein.vercel.app',
);

// Inject into HTML
final String modifiedHtml = htmlContent.replaceFirst(
  '<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>',
  '''
  <script>
    window.WEBSOCKET_URL = '$wsUrl';
  </script>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  ''',
);
```

## Next Steps

1. Deploy backend to Render following Step 1
2. Update your Flutter app with the new WebSocket URL
3. Test the migration thoroughly
4. Consider upgrading to Render's paid plan for production use
5. Monitor logs and performance

The migration is now complete! Your WebSocket connections should work properly with persistent connections on Render.
