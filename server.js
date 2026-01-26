const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'localhost:3000';

// In-memory storage for rooms and messages
const rooms = new Map();

// Generate a random room ID in format xxx.xxx
function generateRoomId() {
    const part1 = crypto.randomBytes(3).toString('hex').slice(0, 4);
    const part2 = crypto.randomBytes(3).toString('hex').slice(0, 4);
    return `${part1}.${part2}`;
}

// Extract room from subdomain
function getRoomFromHost(host) {
    // Remove port if present
    const hostWithoutPort = host.split(':')[0];

    // For localhost testing, use query param or path
    if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
        return null;
    }

    // Extract subdomain (everything before the base domain)
    const baseDomainWithoutPort = BASE_DOMAIN.split(':')[0];
    if (hostWithoutPort.endsWith(baseDomainWithoutPort)) {
        const subdomain = hostWithoutPort.slice(0, -(baseDomainWithoutPort.length + 1));
        return subdomain || null;
    }

    return null;
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API to create a new room
app.post('/api/create-room', (req, res) => {
    const roomId = generateRoomId();
    rooms.set(roomId, {
        messages: [],
        users: new Set(),
        createdAt: Date.now()
    });
    res.json({
        roomId,
        url: `${roomId}.${BASE_DOMAIN}`
    });
});

// API to check if room exists
app.get('/api/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const exists = rooms.has(roomId);
    if (!exists) {
        // Auto-create room if it doesn't exist
        rooms.set(roomId, {
            messages: [],
            users: new Set(),
            createdAt: Date.now()
        });
    }
    res.json({ exists: true, roomId });
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    let currentRoom = null;
    let username = null;

    socket.on('join', (data) => {
        const { room, name } = data;
        currentRoom = room || 'lobby';
        username = name || `User${Math.floor(Math.random() * 1000)}`;

        // Create room if it doesn't exist
        if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, {
                messages: [],
                users: new Set(),
                createdAt: Date.now()
            });
        }

        const roomData = rooms.get(currentRoom);
        roomData.users.add(username);

        socket.join(currentRoom);

        // Send recent messages to the user
        socket.emit('history', roomData.messages.slice(-50));

        // Notify room of new user
        io.to(currentRoom).emit('userJoined', {
            username,
            userCount: roomData.users.size
        });

        console.log(`${username} joined room: ${currentRoom}`);
    });

    socket.on('message', (data) => {
        if (!currentRoom || !username) return;

        const message = {
            id: crypto.randomBytes(8).toString('hex'),
            username,
            text: data.text,
            timestamp: Date.now()
        };

        const roomData = rooms.get(currentRoom);
        if (roomData) {
            roomData.messages.push(message);
            // Keep only last 100 messages per room
            if (roomData.messages.length > 100) {
                roomData.messages.shift();
            }
        }

        io.to(currentRoom).emit('message', message);
    });

    socket.on('disconnect', () => {
        if (currentRoom && username) {
            const roomData = rooms.get(currentRoom);
            if (roomData) {
                roomData.users.delete(username);
                io.to(currentRoom).emit('userLeft', {
                    username,
                    userCount: roomData.users.size
                });
            }
            console.log(`${username} left room: ${currentRoom}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Chat server running on http://localhost:${PORT}`);
    console.log(`Set BASE_DOMAIN environment variable for production subdomain support`);
});
