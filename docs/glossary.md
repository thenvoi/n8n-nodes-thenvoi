# Glossary

This glossary defines key domain-specific terms used across the Thenvoi n8n nodes project documentation. Use these terms consistently to ensure clarity and prevent terminology drift.

## Memory & Context Terms

### Base Memory
The underlying LangChain memory implementation (e.g., BufferMemory, WindowMemory) that stores conversation history. Base memory is wrapped by `ThenvoiMemory` to add structured data capabilities while preserving all original functionality.

### Enhanced Context
The complete execution data saved to memory after agent execution completes, including agent thoughts, tool calls, and messages. Enhanced context is created during `saveContext()` and includes structured data that enriches the base memory storage.

### Enriched Metadata
Additional structured data stored alongside messages in memory. For Thenvoi agents, this includes tool calls, messages sent, and sender information stored in `additional_kwargs` on message objects.

### Message History Source
Configuration option determining where conversation history is loaded from:
- **From Memory**: Load from connected LangChain memory node (includes structured data)
- **From API**: Fetch recent messages from Thenvoi API (raw message content)

### Sender Information
Metadata attached to messages identifying who sent them:
- `sender_id`: Unique identifier of the sender
- `sender_name`: Display name of the sender
- `sender_type`: "User" or "Agent"

This information is stored with HumanMessages in memory and used by formatters to display proper sender names in prompts.

### Handle
The participant's unique identifier used for @mentions. May only contain lowercase letters (a-z), numbers, and hyphen. For users: username. For agents: owner/slug format. Required on chat participants, used for mention pattern matching in message content. Agents must use exact handles from the CHAT PARTICIPANTS section when composing mentions.

### Peer
An entity (agent or user) that the authenticated agent can interact with. Fetched from the `/agent/peers` endpoint. Peers include handle, id, name, type, is_contact, and source. Used when adding participants to chats via the collaboration capability.

### PeerSource
How a peer was discovered: `registry` (public directory) or `contact` (existing contact). Returned by the peers API.

### Structured Data
A structured representation of agent execution that separates:
- **Thoughts**: The agent's reasoning (stored as AIMessage content)
- **Tool Calls**: Actions the agent took (including `send_message` calls)
- **Messages Sent**: Messages sent via the `send_message` tool (extracted separately)

This structure allows memory to retrieve and format different components independently.

## Execution Terms

### Execution Context
The complete runtime environment for agent execution, including the model, tools, memory, and configuration. Represented by `AgentExecutionContext` and passed to the agent executor.

### Intermediate Steps
The sequence of tool calls and their results that occur during agent execution. Captured by the callback handler during execution and passed to memory for storage. Always collected by the system (even if filtered from output) because memory needs them to create structured data.

## Agent Terms

### Agent Role
User-defined text that describes the agent's identity, capabilities, and personality. Injected into the system prompt to define WHO the agent is and WHAT it does.

### Agent Guidelines
Optional user-defined text containing domain-specific rules and behavioral guidelines. Injected into the system prompt to define HOW the agent should behave.

### Agent Examples
Optional user-defined text containing example interactions that demonstrate desired behavior. Injected into the system prompt to show the agent ideal responses.

### Tool Calls
Actions performed by the agent during execution using available tools. Tool calls are extracted from intermediate steps and stored in structured data with:
- `tool`: The tool name
- `input`: The input provided to the tool
- `result`: The output/result from the tool

### Thoughts
The agent's reasoning and decision-making process, extracted from LLM output. Thoughts are stored as the main content of AIMessage objects in memory (raw, unformatted) and separately in structured data for formatting.

## Capability Terms

### Capability
A modular component that extends agent functionality through lifecycle hooks. Capabilities execute in priority order during the agent execution pipeline and can provide tools, callbacks, and metadata.

### Capability Registry
Manages and coordinates agent capabilities. Capabilities are executed sequentially based on their priority (lower priority values execute first).

### Capability Lifecycle
The phases a capability can hook into:
- **Setup**: Initialize resources, create tools/callbacks
- **Prepare**: Inspect or modify the agent executor
- **Success**: Handle successful execution results
- **Error**: Handle execution failures
- **Finalize**: Cleanup resources (runs after success or error)

### Messaging Capability
Built-in capability that streams agent activity to Thenvoi chat in real-time. Provides the `send_message` tool and handles message queueing.

### Agent Collaboration Capability
Built-in capability that enables agents to discover and add other participants to chats. Provides tools for managing chat participants.

## Formatting Terms

### Context Formatter
Utility functions that format dynamic context data for prompt injection. Includes formatters for room info, participants, messages, and tools.

### JSON Formatting
The output format used for recent messages in prompts. Messages are formatted as JSON arrays for consistent parsing by LLMs, with sender information and content/structured data.

### Dynamic Context
Runtime data injected into prompts during each execution:
- **Room Info**: Current chat room details
- **Participants**: List of chat participants
- **Recent Messages**: Conversation history (from memory or API)
- **Tools**: Available tools and their descriptions

## Architecture Terms

### Execution Pipeline
The structured phase-based flow that orchestrates agent execution: Initialize Capabilities → Setup → Prepare → Execute → Success/Error → Finalize.

### Message Queue
A queue system that ensures messages are sent sequentially to prevent race conditions and maintain message order. Messages are enqueued and sent one at a time.

### Phoenix Socket
A WebSocket implementation used for real-time communication with the Thenvoi platform. Provides connection management, automatic reconnection, and channel-based messaging.

### Room Subscription
A subscription to a specific chat room's events via a Phoenix channel. The trigger node manages multiple room subscriptions based on configuration.

### Tool Name Registry
A registry mapping tool class names to their declared names, enabling correct tool name extraction from serialized tool objects used by callback handlers.

## Usage

When using these terms in documentation:
- Link to this glossary for clarity: [glossary.md](glossary.md)
- Use terms consistently across all documents
- Add new shared terms to this glossary first
- Only define terms in individual documents if they are document-specific
