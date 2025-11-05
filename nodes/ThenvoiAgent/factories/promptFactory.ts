import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { augmentPromptForModelThoughts } from '../utils/thoughts/thoughtExtraction';
import { AgentBasicInfo } from '@lib/types';

/**
 * Base ReAct template structure shared between memory and non-memory versions
 */
const REACT_TEMPLATE_BASE = `You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought: {agent_scratchpad}`;

/**
 * ReAct template for agents without memory
 */
const REACT_TEMPLATE_WITHOUT_MEMORY = `{systemMessage}

${REACT_TEMPLATE_BASE}`;

/**
 * ReAct template for agents with memory
 */
const REACT_TEMPLATE_WITH_MEMORY = `{systemMessage}

Previous conversation:
{chat_history}

${REACT_TEMPLATE_BASE}`;

/**
 * Creates a prompt template for tool-calling agents
 *
 * Tool-calling agents use native function calling features of modern LLMs
 * (OpenAI, Claude 3+, Gemini, etc.) for more reliable tool usage.
 *
 * Prompt structure:
 * 1. System message - Defines agent behavior and instructions
 * 2. Chat history (if memory enabled) - Previous conversation context
 * 3. Human input - Current user message
 * 4. Agent scratchpad - Internal tool calls and reasoning
 *
 * This format is required by LangChain's tool-calling agents and matches
 * the message structure expected by modern LLM APIs.
 *
 * Note: The system message is escaped to handle literal curly braces,
 * as ChatPromptTemplate also parses message content as templates.
 */
export function createToolCallingPrompt(
	systemMessage: string,
	hasMemory: boolean,
): ChatPromptTemplate {
	const escapedSystemMessage = escapeTemplateBraces(systemMessage);

	if (hasMemory) {
		return ChatPromptTemplate.fromMessages([
			['system', escapedSystemMessage],
			new MessagesPlaceholder('chat_history'),
			['human', '{input}'],
			new MessagesPlaceholder('agent_scratchpad'),
		]);
	}

	return ChatPromptTemplate.fromMessages([
		['system', escapedSystemMessage],
		['human', '{input}'],
		new MessagesPlaceholder('agent_scratchpad'),
	]);
}

/**
 * Escapes curly braces in a string for use in LangChain templates
 *
 * LangChain uses {variableName} for template variables, so literal braces
 * must be escaped as {{ and }} to prevent template parsing errors.
 *
 * This function escapes all single braces to ensure they are treated as literal text.
 * If braces are already escaped ({{ or }}), they will be double-escaped ({{{{ or }}}}),
 * which will still render correctly as {{ and }} in the final output.
 */
