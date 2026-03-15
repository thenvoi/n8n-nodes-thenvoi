import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import * as fs from 'fs';
import * as path from 'path';
import { MessageHistorySource } from '../constants/nodeProperties';
import { DynamicPromptContext } from '../types';
import { formatDynamicContext } from '../utils/prompting/formatters';
import { PROMPT_SECTIONS, PROMPT_PLACEHOLDERS } from '../constants/promptSections';

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

// Template caching
let cachedTemplate: string | null = null;

/**
 * Loads base template from markdown file
 * Template is single source of truth
 */
function loadBaseTemplate(): string {
	const templatePath = path.join(
		__dirname,
		'../../../templates/agent/thenvoi_agent_system_prompt_template.md',
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
