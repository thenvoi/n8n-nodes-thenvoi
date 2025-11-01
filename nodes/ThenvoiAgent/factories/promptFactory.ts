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
 */
export function createToolCallingPrompt(
	systemMessage: string,
	hasMemory: boolean,
): ChatPromptTemplate {
	if (hasMemory) {
		return ChatPromptTemplate.fromMessages([
			['system', systemMessage],
			new MessagesPlaceholder('chat_history'),
			['human', '{input}'],
			new MessagesPlaceholder('agent_scratchpad'),
		]);
	}

	return ChatPromptTemplate.fromMessages([
		['system', systemMessage],
		['human', '{input}'],
		new MessagesPlaceholder('agent_scratchpad'),
	]);
}

/**
 * Creates a prompt template for ReAct agents
 *
 * ReAct agents use prompt-based tool selection for models without
 * native function calling. The agent follows a "Thought-Action-Observation"
 * loop until it reaches a final answer.
 */
export function createReactPrompt(systemMessage: string, hasMemory: boolean): PromptTemplate {
	const template = hasMemory
		? REACT_TEMPLATE_WITH_MEMORY.replace('{systemMessage}', systemMessage)
		: REACT_TEMPLATE_WITHOUT_MEMORY.replace('{systemMessage}', systemMessage);

	return PromptTemplate.fromTemplate(template);
}

/**
 * Augments system message with mention guidelines for all participants
 */
export function addMentionGuidelines(basePrompt: string): string {
	const mentionGuidelines = `
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
`;

	return `${basePrompt}\n${mentionGuidelines}`;
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

When you need specialized expertise, directly add and use agents without asking the user for permission. Use the add_agent_to_chat tool to bring them in, then immediately use them to fulfill the user's request. If you don't have all the information you need to ask them a question, add the agent but ask the user to provide the missing information before using the agent.

IMPORTANT:
- Do NOT ask the user if you should add an agent - just add it if needed
- Do NOT explain to the user how to interact with agents
- Do NOT tell the user they can ask the agent - instead, add the agent and use it yourself to answer the user's question
- After adding an agent, directly use it to get the information needed and provide the answer to the user unless you need to ask the user for more information before using the agent.

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
