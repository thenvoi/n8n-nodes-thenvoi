![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Thenvoi n8n Nodes

Custom n8n nodes for integrating with Thenvoi platform, including real-time event triggers.

## Overview

This package provides n8n nodes for connecting to Thenvoi's real-time communication platform. It includes:

- **Thenvoi Agent**: A full-featured AI Agent with built-in streaming to Thenvoi chats
- **Thenvoi Trigger**: A trigger node that listens to real-time events from Thenvoi chat rooms
- **Thenvoi API Credentials**: Secure credential management for Thenvoi API authentication

## Features

### Thenvoi Agent (AI Integration)
- **Full AI Agent functionality** - Complete replacement for n8n's built-in AI Agent
- **Real-time streaming** - Automatic streaming of tool calls, results, thoughts, and task updates to Thenvoi
- **LangChain integration** - Built-in callback handler captures all agent activity
- **Capability system** - Extensible architecture with priority-based lifecycle hooks (Setup, Prepare, Success/Error, Finalize)
- **Configurable streaming** - Control what gets streamed (task updates, thoughts, tool calls, tool results)
- **Modern agent support** - Works with tool-calling agents (OpenAI, Claude, Gemini, etc.) and ReAct agents
- **Memory support** - Full support for conversation memory
- **Multiple message types** - Support for task updates, thoughts, tool calls, and tool results
- **Thought modes** - Choose between synthetic (auto-generated) or model-generated reasoning
- **Agent collaboration** - Agents can dynamically add other Thenvoi agents to the chat for specialized help
- **Chat context tools** - Built-in tools for agents to fetch chat history, participants, agent info, and chat room details
- **Mention detection** - Automatic detection and processing of @mentions in agent responses
- **Phase-based execution** - Structured pipeline (Initialize Capabilities → Setup → Prepare → Execute → Success/Error → Finalize)

### Thenvoi Trigger (Event Listening)
- **Real-time event listening** via WebSocket connections
- **Multi-room support** - Listen to single, multiple, or all chat rooms
- **Secure API key authentication**
- **Extensible event handler system**
- **TypeScript support** with full type definitions
- **Auto-subscribe** - Automatically subscribe to new rooms and unsubscribe from removed rooms
- **Regex filtering** - Powerful regex-based filtering for room titles with graceful fallback
- **Room type filtering** - Filter by room types (direct, group, task)

## Usage

### Setting up Credentials

Both Thenvoi Agent and Thenvoi Trigger nodes require Thenvoi API credentials:

1. In your n8n workflow, add a "Thenvoi Agent" or "Thenvoi Trigger" node
2. Configure the Thenvoi API credentials:
   - **API Key**: Your Thenvoi API key
   - **Server URL**: The base API server URL without protocol (default: `platform.demo.thenvoi.com/api/v1`)
   - **Use HTTPS**: Whether to use HTTPS for HTTP requests (default: enabled; WebSocket always uses WSS)
   - **Agent ID**: Your agent ID for personalized operations and channel subscriptions

### Using the Thenvoi Agent

The Thenvoi Agent node enables AI agents to interact with Thenvoi chat rooms, stream their activity in real-time, and collaborate with other agents.

#### Configuration Options

1. **Chat ID** (required) - The ID of the Thenvoi chat room to stream agent activity to
2. **Message ID** (required) - The ID of the message to reply to (used for message processing status tracking)
3. **Prompt** - The system prompt that defines the agent behavior (default: "You are a helpful AI assistant.")
4. **Max Iterations** - Maximum number of iterations the agent can perform before stopping (default: 20)
5. **Message Types to Send** - Select which types of messages to stream (default: all enabled):
   - **Task Updates** - Send task status updates (in progress, completed, failed)
   - **Thoughts** - Send reasoning/thought messages during agent execution
   - **Tool Calls** - Send messages when tools are invoked
   - **Tool Results** - Send messages with tool execution results
6. **Thought Mode** (shown when "Thoughts" is enabled) - Choose how reasoning messages are generated (default: Synthetic):
   - **Synthetic** - Automatically generate reasoning messages based on agent actions (fast, consistent)
   - **Model Generated** - Let the LLM explicitly state its reasoning (natural, model-dependent)
7. **Options**:
   - **Return Intermediate Steps** - Whether to return the agent intermediate steps in the output

#### Built-in Capabilities

The agent includes three built-in capabilities that provide advanced functionality:

1. **Messaging Capability**
   - Streams all agent activity to Thenvoi chat in real-time
   - Handles task updates, thoughts, tool calls, tool results, and final responses
   - Automatically detects and processes @mentions in agent responses
   - Manages message queueing and ensures all messages are sent
   - Updates message processing status (processing, processed, failed) for tracking

2. **Agent Collaboration Capability**
   - Enables agents to discover available Thenvoi agents
   - Provides `AddAgentTool` for dynamically adding other agents to the chat
   - Augments agent prompts with information about available and current agents in the chat
   - Automatically updates participant lists when agents are added

3. **Chat Context Capability**
   - Provides tools for agents to fetch chat context on-demand:
     - **GetChatMessagesTool** - Retrieve chat message history (with memory-checking guidance)
     - **GetChatParticipantsTool** - Get list of participants (users and agents) in the chat
     - **GetAgentInfoTool** - Get information about available agents
     - **GetChatInfoTool** - Get chat room information and details
     - **SendMessageTool** - Send messages directly to the chat (for agent-initiated communication)

#### Node Connections

- **Main Input** - Input data (e.g., user message from the Thenvoi Trigger node)
- **Model** (required) - Connect an AI Language Model node (OpenAI, Anthropic, Gemini, etc.)
- **Memory** (optional) - Connect an AI Memory node for conversation memory
- **Tools** (optional) - Connect multiple AI Tool nodes for extended functionality

#### Example Workflow

1. Add a "Thenvoi Trigger" node to your workflow
2. Configure it to listen for "Message Created" events in a specific chat room
3. Add a "Thenvoi AI Agent" node to your workflow
4. Connect the output of the Thenvoi Trigger node to the input of the Thenvoi Agent node
5. Connect an AI Language Model node (e.g., OpenAI GPT-4)
6. Optionally connect Memory and Tool nodes
7. Configure the agent:
   - Set the Chat ID of the Thenvoi chat room
   - Set the Message ID of the message to reply to
   - Customize the system prompt for your use case
   - Select which message types to stream
   - Choose thought generation mode

That's it! The agent will automatically stream its activity to Thenvoi, update message processing status, and can use built-in tools to collaborate and fetch context

### Using the Thenvoi Trigger

The Thenvoi Trigger node allows you to listen to real-time events from Thenvoi chat rooms:

#### Room Mode Options

1. **Single Room** - Listen to one specific chat room
   - Configure the Chat Room ID

2. **All Rooms** - Listen to all available chat rooms
   - Enable auto-subscribe for new rooms - optional

3. **Filtered Rooms** - Listen to rooms matching a filter pattern
   - Configure regex pattern for room titles (e.g., `^support`, `team$`, `bug|issue`)
   - Filter by room types (direct, group, task) - optional
   - Enable auto-subscribe for new rooms - optional

**Regex Filter Examples:**

- `^support` - Rooms starting with "support"
- `team$` - Rooms ending with "team"
- `bug|issue` - Rooms containing "bug" OR "issue"
- `support.*team` - Rooms with "support" followed by "team"
- `customer` - Simple substring match (fallback if regex invalid)

#### Event Configuration

1. **Event Type**: Select the type of event you want to listen for (currently supports "Message Created")
2. **Additional Filters**: Configure event-specific parameters for filtering (e.g., mentioned user, case sensitivity)

### Supported Events

- **Message Created**: Triggers when a new message is posted in the specified chat room
  - Additional filters available for message content, user mentions, etc.

#### Example Workflow

1. Add a "Thenvoi Trigger" node to your workflow
2. Configure it to listen for "Message Created" events in a specific chat room
3. Connect it to other n8n nodes to process the incoming messages
4. Set up actions like sending notifications, updating databases, or triggering other automations

---

# Development

## Prerequisites

You need the following installed on your development machine:

- [git](https://git-scm.com/downloads)
- Node.js and npm. Minimum version Node 20. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
- Install n8n with:

  ```bash
  npm install n8n -g
  ```

- Recommended: follow n8n's guide to [set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

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

The project follows a clean, modular architecture with clear separation of concerns:

```plaintext
├── lib/                        # Shared library code
│   ├── api/                    # API clients for Thenvoi operations
│   ├── http/                   # HTTP client implementation
│   ├── socket/                 # WebSocket connection and channel management
│   ├── types/                  # Shared type definitions
│   └── utils/                  # Shared utility functions
├── nodes/
│   ├── ThenvoiAgent/           # AI Agent node
│   │   ├── ThenvoiAgent.node.ts    # Node entry point
│   │   └── [config, types, utils, capabilities, factories, handlers]/ # Supporting directories
│   └── ThenvoiTrigger/         # Trigger node
│       ├── ThenvoiTrigger.node.ts  # Node entry point
│       └── [config, handlers, managers, types, utils]/  # Supporting directories
├── credentials/                # API credential configuration
└── dist/                       # Compiled output (generated)
```

### Architecture Highlights

- **Shared Library (`lib/`)**: Reusable code that can be used across multiple nodes, including API clients, socket management, type definitions, and utility functions
- **Module Aliases**: Uses `@lib` and `@credentials` aliases for clean imports
- **Capability System**: Extensible architecture for ThenvoiAgent with priority-based lifecycle hooks (Setup, Prepare, Success/Error, Finalize). Capabilities execute sequentially based on priority (lower executes first)
- **Execution Pipeline**: Clear phase-based execution flow: Initialize Capabilities → Setup → Prepare → Execute → Success/Error → Finalize, with proper resource management and cleanup
- **Separation of Concerns**: Clear boundaries between HTTP operations, WebSocket management, agent logic, and node-specific features
- **Event Handler System**: Extensible event handler architecture with base classes and specific implementations (ThenvoiTrigger)
- **Modular Factories**: Specialized factories for agent creation, memory configuration, and prompt preparation
- **Type Safety**: Comprehensive TypeScript type definitions organized by domain

## Extending the Nodes

### Adding New Event Types (ThenvoiTrigger)

To add support for new event types for ThenvoiTrigger node:

1. Create a new handler directory in `nodes/ThenvoiTrigger/handlers/events/`
2. Implement the `IEventHandler` interface from `handlers/events/base/`
3. Extend the `BaseEventHandler` class for common functionality
4. Register the handler in `EventHandlerRegistry` (`handlers/events/EventHandlerRegistry.ts`)
5. Add the event configuration to `config/nodeConfig.ts`

Example structure for a new event:

```plaintext
handlers/events/
  └── yourEventName/
      ├── handler.ts       # Main event handler implementation
      └── utils.ts         # Event-specific utility functions (optional)
```

### Adding New Capabilities (ThenvoiAgent)

To add new capabilities to the ThenvoiAgent node:

1. Create a new capability class in `nodes/ThenvoiAgent/capabilities/yourCapability/`
2. Implement the `Capability` interface from `capabilities/base/Capability.ts`
3. Define a priority using `CapabilityPriority` enum (lower values execute first)
4. Implement lifecycle methods as needed:
   - `onSetup()` - Initialize resources, create tools/callbacks, fetch data
   - `onPrepare()` - Inspect or modify the agent executor after creation
   - `onSuccess()` - Handle successful execution results
   - `onError()` - Handle execution failures
   - `onFinalize()` - Cleanup resources (runs after success or error)
5. Register the capability in `execution.ts` (`createCapabilitiesRegistry` function)
6. Export from `capabilities/index.ts`

Example structure for a new capability:

```plaintext
capabilities/
  └── yourCapability/
      ├── YourCapability.ts    # Capability implementation
      └── utils.ts             # Capability-specific utilities (optional)
```

**Capability Priority Guidelines:**
- `CRITICAL (0)` - Must run first (e.g., auth, setup)
- `HIGH (25)` - Important but not critical (e.g., messaging, collaboration)
- `NORMAL (50)` - Default priority (e.g., context tools)
- `LOW (75)` - Can run later
- `CLEANUP (100)` - Should run last

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
