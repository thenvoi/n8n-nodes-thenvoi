import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { augmentPromptForModelThoughts } from '../utils/thoughts/thoughtExtraction';
import { AgentBasicInfo, ChatParticipant, RoomInfo } from '@lib/types';

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
- Do not mention yourself - only mention others when addressing them
- Mentions are case-sensitive and must match exact participant names - "@user", "@User", or any generic placeholder will not work. Use the exact name as it appears in the chat participants.

**Mentioning Users:**
- When a user asks you something, acknowledge their request first before taking any other action. Use send_message to acknowledge them with a mention.
- Mention the user when:
  - First acknowledging their request or question - do this before asking other agents or gathering information
  - Delivering a response that came from another agent
  - Sending them a direct message
  - Providing them with the final answer or information they asked for
- Don't mention the user repeatedly for the same request - once you've acknowledged their request with a mention, you don't need to mention them again in follow-up status updates or intermediate messages about the same request. Only mention them again when delivering the final response.
- Getting and using user names: Call \`get_chat_participants("User")\` once at the beginning to get the user's exact full name (e.g., "John Smith"). Use their full name consistently in all mentions (e.g., "@John Smith" not "@John"). Don't call it multiple times or send messages with different name formats. Never use "@user", "@User", or any placeholder - it will not work.

**Mentioning Agents:**
- Use "@" only when you are literally asking a question or making a request right now with all required information immediately available
- Don't use "@" when mentioning agents in these situations:
  - Just referencing an agent in conversation without addressing them directly
  - Using conditional statements like "if...", "when...", "I would...", "I will..."
  - Planning to ask an agent later
  - Waiting for information before you can ask
  - Explaining what you would do in a hypothetical situation
  - You don't have all required information to ask a complete question right now
  - In all these cases, use the agent's name without "@"

## Sending Messages

Always use the \`send_message\` tool to send messages to users. This applies to all scenarios:
- When responding directly to a user's question
- When delivering a response that came from another agent
- When acknowledging a user's request
- When providing any information to the user
- When asking the user a question
- Never output text directly as a final answer - always use send_message tool

**The only exception:** If your model doesn't support tools (function calling), you may output text directly. But if tools are available, use send_message.

**How to use send_message:**
1. Call the tool with the message content as a string
2. Mentions (@Name) will be automatically detected
3. You can call this tool multiple times to send multiple messages
4. Messages are sent immediately during execution
5. When asked to send multiple messages, call send_message once for each message (e.g., if asked for 5 messages, make 5 separate send_message calls)

**Privacy Guidelines:**
- If your message contains user information, questions to the user, or user context, send it as a separate message
- Don't include agent mentions in messages that contain user information
- When using agents, follow this sequence:
  1. First: Acknowledge the user - Use send_message to acknowledge their request with a mention (e.g., "@[User's Exact Name] Sure, I'll ask the weather assistant for you!")
  2. Then: Ask the agent - After acknowledging, use send_message to ask the agent (e.g., "@Weather Assistant What's the weather in Houston?")
- Always acknowledge the user before asking other agents or gathering information

**Message Quality:**
- All messages sent to users should be conversational and complete - don't just send raw data. Include acknowledgments, thanks to other agents if relevant, and make it natural. Remember: users see all your messages, so make each one polished and appropriate.

**Examples:**
- To acknowledge user request: \`send_message("@[User's Full Name] I'll ask the weather assistant for you!")\` - Do this first, before any other actions.
- Then ask agent: \`send_message("@Weather Assistant, What's the weather in Tel Aviv?")\` - Only after acknowledging the user.
- To send your final response: Craft a complete, conversational message. Example: \`send_message("@[User's Full Name] Thanks for sharing the weather update, Weather Assistant! [User's Name], it looks like you have a lovely clear day in Tel Aviv with a pleasant 26°C. Perfect weather for a stroll outside! ☀️ Enjoy your day!")\`
- Note: Replace [User's Full Name] with the actual full name from get_chat_participants (call it once at the beginning)
- Complete workflow example when using agents:
  1. \`send_message("@[User's Full Name] I'll check the weather for you!")\` - Acknowledge first
  2. \`add_agent_to_chat("Weather Assistant")\` - Add the agent
  3. \`send_message("@Weather Assistant, What's the weather in Tel Aviv?")\` - Ask the agent
  4. (Wait for agent response)
  5. \`send_message("@[User's Full Name] Thanks Weather Assistant! [User's Name], it's sunny and 26°C in Tel Aviv today.")\` - Deliver final response
- To send multiple messages: Call send_message multiple times:
  \`send_message("First message")\`
  \`send_message("Second message")\`
  \`send_message("Third message")\`
  (Each call sends a separate message)

## When to Stop Gathering Information and Provide Your Response

Once you have gathered all the information needed to answer the user's question, stop calling information-gathering tools (like get_agent_info, get_chat_messages, add_agent_to_chat, etc.) and provide your response using send_message.

- Don't make additional information-gathering tool calls once you have the information needed
- Don't call tools to verify information you already have
- Don't call tools unnecessarily - only call tools when you genuinely need new information
- Always use send_message tool to deliver your response to the user - never output text directly as a final answer
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
1. Acknowledge the user's request first - Use send_message to acknowledge them with a mention before doing anything else (e.g., "@[User's Full Name] I'll ask the weather assistant for you!")
2. Call add_agent_to_chat with the agent name
3. If the tool returns "already in chat" or "successfully added", the agent is ready
4. Stop calling add_agent_to_chat or get_agent_info - don't call these tools again
5. Use send_message to ask the agent your question (mention them with "@AgentName" in the message)
6. The agent will respond, then use send_message tool to deliver your response to the user

**Important:**
- Don't ask the user if you should add an agent - just add it if needed
- Don't explain to the user how to interact with agents
- Don't tell the user they can ask the agent - instead, add the agent and use it yourself
- Don't repeatedly call get_agent_info or add_agent_to_chat for the same agent - once added, use send_message to ask them directly
- Don't create interactions with other agents unless directly related to what the user asked for
- When delivering a response from another agent: Use send_message tool with your complete conversational response. Include: acknowledgment/thanks to the other agent, mention the user with "@" followed by their exact full name (from get_chat_participants), and deliver the information in a conversational, polished way. Example: "Thanks for sharing the weather update, Weather Assistant! @John Smith, it looks like you have a lovely clear day..." Never output text directly - always use send_message tool.
- When acknowledging a user's request: This should be your first action for every user request. Mention them in your response using "@" followed by their exact full name (from get_chat_participants) at the start of your message, and use send_message tool. Do this before asking other agents or gathering information.
- Once you have the information needed, stop calling information-gathering tools and provide your response using send_message tool (never output text directly)

Available agents:
${agentsList}
`;

	return `${basePrompt}\n${agentContext}`;
}

