require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');
const { authMiddleware, subscriptionMiddleware, usageLimitMiddleware } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP' }
});

app.use(limiter);
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*'
}));
app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);

// Serve static files
app.use('/dashboard', express.static('dashboard'));
app.use('/examples', express.static('examples'));

const rooms = new Map();
const users = new Map();

app.get('/', (req, res) => {
  res.json({
    message: 'Multimedia API Server with Stripe Billing',
    version: '2.0.0',
    endpoints: {
      'POST /api/auth/register': 'Register new account',
      'POST /api/auth/login': 'Login to account',
      'GET /api/auth/profile': 'Get user profile',
      'GET /api/auth/plans': 'List subscription plans',
      'POST /api/billing/create-subscription': 'Create subscription',
      'GET /api/billing/subscriptions': 'List user subscriptions',
      'POST /api/billing/cancel-subscription': 'Cancel subscription',
      'GET /api/billing/usage': 'Get usage statistics',
      'GET /rooms': 'List all active rooms (requires auth)',
      'POST /rooms': 'Create a new room (requires auth)',
      'GET /rooms/:id': 'Get room details (requires auth)',
      'DELETE /rooms/:id': 'Delete a room (requires auth)'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

app.get('/rooms', authMiddleware, subscriptionMiddleware, (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    created: room.created
  }));
  res.json(roomList);
});

app.post('/rooms', authMiddleware, subscriptionMiddleware, usageLimitMiddleware('rooms'), (req, res) => {
  const user = req.user;
  user.usage.currentMonthRooms += 1;
  const { name, maxUsers = 10 } = req.body;
  const roomId = uuidv4();
  
  const room = {
    id: roomId,
    name: name || `Room ${roomId.substring(0, 8)}`,
    users: new Map(),
    maxUsers,
    created: new Date()
  };
  
  rooms.set(roomId, room);
  res.json(room);
});

app.get('/rooms/:id', authMiddleware, subscriptionMiddleware, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    ...room,
    users: Array.from(room.users.values())
  });
});

app.delete('/rooms/:id', authMiddleware, subscriptionMiddleware, (req, res) => {
  const roomId = req.params.id;
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const room = rooms.get(roomId);
  room.users.forEach(user => {
    if (user.socketId) {
      io.to(user.socketId).emit('room-deleted');
    }
  });
  
  rooms.delete(roomId);
  res.json({ message: 'Room deleted successfully' });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (data) => {
    const { roomId, userName, mediaType } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.users.size >= room.maxUsers) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    const user = {
      id: socket.id,
      socketId: socket.id,
      name: userName,
      mediaType: mediaType || 'video',
      joinedAt: new Date()
    };
    
    room.users.set(socket.id, user);
    users.set(socket.id, { ...user, roomId });
    
    socket.join(roomId);
    
    socket.emit('joined-room', {
      roomId,
      user,
      existingUsers: Array.from(room.users.values()).filter(u => u.id !== socket.id)
    });
    
    socket.to(roomId).emit('user-joined', user);
  });
  
  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id
    });
  });
  
  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id
    });
  });
  
  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });
  
  socket.on('toggle-media', (data) => {
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomId);
      if (room) {
        const roomUser = room.users.get(socket.id);
        if (roomUser) {
          roomUser.mediaEnabled = data.mediaEnabled;
          socket.to(user.roomId).emit('user-media-toggled', {
            userId: socket.id,
            mediaEnabled: data.mediaEnabled,
            mediaType: data.mediaType
          });
        }
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(user.roomId).emit('user-left', { userId: socket.id });
        
        if (room.users.size === 0) {
          rooms.delete(user.roomId);
        }
      }
      users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Multimedia API Server running on port ${PORT}`);
});