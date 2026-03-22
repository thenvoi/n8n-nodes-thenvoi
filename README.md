# Thenvoi n8n Nodes

Custom n8n nodes for integrating with Thenvoi platform, including real-time event triggers.

## Overview

This package provides n8n nodes for connecting to Thenvoi's real-time communication platform. It includes:

- **Thenvoi AI Agent**: A full-featured AI Agent with built-in streaming to Thenvoi chats
- **Thenvoi Trigger**: A trigger node that listens to real-time events from Thenvoi chat rooms
- **Thenvoi API Credentials**: Secure credential management for Thenvoi API authentication

### Documentation

Documentation is split by audience:

- **Node usage guides**
  - [Thenvoi AI Agent Guide](docs/nodes/agent/agent_node_guide.md)
  - [Thenvoi Trigger Guide](docs/nodes/trigger/trigger_node_guide.md)
  - [Thenvoi Credentials Setup Guide](docs/nodes/thenvoi_credentials_guide.md)
- **Developer and architecture docs**
  - [Development Guide](DEVELOPMENT.md)
  - [Contributing Guide](CONTRIBUTING.md)
  - [Architecture Getting Started Guide](docs/architecture/getting_started.md)
  - [Glossary](docs/glossary.md)

## Features

### Thenvoi AI Agent (AI Integration)
- **Full AI Agent functionality** - Complete replacement for n8n's built-in AI Agent
- **Real-time streaming** - Automatic streaming of tool calls, results, thoughts, and task updates to Thenvoi
- **LangChain integration** - Built-in callback handler captures all agent activity
- **Configurable streaming** - Control what gets streamed (task updates, thoughts, tool calls, tool results)
- **Modern agent support** - Works with tool-calling agents (OpenAI, Claude, Gemini, etc.) and ReAct agents
- **Flexible message history** - Choose between loading conversation history from memory or fetching from API
- **Agent collaboration tools** - Add or remove participants directly from agent workflows

### Thenvoi Trigger (Event Listening)
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
  npm install @thenvoi/n8n-nodes-thenvoi
  ```

These nodes are currently not n8n-verified, so installation requires a self-hosted n8n instance (not n8n Cloud).

After installation, restart n8n and search for node names starting with `Thenvoi` in the node panel.

### For Developers

See the [Development Guide](DEVELOPMENT.md) for local setup and linking instructions.

## Usage

### Setting up Credentials

Both Thenvoi AI Agent and Thenvoi Trigger nodes require Thenvoi API credentials:

1. In your n8n workflow, add a "Thenvoi AI Agent" or "Thenvoi Trigger" node.
2. Configure Thenvoi API credentials using the [Thenvoi Credentials Setup Guide](docs/nodes/thenvoi_credentials_guide.md).

### Quick setup: Thenvoi Trigger

1. Add a **Thenvoi Trigger** node.
2. Select the room mode (single room, all rooms, or filtered rooms).
3. Select event type **Message Created**.
4. (Optional) Add message filters.

See the full trigger configuration guide: [Thenvoi Trigger Guide](docs/nodes/trigger/trigger_node_guide.md).

### Quick setup: Thenvoi AI Agent

1. Add a **Thenvoi AI Agent** node and connect it after the trigger.
2. Connect an AI model node (required), and optionally memory/tools nodes.
3. Set required fields:
   - **Chat ID**
   - **Agent Role**
   - **Message ID**, **Sender ID**, **Sender Type** (from trigger output)
4. Select message types to stream to Thenvoi.

See the complete configuration and behavior guide: [Thenvoi AI Agent Guide](docs/nodes/agent/agent_node_guide.md).

## Troubleshooting

Common issues:

1. **Connection Failed**: Verify your API key and server URL are correct
2. **No Events Triggered**: Check that the chat room ID is valid and you have access
3. **Authentication Errors**: Ensure your API key has the necessary permissions