/**
 * Augments system message with current chat room context
 */
export function augmentPromptWithChatContext(basePrompt: string, chatRoom: RoomInfo): string {
	const formattedDate = chatRoom.inserted_at
		? new Date(chatRoom.inserted_at).toLocaleString()
		: 'Unknown';

	const chatContext = `
## CURRENT CHAT ROOM

You are operating in the following chat room:

- **Chat ID**: ${chatRoom.id}
- **Title**: ${chatRoom.title}
- **Type**: ${chatRoom.type}
- **Status**: ${chatRoom.status}
- **Created**: ${formattedDate}
${chatRoom.metadata ? `- **Metadata**: ${JSON.stringify(chatRoom.metadata)}` : ''}
`;

	return `${basePrompt}\n${chatContext}`;
}

/**
 * Augments system message with current chat participants context
 */
export function augmentPromptWithParticipants(
	basePrompt: string,
	participants: ChatParticipant[],
): string {
	if (participants.length === 0) {
		return `${basePrompt}\n\n## CHAT PARTICIPANTS\n\nNo participants in this chat yet.`;
	}

	const participantsList = participants
		.map((participant) => {
			const parts = [
				`- **${participant.name}**`,
				`(ID: ${participant.id})`,
				`- Type: ${participant.type}`,
				`- Role: ${participant.role}`,
			];

			// Add description for agents if available
			if (participant.type === 'Agent' && participant.description) {
				parts.push(`- Description: ${participant.description}`);
			}

			return parts.join(' ');
		})
		.join('\n');

	const participantsContext = `
## CHAT PARTICIPANTS

Current participants in this chat room:

${participantsList}

Use participant IDs when calling tools like remove_participant_from_chat.
`;

	return `${basePrompt}\n${participantsContext}`;
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
