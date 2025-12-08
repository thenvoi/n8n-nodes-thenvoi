/**
 * Agent Execution
 *
 * Coordinates the execution of AI agents with capability system.
 * Manages the entire lifecycle from setup through execution to cleanup.
 *
 * Pipeline phases:
 * 1. Initialize Capabilities - Setup capabilities to get tools and metadata
 * 2. Setup - Retrieve agent components and create executor with all tools
 * 3. Prepare - Finalize capabilities and get callbacks
 * 4. Execute - Run the agent with input
 * 5. Success/Error - Handle outcomes
 * 6. Finalize - Cleanup and final operations
 */

import { StructuredTool } from '@langchain/core/tools';
import { fetchChatParticipants, fetchChatRoom } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { ThenvoiCredentials } from '@lib/types';
import { IExecuteFunctions } from 'n8n-workflow';
import { CapabilityContext, CapabilityRegistry, SetupResult } from './capabilities';
import { AgentCollaborationCapability } from './capabilities/collaboration/AgentCollaborationCapability';
import { MessagingCapability } from './capabilities/messaging/MessagingCapability';
import { createAgentExecutor } from './factories/agentFactory';
import { setupMemory } from './factories/memoryConfig';
import { ThenvoiAgentCallbackHandler } from './handlers/callbacks';
import { ThenvoiMemory } from './memory/ThenvoiMemory';
import { AgentExecutionResult, AgentNodeConfig, DynamicPromptContext } from './types';
import { AgentComponents, CallbackHandlers } from './types/langchain';
import { executeAgent } from './utils/agents/agentExecutor';
import { updateMessageProcessingStatus } from './utils/messages';
import { getRecentMessages } from './utils/messages/messageHistory';
import { buildToolNameRegistry } from './utils/messages/toolFormatters';
import { getConnectedModel, getConnectedTools } from './utils/nodeConnections';

/**
 * Initialize capabilities phase - runs capability setup to get tools and metadata
 *
 * This phase executes the setup lifecycle method for all registered capabilities,
 * collecting tools and metadata that will be used in subsequent phases.
 * Capabilities are executed in priority order (lower priority values first).
 *
 * @param registry - Capability registry with registered capabilities
 * @param capabilityContext - Execution context for capabilities
 * @returns Setup results from all capabilities and extracted capability tools
 */
async function initializeCapabilitiesPhase(
	registry: CapabilityRegistry,
	capabilityContext: CapabilityContext,
): Promise<{ setupResults: SetupResult[]; capabilityTools: StructuredTool[] }> {
	const setupResults = await registry.executeSetup(capabilityContext);
	const capabilityTools = setupResults.flatMap((result) => result.tools || []);

	capabilityContext.execution.logger.info('Capabilities initialized', {
		capabilityCount: registry.getCapabilities().length,
		capabilityToolCount: capabilityTools.length,
	});

	return { setupResults, capabilityTools };
}

/**
 * Setup phase - retrieves all connected components and creates executor
 *
 * Retrieves model, tools, and memory from node connections, combines them with
 * capability-provided tools, and creates the agent executor. Also fetches
 * dynamic context data for prompt injection.
 *
 * @param ctx - n8n execution context
 * @param config - Agent node configuration
 * @param capabilityTools - Tools provided by capabilities
 * @param setupResults - Setup results from capabilities
 * @param httpClient - HTTP client for API requests
 * @param memory - Configured memory instance
 * @returns Agent components and dynamic context
 */
