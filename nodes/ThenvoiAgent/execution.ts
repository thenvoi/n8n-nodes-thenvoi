/**
 * Agent Execution
 *
 * Coordinates the execution of AI agents with capability system.
 * Manages the entire lifecycle from setup through execution to cleanup.
 *
 * Pipeline phases:
 * 1. Setup - Retrieve agent components (model, tools, memory)
 * 2. Prepare - Initialize capabilities and callbacks
 * 3. Execute - Run the agent with input
 * 4. Success/Error - Handle outcomes
 * 5. Finalize - Cleanup and final operations
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { AgentNodeConfig, AgentExecutionResult } from './types';
import { AgentComponents, CallbackHandlers } from './types/langchain';
import { getConnectedModel, getConnectedTools, getConnectedMemory } from './utils/nodeConnections';
import { createAgentExecutor } from './factories/agentFactory';
import { executeAgent } from './utils/agents/agentExecutor';
import { CapabilityRegistry, CapabilityContext } from './capabilities';
import { MessagingCapability } from './capabilities/messaging/MessagingCapability';

/**
 * Setup phase - retrieves all connected components
 */
async function setupPhase(
	ctx: IExecuteFunctions,
	config: AgentNodeConfig,
): Promise<AgentComponents> {
	const model = await getConnectedModel(ctx);
	const tools = await getConnectedTools(ctx);
	const memory = await getConnectedMemory(ctx);

	ctx.logger.info('Agent components retrieved', {
		hasModel: !!model,
		toolCount: tools.length,
		hasMemory: !!memory,
	});

	const executor = await createAgentExecutor(ctx, model, tools, memory, config);

	return { model, tools, memory, executor };
}

/**
 * Prepare phase - initializes capabilities and gets callbacks
 */
async function preparePhase(
	registry: CapabilityRegistry,
	capabilityContext: CapabilityContext,
	components: AgentComponents,
): Promise<CallbackHandlers> {
	const setupResults = await registry.executeSetup(capabilityContext);
	await registry.executePrepare(capabilityContext, components.executor);

	const callbacks = setupResults.flatMap((result) => result.callbacks || []);

	capabilityContext.context.logger.info('Capabilities prepared', {
		capabilityCount: registry.getCapabilities().length,
		callbackCount: callbacks.length,
	});

	return callbacks;
}

/**
 * Execute phase - runs the agent with callbacks
 */
async function executePhase(
	executor: AgentComponents['executor'],
	input: string,
	callbacks: CallbackHandlers,
	ctx: IExecuteFunctions,
): Promise<AgentExecutionResult> {
	const result = await executeAgent(executor, input, callbacks, ctx);

	ctx.logger.info('Agent execution completed', {
		outputLength: result.output.length,
		intermediateStepCount: result.intermediateSteps?.length || 0,
	});

	return result;
}

/**
 * Success phase - handles successful execution
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

	registry.register(new MessagingCapability());

	return registry;
}

/**
 * Main execution function - coordinates all phases of agent execution
 * Uses capability system for extensible functionality
 */
export async function runAgent(
	ctx: IExecuteFunctions,
	input: string,
	config: AgentNodeConfig,
	credentials: ThenvoiCredentials,
): Promise<AgentExecutionResult> {
	const registry = createCapabilitiesRegistry(config);

	const capabilityContext: CapabilityContext = {
		context: ctx,
		config,
		credentials,
		input,
	};

	try {
		const components = await setupPhase(ctx, config);
		const callbacks = await preparePhase(registry, capabilityContext, components);
		const result = await executePhase(components.executor, input, callbacks, ctx);

		await successPhase(registry, capabilityContext, result);
		await finalizePhase(registry, capabilityContext);

		return result;
	} catch (error) {
		await errorPhase(registry, capabilityContext, error as Error);
		await finalizePhase(registry, capabilityContext);

		throw error;
	}
}
