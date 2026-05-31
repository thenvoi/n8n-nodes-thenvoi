/**
 * Memory Configuration
 *
 * Handles memory setup and configuration for LangChain compatibility.
 * Provides utilities to:
 * - Configure LangChain memory with required input/output keys
 * - Wrap base memory with BandMemory for enhanced functionality
 * - Set sender information for message attribution
 *
 * Main exports:
 * - setupMemory: Entry point for memory initialization based on node configuration
 * - configureMemory: Wraps base memory with BandMemory
 * - configureMemorySenderInfo: Sets sender info for message attribution in memory
 *
 * Works with BandMemory to enable:
 * - Structured data storage (thoughts, tool calls, messages)
 * - Sender attribution for display in prompts
 */

import { IExecuteFunctions, Logger, NodeOperationError } from 'n8n-workflow';
import { BaseMemory, BaseChatMemory } from 'langchain/memory';
import { ChatParticipant } from '@lib/types';
import { BandMemory } from '../memory/BandMemory';
import { MessageHistorySource } from '../constants/nodeProperties';
import { getConnectedMemory } from '../utils/nodeConnections';
import { lookupParticipantName } from '../utils/participants';
import { AgentNodeConfig } from '../types';

/**
 * Type guard to check if memory has configurable inputKey and outputKey
 */
interface MemoryWithKeys {
	inputKey?: string;
	outputKey?: string;
}

function hasConfigurableKeys(memory: BaseMemory): memory is BaseMemory & MemoryWithKeys {
	return 'inputKey' in memory || 'outputKey' in memory;
}

/**
 * Configures base memory (inputKey/outputKey) and wraps with BandMemory
 *
 * LangChain memory requires explicit key configuration:
 * - inputKey: field name for storing user input
 * - outputKey: field name for storing agent output
 *
 * The configured memory is then wrapped with BandMemory for future extensibility.
 */
export function configureMemory(
	memory: BaseMemory | undefined,
	ctx: IExecuteFunctions,
): BandMemory | undefined {
	if (!memory) {
		ctx.logger.info('No memory connected');
		return undefined;
	}

	// Configure base memory first (critical for LangChain compatibility)
	if (hasConfigurableKeys(memory)) {
		memory.inputKey ??= 'input';
		memory.outputKey ??= 'output';
	}

	// Wrap configured memory with BandMemory
	const bandMemory = new BandMemory({
		baseMemory: memory as BaseChatMemory,
	});

	ctx.logger.info('Memory configured and wrapped', {
		memoryType: memory.constructor.name,
		memoryKeys: bandMemory.memoryKeys,
	});

	return bandMemory;
}

/**
 * Fetches and validates connected memory node
 * Throws error if memory is required but not connected
 */
async function getAndValidateMemory(
	execution: IExecuteFunctions,
	required: boolean,
): Promise<BaseMemory | undefined> {
	const memory = await getConnectedMemory(execution);

	if (required && !memory) {
		throw new NodeOperationError(
			execution.getNode(),
			'Message history source is set to "From Memory" but no memory node is connected. Please connect a memory node or change history source to "From API".',
		);
	}

	return memory;
}

/**
 * Sets up memory based on message history source configuration
 * Validates that memory is connected if required
 */
export async function setupMemory(
	execution: IExecuteFunctions,
	messageHistorySource: MessageHistorySource,
): Promise<BandMemory | undefined> {
	const required = messageHistorySource === 'memory';
	const rawMemory = await getAndValidateMemory(execution, required);

	return rawMemory ? configureMemory(rawMemory, execution) : undefined;
}

/**
 * Configures sender information on memory for message attribution
 *
 * Looks up the sender's name from participants and sets the complete
 * sender info on memory. This allows formatters to display actual
 * sender names instead of generic labels.
 *
 * @param memory - BandMemory instance to configure
 * @param config - Agent node configuration containing sender ID and type
 * @param participants - Array of chat participants for name lookup
 * @param logger - Logger for diagnostic output
 */
export function configureMemorySenderInfo(
	memory: BandMemory,
	config: AgentNodeConfig,
	participants: ChatParticipant[],
	logger: Logger,
): void {
	const senderName = lookupParticipantName(config.senderId, participants);

	logger.info('Setting sender info on memory', {
		senderId: config.senderId,
		senderName,
		senderType: config.senderType,
	});

	memory.setSenderInfo({
		sender_id: config.senderId,
		sender_name: senderName,
		sender_type: config.senderType,
	});
}
