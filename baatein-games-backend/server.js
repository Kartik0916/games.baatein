// server.js - Main backend server file
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Import Routes
const gameRoutes = require('./routes/gameRoutes');
const roomRoutes = require('./routes/roomRoutes');
const userRoutes = require('./routes/userRoutes');

// Import Socket Handler
const GameSocketHandler = require('./socket/gameSocket');

// API Routes
app.use('/api/games', gameRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

// Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Baatein Games Server Running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount
  });
});

// Initialize Socket Handler
const gameSocketHandler = new GameSocketHandler(io);


// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  🎮 Baatein Games Server Running      ║
  ║  📡 Port: ${PORT}                        ║
  ║  🌐 Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║  ⏰ Started: ${new Date().toLocaleString()}    ║
  ╚════════════════════════════════════════╝
  `);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    mongoose.connection.close();
    console.log('Server closed');
    process.exit(0);
  });
});