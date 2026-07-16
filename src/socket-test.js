import { io } from 'socket.io-client';

export function runSocketEchoTest() {
  console.log('Starting socket echo test...');

  const socket = io('http://localhost:4000');

  socket.on('connect', () => {
    console.log('Connected to relay server with ID:', socket.id);

    const testPayload = { msg: 'Hello from React!', timestamp: Date.now() };
    console.log('Sending ping_relay:', testPayload);
    socket.emit('ping_relay', testPayload);
  });

  socket.on('pong_relay', (data) => {
    console.log('Received pong_relay (ECHO SUCCESS):', data);

    socket.disconnect();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });
}
