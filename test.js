const { Socket } = require('phoenix');
const WebSocket = require('ws');

// Parse command line arguments
const args = process.argv.slice(2);
const apiKey = args[0] || 'test_key_123';
// Phoenix Socket expects the base URL without /websocket
const endPoint = args[1] || 'wss://staging.thenvoi.com/api/v2/socket';

console.log(`Connecting to: ${endPoint}`);
console.log(`Using API key: ${apiKey}`);

// Create socket connection
const socket = new Socket(endPoint, {
  params: { api_key: apiKey },
  logger: (kind, msg, data) => {
    console.log(`${kind}: ${msg}`, data);
  },
  // Disable reconnection for now to see errors clearly
  reconnectAfterMs: (tries) => {
    return false;
  },
  // In Node.js environment, we need to provide WebSocket implementation
  transport: WebSocket
});

// Connect to the socket
socket.connect();

// Handle socket events
socket.onOpen(() => {
  console.log('Socket connected successfully!');
  // Just listening - not joining any channels or sending messages
});

socket.onError((error) => {
  console.error('Socket error:', error);
});

socket.onClose(() => {
  console.log('Socket closed');
});

// Keep the process running
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nDisconnecting...');
  socket.disconnect();
  process.exit(0);
});


console.log('Press Ctrl+C to disconnect');
