# Band n8n Nodes

Custom n8n nodes for integrating with Band platform, including real-time event triggers.

## Overview

This package provides n8n nodes for connecting to Band's real-time communication platform. It includes:

- **Band AI Agent**: A full-featured AI Agent with built-in streaming to Band chats
- **Band Trigger**: A trigger node that listens to real-time events from Band chat rooms
- **Band API Credentials**: Secure credential management for Band API authentication

### Documentation

Documentation is split by audience:

- **Node usage guides**
  - [Band AI Agent Guide](docs/nodes/agent/agent_node_guide.md)
  - [Band Trigger Guide](docs/nodes/trigger/trigger_node_guide.md)
  - [Band Credentials Setup Guide](docs/nodes/band_credentials_guide.md)
- **Developer and architecture docs**
  - [Development Guide](DEVELOPMENT.md)
  - [Contributing Guide](CONTRIBUTING.md)
  - [Architecture Getting Started Guide](docs/architecture/getting_started.md)
  - [Glossary](docs/glossary.md)

## Features

### Band AI Agent (AI Integration)
- **Full AI Agent functionality** - Complete replacement for n8n's built-in AI Agent
- **Real-time streaming** - Automatic streaming of tool calls, results, thoughts, and task updates to Band
- **LangChain integration** - Built-in callback handler captures all agent activity
- **Configurable streaming** - Control what gets streamed (task updates, thoughts, tool calls, tool results)
- **Modern agent support** - Works with tool-calling agents (OpenAI, Claude, Gemini, etc.) and ReAct agents
- **Flexible message history** - Choose between loading conversation history from memory or fetching from API
- **Agent collaboration tools** - Add or remove participants directly from agent workflows

### Band Trigger (Event Listening)
- **Real-time event listening** via WebSocket connections
- **Multi-room support** - Listen to single, multiple, or all chat rooms
- **Secure API key authentication**
- **Auto-subscribe** - Automatically subscribe to new rooms and unsubscribe from removed rooms
- **Regex filtering** - Powerful regex-based filtering for room titles with graceful fallback

## Installation

### For End Users

Choose the installation method based on your n8n setup:

- **n8n UI (recommended for most users)**:
  - Use n8n's community nodes installation in the app to install from npm.
  - This is available for self-hosted n8n instances.
- **Command line (self-hosted)**:
  - Install directly from npm in your n8n environment:

  ```bash
  npm install @band-ai/n8n-nodes-band
  ```

These nodes are currently not n8n-verified, so installation requires a self-hosted n8n instance (not n8n Cloud).

After installation, restart n8n and search for node names starting with `Band` in the node panel.

### For Developers

See the [Development Guide](DEVELOPMENT.md) for local setup and linking instructions.

## Usage

### Setting up Credentials

Both Band AI Agent and Band Trigger nodes require Band API credentials:

1. In your n8n workflow, add a "Band AI Agent" or "Band Trigger" node.
2. Configure Band API credentials using the [Band Credentials Setup Guide](docs/nodes/band_credentials_guide.md).

### Quick setup: Band Trigger

1. Add a **Band Trigger** node.
2. Select the room mode (single room, all rooms, or filtered rooms).
3. Select event type **Message Created**.
4. (Optional) Add message filters.

See the full trigger configuration guide: [Band Trigger Guide](docs/nodes/trigger/trigger_node_guide.md).

### Quick setup: Band AI Agent

1. Add a **Band AI Agent** node and connect it after the trigger.
2. Connect an AI model node (required), and optionally memory/tools nodes.
3. Set required fields:
   - **Chat ID**
   - **Agent Role**
   - **Message ID**, **Sender ID**, **Sender Type** (from trigger output)
4. Select message types to stream to Band.

See the complete configuration and behavior guide: [Band AI Agent Guide](docs/nodes/agent/agent_node_guide.md).

## Troubleshooting

Common issues:

1. **Connection Failed**: Verify your API key and server URL are correct
2. **No Events Triggered**: Check that the chat room ID is valid and you have access
3. **Authentication Errors**: Ensure your API key has the necessary permissions
