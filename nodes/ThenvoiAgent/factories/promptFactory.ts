import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from '@langchain/core/prompts';
import * as fs from 'fs';
import * as path from 'path';
import { MessageHistorySource } from '../constants/nodeProperties';
import { DynamicPromptContext } from '../types';
import { formatDynamicContext } from '../utils/prompting/formatters';
import { PROMPT_SECTIONS, PROMPT_PLACEHOLDERS } from '../constants/promptSections';

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
 * ReAct template
 *
 * Note: Chat history is injected via RECENT_MESSAGES section in system message.
 */
const REACT_TEMPLATE = `{systemMessage}

${REACT_TEMPLATE_BASE}`;

/**
 * Creates a prompt template for tool-calling agents
 *
 * Tool-calling agents use native function calling features of modern LLMs
 * (OpenAI, Claude 3+, Gemini, etc.) for more reliable tool usage.
 *
 * Prompt structure:
 * 1. System message - Defines agent behavior and instructions
 * 2. Human input - Current user message
 * 3. Agent scratchpad - Internal tool calls and reasoning
 *
 * Note: The system message is escaped to handle literal curly braces,
 * as ChatPromptTemplate also parses message content as templates.
 */
export function createToolCallingPrompt(systemMessage: string): ChatPromptTemplate {
	const escapedSystemMessage = escapeTemplateBraces(systemMessage);
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
export function createReactPrompt(systemMessage: string): PromptTemplate {
	const escapedSystemMessage = escapeTemplateBraces(systemMessage);
	const template = REACT_TEMPLATE.replace('{systemMessage}', escapedSystemMessage);

	return PromptTemplate.fromTemplate(template);
}

// Template caching
let cachedTemplate: string | null = null;

/**
 * Loads base template from markdown file
 * Template is single source of truth
 */
function loadBaseTemplate(): string {
	const templatePath = path.join(
		__dirname,
		'../../../docs/n8n/agent-node/prompt/thenvoi_agent_system_prompt_template.md',
	);

	try {
		return fs.readFileSync(templatePath, 'utf-8');
	} catch (error) {
		throw new Error(`Failed to load system prompt template: ${(error as Error).message}`);
	}
}

/**
 * Gets base template with caching for performance
 */
export function getBaseTemplate(): string {
	if (!cachedTemplate) {
		cachedTemplate = loadBaseTemplate();
	}
	return cachedTemplate;
}

/**
 * Helper function to inject optional user content sections
 * Returns empty string if content is not provided
 */
function injectUserContentSection(
	prompt: string,
	placeholder: string,
	header: string,
	content?: string,
): string {
	const injectedContent = content ? `${header}\n\n${content}` : '';
	return prompt.replace(placeholder, injectedContent);
}

/**
 * Injects user customization content with headers
 * Empty sections are skipped entirely (not inserted as empty strings)
 *
 * Headers used:
 * - ## Agent Identity (for role)
 * - ## Agent-Specific Guidelines (for guidelines)
 * - ## Agent-Specific Examples (for examples)
 */
export function injectUserContent(
	template: string,
	agentRole: string,
	agentGuidelines?: string,
	agentExamples?: string,
): string {
	let prompt = template;

	// Inject role with header (required field)
	const roleContent = `${PROMPT_SECTIONS.AGENT_IDENTITY}\n\n${agentRole}`;
	prompt = prompt.replace(PROMPT_PLACEHOLDERS.USER_AGENT_ROLE, roleContent);

	// Inject optional sections
	prompt = injectUserContentSection(
		prompt,
		PROMPT_PLACEHOLDERS.USER_SPECIFIC_GUIDELINES,
		PROMPT_SECTIONS.AGENT_GUIDELINES,
		agentGuidelines,
	);
	prompt = injectUserContentSection(
		prompt,
		PROMPT_PLACEHOLDERS.USER_EXAMPLES,
		PROMPT_SECTIONS.AGENT_EXAMPLES,
		agentExamples,
	);

	return prompt;
}

/**
 * Helper function to replace dynamic context sections
 * Matches section header with placeholder comment and replaces entire section
 */
function replaceDynamicContextSection(
	prompt: string,
	sectionHeader: string,
	content: string,
): string {
	const pattern = new RegExp(`${sectionHeader}\\s+\\[System will inject[^\\]]+\\][^#]*`);
	return prompt.replace(pattern, `${content}\n\n`);
}

/**
 * Injects dynamic context into template
 * Replaces placeholder sections with formatted runtime data
 */
export function injectDynamicContext(
	prompt: string,
	context: DynamicPromptContext,
	messageSource: MessageHistorySource,
): string {
	const formatted = formatDynamicContext(context, messageSource);

	let injected = prompt;

	// Replace dynamic sections
	injected = replaceDynamicContextSection(
		injected,
		PROMPT_SECTIONS.CURRENT_CHAT_ROOM,
		formatted.roomInfo,
	);
	injected = replaceDynamicContextSection(
		injected,
		PROMPT_SECTIONS.CHAT_PARTICIPANTS,
		formatted.participants,
	);
	injected = replaceDynamicContextSection(
		injected,
		PROMPT_SECTIONS.RECENT_MESSAGES,
		formatted.messages,
	);
	injected = replaceDynamicContextSection(
		injected,
		PROMPT_SECTIONS.AVAILABLE_TOOLS,
		formatted.tools,
	);

	return injected;
}
