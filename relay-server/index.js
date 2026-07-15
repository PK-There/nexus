const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Relay] Client connected: ${socket.id}`);

  // Basic echo test
  socket.on('ping_relay', (data) => {
    console.log(`[Relay] Received ping_relay from ${socket.id} with data:`, data);
    socket.emit('pong_relay', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Relay] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Relay] Server is running on port ${PORT}`);
});
