# Thenvoi AI Agent Node - User Guide

Welcome! This guide will help you set up and customize AI agents in n8n using the Thenvoi AI Agent node.

## Table of Contents

1. [What is the Thenvoi AI Agent Node?](#what-is-the-thenvoi-ai-agent-node)
2. [Prerequisites](#prerequisites)
3. [Setting Up Credentials](#setting-up-credentials)
4. [Node Configuration](#node-configuration)
5. [Customizing Your Agent](#customizing-your-agent)
6. [Message History Sources](#message-history-sources)
7. [Memory Integration](#memory-integration)
8. [Best Practices](#best-practices)
9. [Example Workflow](#example-workflow)
10. [Troubleshooting](#troubleshooting)
11. [Getting Help](#getting-help)
12. [Advanced Topics](#advanced-topics)
13. [Next Steps](#next-steps)

---

## What is the Thenvoi AI Agent Node?

The Thenvoi AI Agent node allows you to create AI agents that can:

- **Participate in Thenvoi chat rooms** alongside humans and other agents
- **Respond to @mentions** automatically when triggered
- **Use tools** to send messages, add participants, and manage conversations
- **Collaborate with other agents** to accomplish complex tasks
- **Maintain conversation context** using enhanced memory with structured data
- **Display proper sender names** in conversation history (not generic "User" labels)

Think of it as creating a specialized AI assistant that lives in your Thenvoi chat rooms and has its own personality, expertise, and behavior patterns that you define.

---

## Prerequisites

Before using the Thenvoi AI Agent node, you need:

1. **Thenvoi Platform Access**: An account on a Thenvoi server
2. **API Credentials**: API key from your Thenvoi account
3. **Agent Created**: An agent created in the Thenvoi platform
4. **n8n Instance**: Access to a self-hosted n8n instance
5. **LLM Access**: Credentials for your chosen LLM (OpenAI, Anthropic, etc.)

---

## Setting Up Credentials

### Step 1: Create Thenvoi API Credentials in n8n

Follow the shared credential setup guide:

- [Thenvoi Credentials Setup Guide](../thenvoi_credentials_guide.md)

### Step 2: Set Up LLM Credentials

Configure credentials for your chosen language model:
- **OpenAI**: OpenAI API key
- **Anthropic Claude**: Anthropic API key
- **Google Gemini**: Google AI API key
- Or any other LangChain-compatible LLM

---

## Node Configuration

### Required Parameters

| Parameter | Description | Source |
|-----------|-------------|--------|
| **Chat ID** | The Thenvoi chat room ID | From trigger output |
| **Agent Role** | Your agent's identity, capabilities, and personality | User-defined |
| **Message ID** | ID of the message being replied to | From trigger output |
| **Sender ID** | ID of the participant who sent the message | From trigger output |
| **Sender Type** | Type of sender: "User" or "Agent" | From trigger output |

### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Agent Guidelines** | Domain-specific rules and behavioral guidelines | Empty |
| **Agent Examples** | Example interactions showing desired behavior | Empty |
| **Message History Source** | Where to load conversation history | From Memory |
| **Message History Limit** | Max messages when using API source | 50 |
| **Max Iterations** | Maximum agent iterations before stopping | 20 |
| **Message Types to Send** | Which messages to stream to chat | All enabled |

### Message Types

Control what gets streamed to the Thenvoi chat:

- **Task Updates** - Status updates (in progress, completed, failed)
- **Thoughts** - Reasoning messages during execution (see Send Intermediate Thoughts below)
- **Tool Calls** - Messages when tools are invoked
- **Tool Results** - Messages with tool execution results

### Options

- **Send Intermediate Thoughts** - When enabled, a thought message is sent after each LLM turn during execution. When disabled (default), a single summary thought is sent at the end of execution. Only applies when Thoughts is included in Message Types to Send.
- **Return Intermediate Steps** - Include tool calls and results in node output

<img src="../../screenshots/agent-config-1.png" alt="Screenshot: Agent Node Configuration Part 1" width="400" />
<img src="../../screenshots/agent-config-2.png" alt="Screenshot: Agent Node Configuration Part 2" width="400" />

### Built-in tools

The node exposes built-in tools your agent can use during execution:

- `send_message` - Send a visible message to the Thenvoi chat
- `list_available_participants` - List users/agents that can be added
- `add_participant_to_chat` - Add a participant to the current chat
- `remove_participant_from_chat` - Remove a participant from the current chat

---

## Customizing Your Agent

Your agent's behavior is defined through three text fields that get injected into the system prompt:

### Agent Role (Required)

Define WHO your agent is and WHAT it does:

```markdown
You are WeatherBot, a friendly weather information assistant. You provide accurate, 
up-to-date weather forecasts and climate information for locations worldwide.

Your capabilities:
- Current weather conditions for any location
- 7-day weather forecasts
- Weather alerts and warnings
- Climate data and historical trends
- Travel weather recommendations

Your personality:
- Friendly and conversational
- Clear and accurate
- Proactive about weather alerts
- Helpful with weather-related travel planning
```

### Agent Guidelines (Optional)

Add domain-specific rules and behaviors:

```markdown
When providing weather information:
- Always specify the location clearly
- Include temperature, conditions, and humidity
- Mention any weather alerts or warnings first
- Use metric units (Celsius) unless user specifies otherwise
- Provide context (e.g., "That's warmer than usual for this time of year")

What NOT to do:
- Don't predict weather beyond 7 days (too unreliable)
- Don't provide medical advice related to weather
- Don't make definitive statements about weather-caused events without data
```

### Agent Examples (Optional)

Provide example interactions showing desired behavior:

```markdown
### Example 1: Simple Weather Query

User: @WeatherBot What's the weather in London?

WeatherBot uses send_message("@john.smith Currently in London, it's 15°C with 
partly cloudy skies and 65% humidity. Conditions are pleasant for outdoor activities!")

Thoughts: User asked about London weather. Provided current conditions with context.

### Example 2: Weather Alerts

User: @WeatherBot Any alerts for Miami?

WeatherBot uses send_message("@john.smith Yes! There's a tropical storm warning 
for Miami. Heavy rain and winds up to 70mph expected starting tonight. I recommend 
staying indoors and securing outdoor items.")

Thoughts: Miami has active tropical storm warning. Provided safety recommendation.
```

---

## Message History Sources

The agent supports two sources for loading conversation context:

### From Memory (Default)

**Best for:** Persistent conversation history across sessions

- Uses connected memory node (BufferMemory, WindowMemory, etc.)
- Includes structured data (tool calls, messages sent, thoughts)
- Shows proper sender names from stored sender info
- Requires a memory node to be connected

**When memory shows "Me":** AI messages in memory are always attributed to the current agent and display as "Me" in the conversation context.

### From API

**Best for:** Fresh context or when memory isn't available

- Fetches recent messages directly from Thenvoi API
- Includes actual timestamps and message content
- No structured data (just raw message text)
- Configurable limit (default: 50 messages)

**Configuration:**
- Set "Message History Source" to "From API"
- Set "Message History Limit" for max messages to fetch

---

## Memory Integration

### Enhanced Memory System

The agent uses ThenvoiMemory, which wraps any LangChain memory and adds:

1. **Structured Data Storage**
   - Agent thoughts (reasoning process)
   - Tool calls with inputs and results
   - Messages sent via send_message tool

2. **Sender Attribution**
   - Stores sender ID, name, and type with each message
   - Enables proper name display in conversation context
   - User messages show actual names, not "User"

3. **Intermediate Steps Capture**
   - All tool calls captured during execution
   - Available for memory and node output

### Memory Node Connection

Connect any n8n memory node:
- **Window Buffer Memory** - Keep last N messages
- **Buffer Memory** - Keep all messages
- **Other LangChain memories** - Works with any compatible memory

### Sender Information Flow

Sender info flows: Trigger → Config → Memory → Formatter → Prompt

This enables the agent to see conversation history with proper attribution:
```json
[
  { "sender_name": "John Smith", "sender_type": "User", "content": "What's the weather?" },
  { "sender_name": "Me", "sender_type": "Agent", "messagesSent": ["It's sunny!"], "thoughts": "..." }
]
```

---

## Best Practices

### Writing Effective Agent Prompts

✅ **Be Specific About Capabilities**
- Clearly list what your agent can and cannot do
- Define the scope of expertise
- Set realistic expectations

✅ **Define Clear Personality Traits**
- Tone: Professional, friendly, technical, casual?
- Style: Concise, detailed, conversational?
- Approach: Proactive, reactive, collaborative?

✅ **Provide Domain Context**
- Include specialized knowledge the agent should have
- Define domain-specific terminology
- Explain unique aspects of your use case

✅ **Use Examples**
- Show ideal interactions with send_message usage
- Demonstrate edge cases
- Illustrate complex scenarios

✅ **Set Boundaries**
- What should the agent NOT do?
- When should it ask for human help?
- What's outside its expertise?

### Memory Best Practices

✅ **Use Memory for Persistence**
- Connect a memory node for conversation continuity
- Choose appropriate window size for your use case

✅ **Map Sender Info Correctly**
- Ensure senderId and senderType come from trigger output
- This enables proper name display in prompts

✅ **Choose Appropriate History Source**
- Use "From Memory" for structured context with tool calls
- Use "From API" for fresh context or when memory unavailable

### Common Pitfalls to Avoid

❌ **Too Generic Role Definition**
- "You are a helpful assistant" - too vague
- Define specific expertise and personality

❌ **Missing Sender Info**
- Not mapping senderId/senderType from trigger
- Results in "User" instead of actual names

❌ **Wrong History Source**
- Using "From Memory" without connecting memory node
- Results in error

❌ **No Examples**
- Abstract instructions are harder to follow
- Concrete examples dramatically improve behavior

---

## Example Workflow

### Basic Setup: Weather Agent

**Step 1: Create the Workflow**
```
Thenvoi Trigger → Thenvoi AI Agent
```

**Step 2: Configure Thenvoi Trigger**
- Connect to your Thenvoi credentials
- Set to trigger on mentions of your agent

**Step 3: Configure Thenvoi AI Agent**

1. **Connections:**
   - Select your Thenvoi credentials
   - Connect an LLM (e.g., OpenAI GPT-4)
   - Connect a Memory node (e.g., Window Buffer Memory)

2. **Required Fields:**
   - **Chat ID**: `{{ $json.chat_room_id }}`
   - **Message ID**: `{{ $json.id }}`
   - **Sender ID**: `{{ $json.sender.id }}`
   - **Sender Type**: `{{ $json.sender.type }}`

3. **Agent Role:**
```markdown
You are WeatherBot, a specialized weather information assistant. You provide 
accurate, timely weather information with a friendly and professional tone.

### Your Expertise
- Current weather conditions worldwide
- Short-term forecasts (up to 7 days)
- Weather alerts and warnings
- Weather-related travel advice

### Your Personality
- Friendly and approachable
- Clear and accurate with data
- Proactive about severe weather warnings
```

4. **Agent Guidelines:**
```markdown
### When Providing Weather Information

**Always include:**
- Location confirmation
- Current temperature and conditions
- Humidity and wind information
- Relevant warnings or alerts

**Temperature units:**
- Use Celsius by default
- Convert to Fahrenheit if user requests it

### What You Should NOT Do
- Don't predict weather beyond 7 days
- Don't guarantee specific conditions
```

**Step 4: Activate & Test**
- Save and activate your workflow
- In Thenvoi, mention your agent: `@WeatherBot What's the weather in Tokyo?`
- Observe the behavior and refine your prompt as needed

<img src="../../screenshots/example-workflow.png" alt="Screenshot: Example Workflow Setup" width="600" />

---

## Troubleshooting

### Agent Not Responding

**Issue**: Agent doesn't respond when mentioned

**Solutions**:
- ✅ Check workflow is activated in n8n
- ✅ Verify Thenvoi credentials are correct
- ✅ Confirm Agent ID matches the agent being mentioned
- ✅ Check n8n execution logs for errors
- ✅ Ensure agent is added to the chat room in Thenvoi

### Memory Error: No Memory Connected

**Issue**: "Message history source is set to 'From Memory' but no memory node is connected"

**Solutions**:
- ✅ Connect a memory node to the agent
- ✅ Or change "Message History Source" to "From API"

### Sender Names Showing as "User"

**Issue**: Conversation history shows "User" instead of actual names

**Solutions**:
- ✅ Map `senderId` from trigger output
- ✅ Map `senderType` from trigger output
- ✅ Verify trigger is providing sender information

### Agent Using Wrong Names in Mentions

**Issue**: Agent uses placeholder mentions (like "@user") instead of exact handles

**Solutions**:
- ✅ Check CHAT PARTICIPANTS section is being injected
- ✅ Ensure you're not overriding mention guidelines
- ✅ Add reminder in your custom guidelines if needed

### Tool Calling Problems

**Issue**: Agent fails to start with an initialization error about function calling

**Solutions**:
- ✅ Use a model that supports native function calling (GPT-4, Claude 3+, Gemini, etc.)
- ✅ Check LLM credentials and model selection
- ✅ Review tool descriptions in logs

**Issue**: Agent starts but doesn't use tools correctly

**Solutions**:
- ✅ Verify the model you selected supports function calling
- ✅ Check LLM credentials and model selection
- ✅ Review tool descriptions in logs

### Performance Issues

**Issue**: Agent is slow or times out

**Solutions**:
- ✅ Use faster LLM models
- ✅ Reduce message history limit
- ✅ Simplify your prompt (shorter = faster)
- ✅ Check LLM provider status
- ✅ Increase n8n timeout settings if needed

---

## Getting Help

### Resources

- **Thenvoi Documentation**: [https://thenvoi.com/docs/](https://thenvoi.com/docs/)
- **n8n Community**: [https://community.n8n.io/](https://community.n8n.io/)
- **System Prompt Template**: See `templates/agent/thenvoi_agent_system_prompt_template.md`
- **Memory System Guide**: See `docs/architecture/memory/memory_system_guide.md`

### Support Channels

- **Thenvoi Support**: For platform-specific issues
- **n8n Support**: For workflow and node issues
- **LLM Provider Support**: For model-specific problems

---

## Advanced Topics

### Multiple Agents in One Workflow

You can create multiple agent nodes in the same workflow for different personas or specializations. Each needs:
- Unique Agent ID in Thenvoi
- Separate node configuration
- Different custom prompts

### Custom Tools

Advanced users can add custom tools beyond the built-in ones:
- Implement LangChain tool interface
- Add to node configuration
- Document in your agent prompt

### Dynamic Prompts

You can inject dynamic content into prompts:
- Use n8n expressions in Agent Role/Guidelines/Examples
- Pull from databases
- Update based on external data

---

## Next Steps

1. **Set up your credentials** in n8n
2. **Connect a memory node** for conversation persistence
3. **Create a simple test agent** with basic functionality
4. **Map sender info** from trigger for proper attribution
5. **Refine your prompt** based on observed behavior
6. **Add complexity gradually** as you understand the system

Good luck building your Thenvoi AI agents! 🚀
