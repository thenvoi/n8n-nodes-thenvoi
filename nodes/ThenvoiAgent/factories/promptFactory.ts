import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { augmentPromptForModelThoughts } from '../utils/thoughts/thoughtExtraction';

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
 * Augments a system message with model thought instructions if needed
 */
export function prepareSystemMessage(basePrompt: string, useModelThoughts: boolean): string {
	return useModelThoughts ? augmentPromptForModelThoughts(basePrompt) : basePrompt;
}
