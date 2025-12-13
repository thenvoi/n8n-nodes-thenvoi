# Architecture Documentation - Getting Started

This guide helps you navigate the architecture documentation based on your goals. The documentation is organized into focused guides that explain different aspects of the system.

## Documentation Structure

The architecture documentation is organized by system component:

- **`agent/`** - Agent node system overview and architecture
  - **`capabilities/`** - Capability system for extensible functionality
  - **`execution/`** - Execution pipeline orchestration
  - **`memory/`** - Enhanced memory system with structured data
  - **`prompting/`** - Dynamic prompt assembly system
  - **`tools/`** - Tool registration and execution
  - **`messaging/`** - Message processing and queueing
- **`trigger/`** - Trigger node system overview and architecture
- **`socket/`** - WebSocket connection management
- **`api/`** - API client system

## Reading Paths

### Path 1: Understanding the Complete System

**Goal**: Get a comprehensive understanding of how everything works together.

**Order**:
1. [Agent Node System Guide](agent/agent_node_system_guide.md) - Overview of agent node architecture
2. [Execution Pipeline Guide](agent/execution/execution_pipeline_guide.md) - How execution is orchestrated
3. [Capability System Guide](agent/capabilities/capability_system_guide.md) - Extensible functionality system
4. [Memory System Guide](agent/memory/memory_system_guide.md) - Enhanced memory with structured data
5. [Prompt System Guide](agent/prompting/prompt_system_guide.md) - Dynamic prompt assembly
6. [Tool System Guide](agent/tools/tool_system_guide.md) - Tool registration and execution
7. [Message Processing Guide](agent/messaging/message_processing_guide.md) - Real-time message streaming
8. [Trigger System Guide](trigger/trigger_system_guide.md) - Trigger node architecture
9. [Socket System Guide](socket/socket_system_guide.md) - WebSocket connections
10. [API Client Guide](api/api_client_guide.md) - HTTP API client

**Time**: ~1-1.5 hours for complete reading

### Path 2: Understanding Agent Execution

**Goal**: Understand how agents execute and what happens during execution.

**Order**:
1. [Agent Node System Guide](agent/agent_node_system_guide.md) - High-level overview
2. [Execution Pipeline Guide](agent/execution/execution_pipeline_guide.md) - Execution phases
3. [Capability System Guide](agent/capabilities/capability_system_guide.md) - How capabilities extend functionality
4. [Memory System Guide](agent/memory/memory_system_guide.md) - How memory works
5. [Prompt System Guide](agent/prompting/prompt_system_guide.md) - How prompts are built
6. [Tool System Guide](agent/tools/tool_system_guide.md) - How tools work
7. [Message Processing Guide](agent/messaging/message_processing_guide.md) - How messages are sent

**Time**: ~30-45 minutes

### Path 3: Extending Functionality (Creating Capabilities)

**Goal**: Learn how to create custom capabilities to extend agent functionality.

**Order**:
1. [Capability System Guide](agent/capabilities/capability_system_guide.md) - Capability interface and lifecycle
2. [Execution Pipeline Guide](agent/execution/execution_pipeline_guide.md) - How capabilities integrate
3. [Tool System Guide](agent/tools/tool_system_guide.md) - How to provide tools from capabilities
4. [Message Processing Guide](agent/messaging/message_processing_guide.md) - How to send messages from capabilities
5. Review built-in capabilities in codebase for examples

**Time**: ~30 minutes

### Path 4: Understanding Memory and Context

**Goal**: Understand how memory stores and retrieves conversation context.

**Order**:
1. [Memory System Guide](agent/memory/memory_system_guide.md) - Memory architecture
2. [Prompt System Guide](agent/prompting/prompt_system_guide.md) - How memory is used in prompts
3. [Execution Pipeline Guide](agent/execution/execution_pipeline_guide.md) - How memory integrates into execution

**Time**: ~20-30 minutes

### Path 5: Understanding Real-Time Communication

**Goal**: Understand how real-time communication works (trigger and messaging).

**Order**:
1. [Trigger System Guide](trigger/trigger_system_guide.md) - Trigger node overview
2. [Socket System Guide](socket/socket_system_guide.md) - WebSocket connections
3. [Message Processing Guide](agent/messaging/message_processing_guide.md) - Message sending
4. [API Client Guide](api/api_client_guide.md) - HTTP API for messages

**Time**: ~30-45 minutes

### Path 6: Debugging a Specific Issue

**Goal**: Find information about a specific problem or component.

**Quick Reference**:
- **Agent not executing**: [Execution Pipeline Guide](agent/execution/execution_pipeline_guide.md) → Troubleshooting
- **Memory not saving**: [Memory System Guide](agent/memory/memory_system_guide.md) → Troubleshooting
- **Prompts not building**: [Prompt System Guide](agent/prompting/prompt_system_guide.md) → Troubleshooting
- **Tools not available**: [Tool System Guide](agent/tools/tool_system_guide.md) → Troubleshooting
- **Messages not sending**: [Message Processing Guide](agent/messaging/message_processing_guide.md) → Troubleshooting
- **Trigger not receiving events**: [Trigger System Guide](trigger/trigger_system_guide.md) → Troubleshooting
- **Capabilities not working**: [Capability System Guide](agent/capabilities/capability_system_guide.md) → Troubleshooting

## Prerequisites

Before diving into the architecture documentation:

- **TypeScript knowledge**: The codebase is TypeScript, but documentation focuses on concepts
- **n8n basics**: Understanding of n8n nodes and workflows helps
- **LangChain basics**: Familiarity with LangChain concepts (agents, memory, tools) is helpful
- **No code reading required**: Documentation explains concepts, not code

## Key Concepts

Before reading, familiarize yourself with key terms in the [Glossary](../glossary.md):

- [Capability](../glossary.md#capability) - Modular functionality components
- [Execution Pipeline](../glossary.md#execution-pipeline) - Execution lifecycle phases
- [Dynamic Context](../glossary.md#dynamic-context) - Runtime data injected into prompts
- [Structured Data](../glossary.md#structured-data) - Enhanced memory storage format
- [Message Queue](../glossary.md#message-queue) - Sequential message sending system

## Documentation Principles

All architecture documentation follows these principles:

- **Conceptual focus**: Explains architecture and design patterns, not code
- **Visual diagrams**: Uses Mermaid diagrams for clarity
- **Cross-references**: Links between related documentation
- **Troubleshooting**: Common issues and solutions included

See the [Documentation Guide](../documentation_guide.md) for more details on documentation standards.

## Quick Links

### System Overviews
- [Agent Node System Guide](agent/agent_node_system_guide.md)
- [Trigger System Guide](trigger/trigger_system_guide.md)

### Core Systems
- [Execution Pipeline Guide](agent/execution/execution_pipeline_guide.md)
- [Capability System Guide](agent/capabilities/capability_system_guide.md)
- [Memory System Guide](agent/memory/memory_system_guide.md)

### Supporting Systems
- [Prompt System Guide](agent/prompting/prompt_system_guide.md)
- [Tool System Guide](agent/tools/tool_system_guide.md)
- [Message Processing Guide](agent/messaging/message_processing_guide.md)
- [Socket System Guide](socket/socket_system_guide.md)
- [API Client Guide](api/api_client_guide.md)

### Reference
- [Glossary](../glossary.md) - Domain-specific terms
- [Documentation Guide](../documentation_guide.md) - Documentation standards

