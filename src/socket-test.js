import { io } from 'socket.io-client';

export function runSocketEchoTest() {
  console.log('Starting socket echo test...');
  // Connect to the local relay server on port 4000
  const socket = io('http://localhost:4000');

  socket.on('connect', () => {
    console.log('Connected to relay server with ID:', socket.id);
    
    // Send the ping
    const testPayload = { msg: 'Hello from React!', timestamp: Date.now() };
    console.log('Sending ping_relay:', testPayload);
    socket.emit('ping_relay', testPayload);
  });

  // Listen for the pong
  socket.on('pong_relay', (data) => {
    console.log('Received pong_relay (ECHO SUCCESS):', data);
    
    // Disconnect after successful test
    socket.disconnect();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });
}
