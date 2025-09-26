![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Thenvoi n8n Nodes

Custom n8n nodes for integrating with Thenvoi platform, including real-time event triggers.

## Overview

This package provides n8n nodes for connecting to Thenvoi's real-time communication platform. It includes:

- **Thenvoi Trigger**: A trigger node that listens to real-time events from Thenvoi chat rooms
- **Thenvoi API Credentials**: Secure credential management for Thenvoi API authentication

## Features

- Real-time event listening via WebSocket connections
- Configurable event filtering
- Secure API key authentication
- Extensible event handler system
- TypeScript support with full type definitions

## Usage

### Setting up Credentials

1. In your n8n workflow, add a "Thenvoi Trigger" node
2. Configure the Thenvoi API credentials:
   - **API Key**: Your Thenvoi API key
   - **Server URL**: The WebSocket URL of your Thenvoi server (default: `wss://staging.thenvoi.com/api/v2/socket`)

### Using the Thenvoi Trigger

The Thenvoi Trigger node allows you to listen to real-time events from Thenvoi chat rooms:

1. **Event Type**: Select the type of event you want to listen for (currently supports "Message Created")
2. **Chat Room ID**: Specify the ID of the chat room you want to monitor
3. **Additional Filters**: Configure event-specific parameters for filtering

### Supported Events

- **Message Created**: Triggers when a new message is posted in the specified chat room
  - Additional filters available for message content, user mentions, etc.

### Example Workflow

1. Add a "Thenvoi Trigger" node to your workflow
2. Configure it to listen for "Message Created" events in a specific chat room
3. Connect it to other n8n nodes to process the incoming messages
4. Set up actions like sending notifications, updating databases, or triggering other automations

---

# Development

## Prerequisites

You need the following installed on your development machine:

* [git](https://git-scm.com/downloads)
* Node.js and npm. Minimum version Node 20. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
* Install n8n with:
  ```
  npm install n8n -g
  ```
* Recommended: follow n8n's guide to [set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/thenvoi/thenvoi-n8n-nodes.git
   cd thenvoi-n8n-nodes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link the project:
   ```bash
   npm link
   ```

## Connecting to local n8n instance

### First time setup

1. Create `custom` folder in n8n data directory:
   ```bash
   mkdir -p ~/.n8n/custom
   ```

2. Navigate to the `nodes` directory:
   ```bash
   cd ~/.n8n/nodes
   ```

3. Link the thenvoi-n8n-nodes project to your n8n instance:
   ```bash
   n8n link thenvoi-n8n-nodes
   ```

   **Note**: Once linked, the project will automatically update when you make changes. You don't need to run the link command again.

### Running the n8n instance

1. Run the n8n instance:
   ```bash
   n8n start
   ```

	 Or, use the hot reload mode to automatically apply changes from the project to your n8n instance:
	 ```bash
	 N8N_DEV_RELOAD=true n8n start
	 ```

2. Open the n8n web interface at `http://localhost:5678`

### Running the project

1. Run the project:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run build` - Compile TypeScript and build the project
- `npm run dev` - Watch mode for development
- `npm run lint` - Check for linting errors
- `npm run lintfix` - Automatically fix linting errors
- `npm run format` - Format code with Prettier

## Project Structure

```
├── nodes/
│   └── ThenvoiTrigger/          # Main trigger node
│       ├── config/             # Node configuration
│       ├── handlers/           # Event handlers
│       ├── utils/              # Utility functions
│       └── types/               # TypeScript type definitions
├── credentials/
│   └── ThenvoiApi.credentials.ts # API credential configuration
└── dist/                       # Compiled output
```

## Adding New Event Types

To add support for new event types:

1. Create a new handler in `nodes/ThenvoiTrigger/handlers/`
2. Implement the `IEventHandler` interface
3. Register the handler `config/nodeConfig.ts`

## Configuration

- No additional environment variables are required. All configuration is done through the n8n interface.
- Requires valid Thenvoi API key.
- WebSocket connection capability is required.

## Troubleshooting

Common issues:
1. **Connection Failed**: Verify your API key and server URL are correct
2. **No Events Triggered**: Check that the chat room ID is valid and you have access
3. **Authentication Errors**: Ensure your API key has the necessary permissions

## Important: Package Naming Requirements

**⚠️ Critical**: n8n custom node packages must follow a specific naming convention to work properly. The package name in `package.json` must follow the template `n8n-nodes-X` where `X` is your service or company name.

### Common Issues

If your custom node package doesn't work or isn't recognized by n8n, check:

1. **Package Name**: Ensure your `package.json` has the correct name format:
   ```json
   {
     "name": "n8n-nodes-your-service-name"
   }
   ```

2. **Keywords**: Include the required keyword:
   ```json
   {
     "keywords": ["n8n-community-node-package"]
   }
   ```

3. **n8n Configuration**: Make sure your `package.json` includes the proper n8n configuration:
   ```json
   {
     "n8n": {
       "n8nNodesApiVersion": 1,
       "credentials": ["dist/credentials/YourCredentials.credentials.js"],
       "nodes": ["dist/nodes/YourNode/YourNode.node.js"]
     }
   }
   ```

### Why This Matters

n8n uses the package name to identify and load custom nodes. Without the correct naming convention, n8n won't recognize your package as a valid node package, and your nodes won't appear in the n8n interface.

If you encounter issues with your custom nodes not appearing in n8n, the package naming is often the first thing to check.
