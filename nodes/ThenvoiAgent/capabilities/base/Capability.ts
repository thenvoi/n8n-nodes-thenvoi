import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { AgentNodeConfig } from '../../types';
import { AgentExecutor } from 'langchain/agents';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { StructuredTool } from '@langchain/core/tools';
import type { CapabilityRegistry } from './CapabilityRegistry';

/**
 * Priority levels for capability execution order
 * Lower values execute first (0-100 range)
 */
export enum CapabilityPriority {
	CRITICAL = 0, // Must run first (e.g., auth, setup)
	HIGH = 25, // Important but not critical
	NORMAL = 50, // Default priority
	LOW = 75, // Can run later
	CLEANUP = 100, // Should run last
}

/**
 * Execution context passed to capabilities
 * Provides access to execution functions and capability-specific properties
 */
export interface CapabilityContext {
	execution: IExecuteFunctions;
	config: AgentNodeConfig;
	credentials: ThenvoiCredentials;
	input: string;
	registry?: CapabilityRegistry; // Reference to CapabilityRegistry for cross-capability access
}

/**
 * Result from setup phase
 *
 * Capabilities return tools, callbacks, and metadata from their setup phase.
 * Metadata is used to pass data from capabilities to the execution orchestrator
 * that doesn't fit into tools or callbacks (e.g., availableAgents for prompt augmentation).
 */
export interface SetupResult {
	callbacks?: BaseCallbackHandler[];
	tools?: StructuredTool[];
	metadata?: Record<string, unknown>;
}

/**
 * Base interface for agent capabilities
 *
 * Capabilities extend agent functionality in a modular way.
 * They can hook into different phases of agent execution through
 * lifecycle methods.
 *
 * Capabilities are executed sequentially based on their priority.
 * Lower priority values execute first.
 */
export interface Capability {
	/** Unique capability name */
	readonly name: string;

	/** Execution priority (lower executes first) */
	readonly priority: CapabilityPriority;

	/**
	 * Called before agent execution starts
	 * Setup any resources, create callbacks, etc.
	 */
	onSetup?(ctx: CapabilityContext): Promise<SetupResult>;

	/**
	 * Called after agent executor is created
	 * Can inspect or modify the executor
	 */
	onPrepare?(ctx: CapabilityContext, executor: AgentExecutor): Promise<void>;

	/**
	 * Called after agent execution completes successfully
	 * Handle results, send responses, etc.
	 */
	onSuccess?(ctx: CapabilityContext, output: string): Promise<void>;

	/**
	 * Called if agent execution fails
	 * Handle errors, send notifications, etc.
	 */
	onError?(ctx: CapabilityContext, error: Error): Promise<void>;

	/**
	 * Called after everything completes (success or error)
	 * Cleanup resources, finalize operations, etc.
	 */
	onFinalize?(ctx: CapabilityContext): Promise<void>;
}
