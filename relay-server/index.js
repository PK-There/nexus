const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve the webrtc-test.html proof-of-concept page
app.use(express.static(path.join(__dirname, '..', 'dev-dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ---------- Connected peers registry ----------
const connectedPeers = new Map(); // socketId → { joinedAt, room }

// ---------- Room registry ----------
const rooms = new Map(); // roomCode → Set<socketId>

// ---------- Relay beacon store (in-memory bridge) ----------
const relayBeaconStore = new Map(); // beacon.id → beacon object

io.on('connection', (socket) => {
  console.log(`[Relay] Client connected: ${socket.id}`);
  connectedPeers.set(socket.id, { joinedAt: Date.now(), room: null });

  // Broadcast the updated peer list to everyone
  io.emit('peers-list', Array.from(connectedPeers.keys()));

  // ---- Phase 1: Basic echo test (preserved) ----
  socket.on('ping_relay', (data) => {
    console.log(`[Relay] Received ping_relay from ${socket.id} with data:`, data);
    socket.emit('pong_relay', data);
  });

  // ================================================================
  //  PHASE 2: Direct WebRTC Signaling (peer-to-peer by socket ID)
  // ================================================================

  socket.on('signal-offer', ({ targetId, signal }) => {
    console.log(`[Signal] Offer from ${socket.id} → ${targetId}`);
    io.to(targetId).emit('signal-offer', {
      callerId: socket.id,
      signal
    });
  });

  socket.on('signal-answer', ({ targetId, signal }) => {
    console.log(`[Signal] Answer from ${socket.id} → ${targetId}`);
    io.to(targetId).emit('signal-answer', {
      responderId: socket.id,
      signal
    });
  });

  socket.on('signal-ice-candidate', ({ targetId, candidate }) => {
    console.log(`[Signal] ICE candidate from ${socket.id} → ${targetId}`);
    io.to(targetId).emit('signal-ice-candidate', {
      fromId: socket.id,
      candidate
    });
  });

  // ================================================================
  //  PHASE 3: Room-based Signaling (4-digit room codes)
  // ================================================================

  socket.on('join-room', ({ roomCode }) => {
    if (!roomCode || roomCode.length !== 4) {
      socket.emit('room-error', { message: 'Room code must be 4 digits' });
      return;
    }

    // Leave any existing room first
    leaveCurrentRoom(socket);

    // Create room if it doesn't exist
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Set());
    }

    const room = rooms.get(roomCode);

    // Max 2 peers per room (for WebRTC 1-to-1)
    if (room.size >= 2) {
      socket.emit('room-error', { message: 'Room is full (max 2 peers)' });
      return;
    }

    // Notify existing peer that someone joined (they should initiate WebRTC)
    const existingPeers = Array.from(room);

    room.add(socket.id);
    socket.join(roomCode);

    // Update peer record
    const peerData = connectedPeers.get(socket.id);
    if (peerData) peerData.room = roomCode;

    console.log(`[Room] ${socket.id} joined room ${roomCode} (${room.size} peer(s))`);

    socket.emit('room-joined', { roomCode, peerCount: room.size });

    // Tell the existing peer to initiate WebRTC with the newcomer
    for (const existingId of existingPeers) {
      io.to(existingId).emit('room-peer-joined', { peerId: socket.id });
    }
  });

  socket.on('leave-room', ({ roomCode }) => {
    leaveCurrentRoom(socket, roomCode);
  });

  // Route signals within a room
  socket.on('room-signal', ({ roomCode, targetId, signal }) => {
    console.log(`[Room ${roomCode}] Signal from ${socket.id} → ${targetId || 'broadcast'}`);

    if (targetId) {
      // Direct to a specific peer
      io.to(targetId).emit('room-signal', { fromId: socket.id, signal });
    } else {
      // Broadcast to all others in the room
      socket.to(roomCode).emit('room-signal', { fromId: socket.id, signal });
    }
  });

  // ================================================================
  //  RELAY BRIDGE: Beacon push/pull (internet-optional mesh bridge)
  // ================================================================

  socket.on('relay-push-beacons', (beacons) => {
    if (!Array.isArray(beacons)) return;
    let added = 0;
    let updated = 0;

    for (const beacon of beacons) {
      if (!beacon.id) continue;
      const existing = relayBeaconStore.get(beacon.id);
      if (!existing) {
        relayBeaconStore.set(beacon.id, beacon);
        added++;
      } else if (beacon.timestamp > existing.timestamp) {
        relayBeaconStore.set(beacon.id, beacon);
        updated++;
      }
    }

    console.log(`[Bridge] ${socket.id} pushed beacons — ${added} added, ${updated} updated (store total: ${relayBeaconStore.size})`);
  });

  socket.on('relay-pull-beacons', () => {
    const allBeacons = Array.from(relayBeaconStore.values());
    console.log(`[Bridge] Sending ${allBeacons.length} beacon(s) to ${socket.id}`);
    socket.emit('relay-beacons', allBeacons);
  });

  // ---- Cleanup ----
  socket.on('disconnect', () => {
    console.log(`[Relay] Client disconnected: ${socket.id}`);
    leaveCurrentRoom(socket);
    connectedPeers.delete(socket.id);
    io.emit('peers-list', Array.from(connectedPeers.keys()));
  });
});

// ── Helper: remove a socket from its current room ────────────────
function leaveCurrentRoom(socket, specificRoom) {
  const peerData = connectedPeers.get(socket.id);
  const roomCode = specificRoom || peerData?.room;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (room) {
    room.delete(socket.id);
    socket.leave(roomCode);
    console.log(`[Room] ${socket.id} left room ${roomCode}`);

    if (room.size === 0) {
      rooms.delete(roomCode);
      console.log(`[Room] Room ${roomCode} destroyed (empty)`);
    }
  }

  if (peerData) peerData.room = null;
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Relay] Server is running on port ${PORT}`);
  console.log(`[Relay] Signaling (direct + room-based) ready`);
  console.log(`[Relay] Beacon bridge relay active`);
});
