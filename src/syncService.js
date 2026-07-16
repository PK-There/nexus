

import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { db } from './db';
import { verifyBeaconSignature } from './crypto';

const RELAY_URL = '/';

let _onPeerConnected    = null;  // (peerId: string) => void
let _onPeerDisconnected = null;  // (peerId: string) => void
let _onDataReceived     = null;  // (data: any) => void
let _onRelayStatus      = null;  // (status: 'connected'|'disconnected'|'error') => void
let _onSyncLog          = null;  // (msg: string, type: string) => void
let _onSignalGenerated  = null;  // (signalJSON: string) => void  — for offline mode
let _onRoomJoined       = null;  // (roomCode: string) => void
let _onRoomError        = null;  // (error: string) => void

let socket  = null;
let peer    = null;
let peerConnected = false;
let currentRoom   = null;
let relayConnected = false;

let relaySyncInterval = null;

function log(msg, type = 'info') {
  console.log(`[SyncService] ${msg}`);
  _onSyncLog?.(msg, type);
}

function connectRelay() {
  if (socket?.connected) {
    log('Already connected to relay');
    return;
  }

  socket = io(RELAY_URL, {
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 8000,
  });

  socket.on('connect', () => {
    relayConnected = true;
    log(`Connected to relay — ID: ${socket.id}`, 'success');
    _onRelayStatus?.('connected');

    startRelayBridge();
  });

  socket.on('disconnect', () => {
    relayConnected = false;
    log('Disconnected from relay');
    _onRelayStatus?.('disconnected');
    stopRelayBridge();
  });

  socket.on('connect_error', (err) => {
    relayConnected = false;
    log(`Relay connection error: ${err.message}`, 'error');
    _onRelayStatus?.('error');
  });

  socket.on('room-joined', ({ roomCode, peerCount }) => {
    currentRoom = roomCode;
    log(`Joined room ${roomCode} (${peerCount} peer(s))`, 'success');
    _onRoomJoined?.(roomCode);
  });

  socket.on('room-error', ({ message }) => {
    log(`Room error: ${message}`, 'error');
    _onRoomError?.(message);
  });

  socket.on('room-peer-joined', ({ peerId }) => {
    log(`Peer ${peerId} joined room — initiating WebRTC…`);
    createPeerConnection(true, peerId);
  });

  socket.on('room-signal', ({ fromId, signal }) => {
    log(`Signal from ${fromId}`, 'in');
    if (!peer) {

      createPeerConnection(false, fromId);
    }
    peer.signal(signal);
  });

  socket.on('relay-beacons', async (beacons) => {
    log(`Received ${beacons.length} beacon(s) from relay bridge`, 'in');
    await mergeIncomingBeacons(beacons, true); // true = fromRelay
  });
}

function disconnectRelay() {
  stopRelayBridge();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  relayConnected = false;
}

function getSocketId() {
  return socket?.id || null;
}

function createRoom(roomCode) {
  if (!socket?.connected) {
    _onRoomError?.('Not connected to relay server');
    return;
  }
  log(`Creating/joining room: ${roomCode}`);
  socket.emit('join-room', { roomCode });
}

function joinRoom(roomCode) {
  createRoom(roomCode); // Same endpoint — server handles both
}

function leaveRoom() {
  if (socket?.connected && currentRoom) {
    socket.emit('leave-room', { roomCode: currentRoom });
  }
  currentRoom = null;
}

function createPeerConnection(initiator, targetId) {
  if (peer) {
    peer.destroy();
    peer = null;
    peerConnected = false;
  }

  peer = new SimplePeer({
    initiator,
    trickle: true,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    },
  });

  peer.on('signal', (signal) => {
    if (socket?.connected && currentRoom) {

      socket.emit('room-signal', { roomCode: currentRoom, targetId, signal });
    } else {

      const signalStr = JSON.stringify(signal);
      log(`Signal generated (${signal.type || 'candidate'})`, 'out');
      _onSignalGenerated?.(signalStr);
    }
  });

  peer.on('connect', () => {
    peerConnected = true;
    log('✅ P2P data channel OPEN!', 'success');
    _onPeerConnected?.(targetId || 'manual-peer');
  });

  peer.on('data', (rawData) => {
    try {
      const msg = typeof rawData === 'string' ? rawData : new TextDecoder().decode(rawData);
      const parsed = JSON.parse(msg);
      log(`Data received (${parsed.type || 'unknown'})`, 'in');
      handleIncomingData(parsed);
    } catch {
      log(`Raw data received: ${rawData}`, 'in');
      _onDataReceived?.({ type: 'raw', payload: rawData });
    }
  });

  peer.on('error', (err) => {
    log(`Peer error: ${err.message}`, 'error');
  });

  peer.on('close', () => {
    peerConnected = false;
    log('P2P connection closed');
    _onPeerDisconnected?.(targetId || 'manual-peer');
  });
}

