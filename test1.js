const { Socket } = require('phoenix');
const WebSocket = require('ws');

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: ./phoenix-client.js [api_key] [agent_id] [endpoint_url]');
  console.log('');
  console.log('Arguments:');
  console.log('  api_key      - API key for authentication (default: test_key_123)');
  console.log('  agent_id     - Agent UUID (default: a32fda90-ff00-479f-99be-633d66e70515)');
  console.log('  endpoint_url - WebSocket endpoint URL (default: wss://staging.thenvoi.com/api/v2/socket)');
  console.log('');
  console.log('Example:');
  console.log('  ./phoenix-client.js test_key_123 a32fda90-ff00-479f-99be-633d66e70515');
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
const apiKey = args[0] || 'test_key_123';
const agentId = args[1] || 'a32fda90-ff00-479f-99be-633d66e70515';
// Phoenix Socket expects the base URL without /websocket
const endPoint = args[2] || 'wss://staging.thenvoi.com/api/v2/socket';

console.log(`Connecting to: ${endPoint}`);
console.log(`Using API key: ${apiKey}`);
console.log(`Agent ID: ${agentId}`);

// Create socket connection
const socket = new Socket(endPoint, {
  params: {
    api_key: apiKey,
    agent_id: agentId
  },
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

// Track joined channels
const joinedChannels = new Map();

// Handle socket events
socket.onOpen(() => {
  console.log('✅ Socket connected successfully!');
  console.log(`📍 Socket ID: agent_socket:${agentId}`);

  // Join agent rooms channel to get notified of room membership changes
  const agentRoomsChannel = socket.channel(`agent_rooms:${agentId}`, {});

  console.log(`\n🔗 Joining agent_rooms:${agentId}...`);

  agentRoomsChannel.join()
    .receive('ok', (resp) => {
      console.log('✅ Joined agent rooms channel successfully');
      joinedChannels.set(`agent_rooms:${agentId}`, agentRoomsChannel);
    })
    .receive('error', (resp) => {
      console.error('❌ Failed to join agent rooms channel:', resp);
    })
    .receive('timeout', () => {
      console.error('⏱️  Timeout joining agent rooms channel');
    });

  // Listen for room additions
  agentRoomsChannel.on('room_added', (room) => {
    console.log('\n🏠 ROOM ADDED:', {
      id: room.id,
      title: room.title,
      type: room.type,
      status: room.status,
      role: room.participant_role,
      owner: room.owner,
      created_at: room.created_at
    });

    // Join the chat room channel
    const chatChannel = socket.channel(`chat_room:${room.id}`, {});
    console.log(`\n🔗 Joining chat_room:${room.id}...`);

    chatChannel.join()
      .receive('ok', () => {
        console.log(`✅ Joined chat room: ${room.title}`);
        joinedChannels.set(`chat_room:${room.id}`, chatChannel);
      })
      .receive('error', (resp) => {
        console.error(`❌ Failed to join chat room ${room.title}:`, resp);
      });

    // Set up message handlers for this room
    chatChannel.on('message_created', (message) => {
      console.log(`\n💬 NEW MESSAGE in ${room.title}:`, {
        id: message.id,
        content: message.content,
        sender: message.sender,
        created_at: message.created_at
      });
    });

    chatChannel.on('message_updated', (message) => {
      console.log(`\n✏️  MESSAGE UPDATED in ${room.title}:`, {
        id: message.id,
        content: message.content,
        updated_at: message.updated_at
      });
    });

    chatChannel.on('message_deleted', (data) => {
      console.log(`\n🗑️  MESSAGE DELETED in ${room.title}:`, data);
    });

    // Join participants channel
    const participantsChannel = socket.channel(`room_participants:${room.id}`, {});
    console.log(`\n🔗 Joining room_participants:${room.id}...`);

    participantsChannel.join()
      .receive('ok', () => {
        console.log(`✅ Joined participants channel for ${room.title}`);
        joinedChannels.set(`room_participants:${room.id}`, participantsChannel);
      })
      .receive('error', (resp) => {
        console.error(`❌ Failed to join participants channel for ${room.title}:`, resp);
      });

    // Set up participant handlers
    participantsChannel.on('participant_added', (participant) => {
      console.log(`\n👤 PARTICIPANT ADDED to ${room.title}:`, {
        id: participant.id,
        type: participant.type,
        name: participant.name,
        role: participant.role,
        status: participant.status
      });
    });

    participantsChannel.on('participant_removed', (participant) => {
      console.log(`\n👋 PARTICIPANT REMOVED from ${room.title}:`, {
        id: participant.id,
        type: participant.type
      });
    });
  });

  // Listen for room removals
  agentRoomsChannel.on('room_removed', (room) => {
    console.log(`\n🚪 ROOM REMOVED: ${room.title} (${room.id})`);

    // Leave and clean up channels for this room
    const chatChannelKey = `chat_room:${room.id}`;
    const participantsChannelKey = `room_participants:${room.id}`;

    const chatChannel = joinedChannels.get(chatChannelKey);
    if (chatChannel) {
      chatChannel.leave();
      joinedChannels.delete(chatChannelKey);
      console.log(`✅ Left chat channel for ${room.title}`);
    }

    const participantsChannel = joinedChannels.get(participantsChannelKey);
    if (participantsChannel) {
      participantsChannel.leave();
      joinedChannels.delete(participantsChannelKey);
      console.log(`✅ Left participants channel for ${room.title}`);
    }
  });
});

socket.onError((error) => {
  console.error('❌ Socket error:', error);
});

socket.onClose(() => {
  console.log('🔌 Socket closed');
});

// Keep the process running
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Disconnecting...');

  // Leave all channels
  joinedChannels.forEach((channel, topic) => {
    console.log(`👋 Leaving ${topic}`);
    channel.leave();
  });

  socket.disconnect();
  process.exit(0);
});

console.log('\n📡 Agent WebSocket Listener Started');
console.log('Press Ctrl+C to disconnect\n');
