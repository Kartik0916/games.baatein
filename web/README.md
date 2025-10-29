# 🎮 Baatein Games - Tic Tac Toe Web App

A simple, responsive multiplayer Tic Tac Toe game that works on all devices.

## 🚀 Quick Start

### Option 1: Deploy to Netlify, Vercel, or GitHub Pages

1. **Upload the `web/` folder** to your hosting platform
2. **That's it!** Your game is live!

### Option 2: Run Locally

Just open `web/index.html` in your browser - no server needed!

## 📂 Files Structure

```
web/
├── index.html      # Main HTML file
├── styles.css      # All styling
└── game.js         # Game logic
```

## 🔗 Backend Connection

The game connects to:
- **Backend URL**: `https://games-baatein-backend.onrender.com`
- **WebSocket**: Already configured in the code

## 🌐 Deploy to Different Platforms

### **Netlify**
1. Drag & drop the `web/` folder to [netlify.com](https://netlify.com)
2. Get your URL instantly!

### **Vercel**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in the `web/` folder
3. Done!

### **GitHub Pages**
1. Push `web/` folder to GitHub
2. Enable Pages in repository settings
3. Your game is live!

## 📱 Works on All Devices

- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ Tablets
- ✅ Flutter WebView integration
- ✅ Responsive design

## 🎯 Features

- Real-time multiplayer gameplay
- Chat functionality
- Room creation & joining
- Responsive design
- Works on all screen sizes

## 🔧 Configuration

The WebSocket URL is already configured to connect to your deployed backend:
```javascript
window.WEBSOCKET_URL = 'https://games-baatein-backend.onrender.com';
```

## 📝 Usage

1. Open the game in any browser
2. Enter your username
3. Create or join a room
4. Play Tic Tac Toe with friends!

## 🎨 Customization

Edit any file in the `web/` folder:
- `index.html` - Change UI structure
- `styles.css` - Change colors and design
- `game.js` - Modify game logic

---

**Made with ❤️ for multiplayer gaming**