function createOfflineOffer() {
  log('Creating offline offer…');
  createPeerConnection(true, null);

}

function acceptOfflineOffer(offerJSON) {
  log('Accepting offline offer…');
  createPeerConnection(false, null);
  try {
    const signal = JSON.parse(offerJSON);
    peer.signal(signal);
  } catch (err) {
    log(`Invalid offer JSON: ${err.message}`, 'error');
  }
}

function acceptOfflineAnswer(answerJSON) {
  if (!peer) {
    log('No peer — create an offer first', 'error');
    return;
  }
  try {
    const signal = JSON.parse(answerJSON);
    peer.signal(signal);
  } catch (err) {
    log(`Invalid answer JSON: ${err.message}`, 'error');
  }
}

function sendData(data) {
  if (!peer || !peerConnected) {
    log('No P2P connection — cannot send', 'error');
    return false;
  }
  const payload = JSON.stringify(data);
  peer.send(payload);
  log(`Sent ${data.type || 'data'} (${payload.length} bytes)`, 'out');
  return true;
}

async function requestBeaconSync() {
  const beacons = await db.beacons.toArray();
  const edges = await db.trustEdges.toArray();

  const manifest = beacons.map((b) => ({
    id: b.id,
    timestamp: b.timestamp,
  }));

  const edgeManifest = edges.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
  }));

  sendData({
    type: 'sync-request',
    manifest,
    edgeManifest,
  });
  log(`Sent sync request (${manifest.length} beacons, ${edgeManifest.length} edges)`);
}

async function handleIncomingData(data) {
  switch (data.type) {
    case 'sync-request': {

      const ourBeacons = await db.beacons.toArray();
      const theirBeaconIds = new Set(data.manifest.map((m) => m.id));
      const missingBeacons = ourBeacons.filter((b) => !theirBeaconIds.has(b.id));

      const ourEdges = await db.trustEdges.toArray();
      const theirEdgeIds = new Set(data.edgeManifest.map((m) => m.id));
      const missingEdges = ourEdges.filter((e) => !theirEdgeIds.has(e.id));

      sendData({
        type: 'sync-response',
        beacons: missingBeacons,
        edges: missingEdges,
      });
      log(`Responded with ${missingBeacons.length} beacons & ${missingEdges.length} edges`, 'out');

      const ourBeaconIds = new Set(ourBeacons.map((b) => b.id));
      const weNeedBeacons = data.manifest.filter((m) => !ourBeaconIds.has(m.id));

      const ourEdgeIds = new Set(ourEdges.map((e) => e.id));
      const weNeedEdges = data.edgeManifest.filter((m) => !ourEdgeIds.has(m.id));

      if (weNeedBeacons.length > 0 || weNeedEdges.length > 0) {
        sendData({ 
          type: 'sync-pull', 
          beaconIds: weNeedBeacons.map((m) => m.id),
          edgeIds: weNeedEdges.map((m) => m.id)
        });
        log(`Requested ${weNeedBeacons.length} beacons & ${weNeedEdges.length} edges from peer`, 'out');
      }
      break;
    }

    case 'sync-response': {
      await mergeIncomingBeacons(data.beacons);
      await mergeIncomingEdges(data.edges);
      break;
    }

    case 'sync-pull': {
      const requestedBeacons = await db.beacons.where('id').anyOf(data.beaconIds || []).toArray();
      const requestedEdges = await db.trustEdges.where('id').anyOf(data.edgeIds || []).toArray();

      sendData({
        type: 'sync-response',
        beacons: requestedBeacons,
        edges: requestedEdges,
      });
      log(`Sent ${requestedBeacons.length} beacons & ${requestedEdges.length} edges`, 'out');
      break;
    }

    default:
      _onDataReceived?.(data);
  }
}

