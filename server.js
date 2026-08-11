const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const JWT_SECRET = 'your-secret-key-change-in-production';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer configuration for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// In-memory user storage (ในการใช้งานจริงควรใช้ Database)
const users = [];

// In-memory matching queue (grouped by country)
const matchingQueue = {
  all: [],
  TH: [],
  US: [],
  GB: [],
  JP: [],
  KR: [],
  CN: [],
  VN: [],
  ID: [],
  MY: [],
  SG: [],
  PH: [],
  IN: [],
  BR: [],
  DE: [],
  FR: [],
  IT: [],
  ES: [],
  RU: [],
  AU: [],
  CA: []
};
const activeRooms = new Map();

// Middleware to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Socket.io middleware for JWT authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Authentication error: Invalid token'));
  }
  
  socket.userId = decoded.userId;
  socket.username = decoded.username;
  next();
});

// Upload profile picture
app.post('/api/upload-profile', upload.single('profilePicture'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const profilePictureUrl = `/uploads/${req.file.filename}`;
    res.json({ profilePictureUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Update user profile
app.put('/api/user/profile', verifyTokenMiddleware, (req, res) => {
  try {
    const { profilePicture } = req.body;
    const userId = req.userId;
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    users[userIndex].profilePicture = profilePicture;
    res.json({ profilePicture: users[userIndex].profilePicture });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify JWT token for API routes
function verifyTokenMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.userId = decoded.userId;
  req.username = decoded.username;
  next();
}

// ==================== REST API Routes ====================

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      profilePicture: null
    };
    
    users.push(newUser);
    
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, username: newUser.username, profilePicture: newUser.profilePicture });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, username: user.username, profilePicture: user.profilePicture });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Socket.io ====================

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username} (${socket.userId})`);
  
  // User joins matching queue
  socket.on('find_match', ({ country = 'all' }) => {
    console.log(`${socket.username} is looking for a match in ${country}`);

    // Check if user is already in a room
    if (socket.currentRoom) {
      socket.emit('error', 'You are already in a chat room');
      return;
    }

    // Check if user is already in any queue
    for (const countryKey in matchingQueue) {
      if (matchingQueue[countryKey].find(u => u.userId === socket.userId)) {
        socket.emit('error', 'You are already in the matching queue');
        return;
      }
    }

    // Add user to matching queue for their selected country
    const targetQueue = matchingQueue[country] || matchingQueue.all;
    targetQueue.push({
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      country
    });

    // Try to find a match in the same country
    if (targetQueue.length >= 2) {
      const user1 = targetQueue.shift();
      const user2 = targetQueue.shift();

      const roomId = `room_${Date.now()}`;

      // Create room
      activeRooms.set(roomId, { user1, user2 });

      // Join users to room
      const socket1 = io.sockets.sockets.get(user1.socketId);
      const socket2 = io.sockets.sockets.get(user2.socketId);

      if (socket1 && socket2) {
        socket1.join(roomId);
        socket2.join(roomId);
        socket1.currentRoom = roomId;
        socket2.currentRoom = roomId;

        // Notify both users
        socket1.emit('match_found', { roomId, partnerUsername: user2.username });
        socket2.emit('match_found', { roomId, partnerUsername: user1.username });

        console.log(`Matched: ${user1.username} <-> ${user2.username} (Room: ${roomId}, Country: ${country})`);
      }
    } else {
      socket.emit('waiting_for_match');
    }
  });
  
  // WebRTC Signaling: Offer
  socket.on('webrtc_offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('webrtc_offer', { offer });
  });
  
  // WebRTC Signaling: Answer
  socket.on('webrtc_answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('webrtc_answer', { answer });
  });
  
  // WebRTC Signaling: ICE Candidate
  socket.on('ice_candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice_candidate', { candidate });
  });
  
  // Text Chat
  socket.on('chat_message', ({ roomId, message }) => {
    const chatData = {
      username: socket.username,
      message,
      timestamp: new Date().toISOString()
    };
    io.to(roomId).emit('chat_message', chatData);
  });

  // Media State
  socket.on('media_state', ({ roomId, video, audio }) => {
    socket.to(roomId).emit('media_state', { video, audio });
  });
  
  // Skip/Next - Leave current room and find new match
  socket.on('skip', () => {
    if (socket.currentRoom) {
      const roomId = socket.currentRoom;
      socket.to(roomId).emit('partner_skipped');
      leaveRoom(socket);
      socket.emit('room_left');
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.username}`);

    // Remove from all matching queues
    for (const countryKey in matchingQueue) {
      const queueIndex = matchingQueue[countryKey].findIndex(u => u.userId === socket.userId);
      if (queueIndex !== -1) {
        matchingQueue[countryKey].splice(queueIndex, 1);
      }
    }

    // Leave room if in one
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('partner_disconnected');
      leaveRoom(socket);
    }
  });
});

function leaveRoom(socket) {
  if (socket.currentRoom) {
    const roomId = socket.currentRoom;
    socket.leave(roomId);
    
    // Clean up room
    const room = activeRooms.get(roomId);
    if (room) {
      activeRooms.delete(roomId);
    }
    
    socket.currentRoom = null;
    console.log(`User ${socket.username} left room: ${roomId}`);
  }
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