async function setupPhase(
	ctx: IExecuteFunctions,
	config: AgentNodeConfig,
	capabilityTools: StructuredTool[],
	setupResults: SetupResult[],
	httpClient: HttpClient,
	memory: ThenvoiMemory | undefined,
	credentials: ThenvoiCredentials,
): Promise<{ components: AgentComponents; dynamicContext: DynamicPromptContext }> {
	const model = await getConnectedModel(ctx);
	const connectedTools = await getConnectedTools(ctx);
	const allTools = [...connectedTools, ...capabilityTools];

	// Fetch dynamic context data
	const roomInfo = await fetchChatRoom(httpClient, config.chatId);
	const participants = await fetchChatParticipants(httpClient, config.chatId);
	const recentMessages = await getRecentMessages(config, memory, httpClient, ctx);

	ctx.logger.info('Dynamic context fetched', {
		participantsCount: participants.length,
	});

	const dynamicContext: DynamicPromptContext = {
		roomInfo,
		participants,
		recentMessages,
		tools: allTools,
	};

	ctx.logger.info('Agent components and context retrieved', {
		hasModel: !!model,
		totalToolCount: allTools.length,
		hasMemory: !!memory,
		participantsCount: participants.length,
		recentMessagesCount: recentMessages.length,
		historySource: config.messageHistorySource,
	});

	const executor = await createAgentExecutor(ctx, model, allTools, memory, config, dynamicContext);

	return {
		components: { model, tools: allTools, memory, executor },
		dynamicContext,
	};
}

/**
 * Configures tool name registry on callback handlers
 *
 * Builds a registry mapping tool class names to their declared names from
 * actual tool instances, then sets it on callback handlers that support it.
 * This enables correct tool name extraction from serialized tool objects.
 *
 * @param tools - Array of tool instances to build registry from
 * @param callbacks - Callback handlers to configure
 * @returns The built tool name registry
 */
function configureToolNameRegistry(
	tools: StructuredTool[],
	callbacks: CallbackHandlers,
): ReturnType<typeof buildToolNameRegistry> {
	const toolNameRegistry = buildToolNameRegistry(tools);

	for (const callback of callbacks) {
		if (callback instanceof ThenvoiAgentCallbackHandler) {
			callback.setToolNameRegistry(toolNameRegistry);
		}
	}

	return toolNameRegistry;
}

/**
 * Prepare phase - finalizes capabilities and gets callbacks
 *
 * Executes the prepare lifecycle method for all capabilities, allowing them
 * to inspect or modify the executor. Then collects all callback handlers
 * that will be used during agent execution.
 *
 * @param registry - Capability registry
 * @param capabilityContext - Execution context for capabilities
 * @param components - Agent components including the executor
 * @param setupResults - Setup results containing callbacks
 * @returns Collected callback handlers from all capabilities
 */
async function preparePhase(
	registry: CapabilityRegistry,
	capabilityContext: CapabilityContext,
	components: AgentComponents,
	setupResults: SetupResult[],
): Promise<CallbackHandlers> {
	await registry.executePrepare(capabilityContext, components.executor);

	const callbacks = setupResults.flatMap((result) => result.callbacks || []);

	const toolNameRegistry = configureToolNameRegistry(components.tools, callbacks);

	capabilityContext.execution.logger.info('Capabilities prepared', {
		callbackCount: callbacks.length,
		toolRegistrySize: toolNameRegistry.size,
	});

	return callbacks;
}

/**
 * Execute phase - runs the agent with callbacks
 *
 * Executes the agent with the provided input and callback handlers.
 * Callbacks enable real-time streaming of agent activity (thoughts, tool calls, etc.).
 *
 * @param executor - The agent executor to run
 * @param input - User input for the agent
 * @param callbacks - Callback handlers for streaming events
 * @param ctx - n8n execution context for logging
 * @returns Agent execution result with output and intermediate steps
 */
async function executePhase(
	executor: AgentComponents['executor'],
	input: string,
	callbacks: CallbackHandlers,
	ctx: IExecuteFunctions,
): Promise<AgentExecutionResult> {
	const result = await executeAgent(executor, input, callbacks, ctx);

	return result;
}

/**
 * Success phase - handles successful execution
 *
 * Executes the success lifecycle method for all capabilities, allowing them
 * to handle the successful result (e.g., send final response, update status).
 *
 * @param registry - Capability registry
 * @param capabilityContext - Execution context for capabilities
 * @param result - Successful execution result
 */