async function mergeIncomingBeacons(beacons, fromRelay = false) {
  if (!beacons || beacons.length === 0) return;

  let added = 0;
  let updated = 0;
  let rejected = 0;

  const skipVerification = fromRelay || !(window.crypto?.subtle);

  for (const beacon of beacons) {
    if (!skipVerification) {
      const isValid = await verifyBeaconSignature(beacon);
      if (!isValid) {
        log(`Rejected beacon ${beacon.id} due to invalid signature`, 'error');
        rejected++;
        continue;
      }
    }

    const existing = typeof beacon.id === 'string'
      ? await db.beacons.where('id').equals(beacon.id).first()
      : await db.beacons.get(beacon.id);

    if (!existing) {
      await db.beacons.put(beacon);
      added++;
    } else if (beacon.timestamp > existing.timestamp) {
      await db.beacons.put(beacon);
      updated++;
    }
  }

  log(`Merged: ${added} added, ${updated} updated${rejected > 0 ? `, ${rejected} rejected` : ''}`, 'success');
}

import { verifyTrustEdgeSignature } from './crypto';

async function mergeIncomingEdges(edges, fromRelay = false) {
  if (!edges || edges.length === 0) return;

  let added = 0;
  let rejected = 0;

  const skipVerification = fromRelay || !(window.crypto?.subtle);

  for (const edge of edges) {
    if (!skipVerification) {
      const isValid = await verifyTrustEdgeSignature(edge);
      if (!isValid) {
        log(`Rejected edge ${edge.id} due to invalid signature`, 'error');
        rejected++;
        continue;
      }
    }

    const existing = await db.trustEdges.get(edge.id);
    if (!existing) {
      await db.trustEdges.put(edge);
      added++;
    }
  }

  log(`Merged Edges: ${added} added, ${rejected} rejected`, 'success');
}

function startRelayBridge() {
  if (relaySyncInterval) return;

  pushBeaconsToRelay();
  pullBeaconsFromRelay();

  relaySyncInterval = setInterval(() => {
    pushBeaconsToRelay();
    pullBeaconsFromRelay();
  }, 30_000);

  log('Relay bridge started (30s interval)');
}

function stopRelayBridge() {
  if (relaySyncInterval) {
    clearInterval(relaySyncInterval);
    relaySyncInterval = null;
    log('Relay bridge stopped');
  }
}

async function pushBeaconsToRelay() {
  if (!socket?.connected) return;
  const beacons = await db.beacons.toArray();
  if (beacons.length === 0) return;
  socket.emit('relay-push-beacons', beacons);
  log(`Pushed ${beacons.length} beacon(s) to relay`, 'out');
}

function pullBeaconsFromRelay() {
  if (!socket?.connected) return;
  socket.emit('relay-pull-beacons');
  log('Requested beacons from relay', 'out');
}

function destroyPeer() {
  if (peer) {
    peer.destroy();
    peer = null;
    peerConnected = false;
  }
}

function destroy() {
  destroyPeer();
  disconnectRelay();
}

export const syncService = {

  connectRelay,
  disconnectRelay,
  getSocketId,
  get isRelayConnected() { return relayConnected; },
  get isPeerConnected() { return peerConnected; },

  createRoom,
  joinRoom,
  leaveRoom,

  createOfflineOffer,
  acceptOfflineOffer,
  acceptOfflineAnswer,

  sendData,
  requestBeaconSync,

  destroyPeer,
  destroy,

  pushAndPullRelay: () => { pushBeaconsToRelay(); pullBeaconsFromRelay(); },

  set onPeerConnected(fn)    { _onPeerConnected = fn; },
  set onPeerDisconnected(fn) { _onPeerDisconnected = fn; },
  set onDataReceived(fn)     { _onDataReceived = fn; },
  set onRelayStatus(fn)      { _onRelayStatus = fn; },
  set onSyncLog(fn)          { _onSyncLog = fn; },
  set onSignalGenerated(fn)  { _onSignalGenerated = fn; },
  set onRoomJoined(fn)       { _onRoomJoined = fn; },
  set onRoomError(fn)        { _onRoomError = fn; },
};
