/**
 * Markdown section headers used in system prompts
 * Single source of truth for all prompt section identifiers
 */
export const PROMPT_SECTIONS = {
	CURRENT_CHAT_ROOM: '### CURRENT CHAT ROOM',
	CHAT_PARTICIPANTS: '### CHAT PARTICIPANTS',
	RECENT_MESSAGES: '### RECENT MESSAGES',
	AVAILABLE_TOOLS: '### AVAILABLE TOOLS',
	AGENT_IDENTITY: '## Agent Identity',
	AGENT_GUIDELINES: '## Agent-Specific Guidelines',
	AGENT_EXAMPLES: '## Agent-Specific Examples',
} as const;

/**
 * Template placeholders used in system prompts
 * Single source of truth for all prompt placeholder identifiers
 */
export const PROMPT_PLACEHOLDERS = {
	USER_AGENT_ROLE: '{{USER_AGENT_ROLE}}',
	USER_SPECIFIC_GUIDELINES: '{{USER_SPECIFIC_GUIDELINES}}',
	USER_EXAMPLES: '{{USER_EXAMPLES}}',
} as const;