async function successPhase(
	registry: CapabilityRegistry,
	capabilityContext: CapabilityContext,
	result: AgentExecutionResult,
): Promise<void> {
	await registry.executeSuccess(capabilityContext, result.output);
}

/**
 * Error phase - handles execution failure
 *
 * Executes the error lifecycle method for all capabilities, allowing them
 * to handle errors appropriately (e.g., send error notifications, cleanup).
 *
 * @param registry - Capability registry
 * @param capabilityContext - Execution context for capabilities
 * @param error - The error that occurred
 */
async function errorPhase(
	registry: CapabilityRegistry,
	capabilityContext: CapabilityContext,
	error: Error,
): Promise<void> {
	await registry.executeError(capabilityContext, error);
}

/**
 * Finalize phase - cleanup and final operations
 *
 * Executes the finalize lifecycle method for all capabilities, allowing them
 * to perform cleanup operations (e.g., wait for pending messages, release resources).
 * This phase runs regardless of success or failure.
 *
 * @param registry - Capability registry
 * @param capabilityContext - Execution context for capabilities
 */
async function finalizePhase(
	registry: CapabilityRegistry,
	capabilityContext: CapabilityContext,
): Promise<void> {
	await registry.executeFinalize(capabilityContext);
}

/**
 * Creates and configures the capability registry with enabled capabilities
 */
function createCapabilitiesRegistry(config: AgentNodeConfig): CapabilityRegistry {
	const registry = new CapabilityRegistry();

	registry.register(new AgentCollaborationCapability());
	registry.register(new MessagingCapability());

	return registry;
}

/**
 * Configures memory on callback handlers that support it
 *
 * Iterates through callbacks and sets the memory instance on handlers
 * that implement the MemoryAwareCallback interface. This allows handlers
 * to capture intermediate steps during agent execution.
 *
 * @param memory - ThenvoiMemory instance to inject
 * @param callbacks - Array of callback handlers
 */
function configureMemoryOnCallbacks(memory: ThenvoiMemory, callbacks: CallbackHandlers): void {
	for (const callback of callbacks) {
		if (callback instanceof ThenvoiAgentCallbackHandler) {
			callback.setMemory(memory);
		}
	}
}

/**
 * Main execution function - coordinates all phases of agent execution
 * Uses capability system for extensible functionality
 */
export async function runAgent(
	execution: IExecuteFunctions,
	input: string,
	config: AgentNodeConfig,
	credentials: ThenvoiCredentials,
): Promise<AgentExecutionResult> {
	const httpClient = new HttpClient(credentials, execution.logger);
	await updateMessageProcessingStatus(
		httpClient,
		execution.logger,
		config.chatId,
		config.messageId,
	);

	// Setup memory based on configuration
	const memory = await setupMemory(execution, config.messageHistorySource);

	const registry = createCapabilitiesRegistry(config);

	const capabilityContext: CapabilityContext = {
		execution,
		config,
		credentials,
		input,
		messageId: config.messageId,
		httpClient,
		registry,
	};

	try {
		const { setupResults, capabilityTools } = await initializeCapabilitiesPhase(
			registry,
			capabilityContext,
		);

		const { components } = await setupPhase(
			execution,
			config,
			capabilityTools,
			setupResults,
			httpClient,
			memory,
			credentials,
		);

		const callbacks = await preparePhase(registry, capabilityContext, components, setupResults);

		if (components.memory) {
			configureMemoryOnCallbacks(components.memory, callbacks);
		}

		const result = await executePhase(components.executor, input, callbacks, execution);

		await successPhase(registry, capabilityContext, result);
		await finalizePhase(registry, capabilityContext);

		return result;
	} catch (error) {
		await errorPhase(registry, capabilityContext, error as Error);
		await finalizePhase(registry, capabilityContext);

		throw error;
	}
}