function escapeTemplateBraces(text: string): string {
	// Escape all single braces - simple and reliable
	// This handles both single braces and already-escaped braces correctly
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Creates a prompt template for ReAct agents
 *
 * ReAct agents use prompt-based tool selection for models without
 * native function calling. The agent follows a "Thought-Action-Observation"
 * loop until it reaches a final answer.
 *
 * The system message is escaped to handle any literal curly braces that
 * might be present in user-provided prompts (e.g., code examples, JSON).
 */
export function createReactPrompt(systemMessage: string, hasMemory: boolean): PromptTemplate {
	const escapedSystemMessage = escapeTemplateBraces(systemMessage);
	const template = hasMemory
		? REACT_TEMPLATE_WITH_MEMORY.replace('{systemMessage}', escapedSystemMessage)
		: REACT_TEMPLATE_WITHOUT_MEMORY.replace('{systemMessage}', escapedSystemMessage);

	return PromptTemplate.fromTemplate(template);
}

/**
 * Augments system message with messaging guidelines including mentions, sending messages, and stopping conditions
 */
export function addMessagingGuidelines(basePrompt: string): string {
	const messagingGuidelines = `
## Mention Guidelines

The "@" symbol notifies participants and triggers immediate action. Use it carefully.

Rules:
- Do NOT mention yourself - only mention others when addressing them
- NEVER use "@" in these situations:
  - Thanking or acknowledging someone
  - Just referencing someone in conversation
  - Using conditional statements like "if...", "when...", "I would...", "I will..."
  - Planning to ask someone later
  - Waiting for information before you can ask
  - Explaining what you would do in a hypothetical situation
  - You don't have ALL required information to ask a complete question RIGHT NOW
  - In all these cases, use their name WITHOUT "@"
- Use "@" ONLY when:
  - You are literally asking a question or making a request RIGHT NOW
  - You have ALL required information immediately available
  - The question is complete and ready to be answered without any missing data
  - You are not waiting for anything from anyone
  - **EXCEPTION: You MUST mention the user when delivering a response that came from another agent** - Use send_message with "@" followed by the user's exact name at the start of the message.

## Sending Messages

You can send messages using the \`send_message\` tool. This allows you to send multiple messages in a single execution.

**How to use send_message:**
1. Call the tool with the message content as a string
2. Mentions (@Name) will be automatically detected
3. You can call this tool multiple times to send multiple messages
4. Messages are sent immediately during execution
5. **IMPORTANT: When asked to send multiple messages, call send_message ONCE for EACH message** (e.g., if asked for 5 messages, make 5 separate send_message calls)

**Privacy Guidelines:**
- If your message contains user information, questions to the user, or user context, send it as a separate message
- Do NOT include agent mentions in messages that contain user information
- Use separate send_message calls:
  - First call: Message to user (e.g., "Sure, I\'ll ask the weather assistant!")
  - Second call: Message to agent (e.g., "@Weather Assistant What's the weather in Houston?")

**Examples:**
- To ask user for info: \`send_message("Let me ask the weather assistant!")\`
- To ask agent: \`send_message("@Weather Assistant, What's the weather in Tel Aviv?")\`
- To send your response: \`send_message("@User Here's the weather: ...")\`
- **To send multiple messages:** Call send_message multiple times:
  \`send_message("First message")\`
  \`send_message("Second message")\`
  \`send_message("Third message")\`
  (Each call sends a separate message)

## When to Stop Gathering Information and Provide Your Response

**CRITICAL: Once you have gathered all the information needed to answer the user's question, STOP calling information-gathering tools (like get_agent_info, get_chat_messages, add_agent_to_chat, etc.) and provide your response using send_message.**

- Do NOT make additional information-gathering tool calls once you have the information needed
- Do NOT call tools to verify information you already have
- Do NOT call tools unnecessarily - only call tools when you genuinely need new information
- **Use send_message to provide your response** - you can call send_message multiple times if needed (e.g., to send user-facing messages separately from agent messages)
- If you need to mention a user but don't know their exact name, use get_chat_participants to find it, or mention them with "@" followed by their name as you know it
`;

	return `${basePrompt}\n${messagingGuidelines}`;
}

/**
 * Augments system message with available agents context for collaboration
 */
export function augmentPromptWithAgents(
	basePrompt: string,
	availableAgents: AgentBasicInfo[],
): string {
	if (availableAgents.length === 0) {
		return basePrompt;
	}

	const agentsList = availableAgents
		.map((agent) => `- ${agent.name}: ${agent.description}`)
		.join('\n');

	const agentContext = `
## Available Agents for Collaboration

When you need specialized expertise, directly add and use agents without asking the user for permission.

**How to use agents:**
1. Call add_agent_to_chat with the agent name
2. If the tool returns "already in chat" or "successfully added", the agent is ready
3. **STOP calling add_agent_to_chat or get_agent_info** - do NOT call these tools again
4. Use send_message to ask the agent your question (mention them with "@AgentName" in the message)
5. The agent will respond, then provide your response to the user using send_message

**IMPORTANT:**
- Do NOT ask the user if you should add an agent - just add it if needed
- Do NOT explain to the user how to interact with agents
- Do NOT tell the user they can ask the agent - instead, add the agent and use it yourself
- **CRITICAL: Do NOT repeatedly call get_agent_info or add_agent_to_chat for the same agent - once added, use send_message to ask them directly**
- Do NOT create interactions with other agents unless directly related to what the user asked for
- **REQUIRED: When delivering a response from another agent, use send_message and mention the user at the start** - Use "@" followed by the user's exact name (use get_chat_participants if needed)
- **STOPPING CONDITION: Once you have the information needed, STOP calling information-gathering tools and provide your response using send_message**

Available agents:
${agentsList}
`;

	return `${basePrompt}\n${agentContext}`;
}

/**
 * Augments a system message with model thought instructions if needed
 */
export function prepareSystemMessage(basePrompt: string, useModelThoughts: boolean): string {
	let prompt = basePrompt;

	if (useModelThoughts) {
		prompt = augmentPromptForModelThoughts(prompt);
	}

	return prompt;
}
