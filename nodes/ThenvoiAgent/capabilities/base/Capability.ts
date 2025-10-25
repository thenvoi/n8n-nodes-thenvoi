import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { AgentNodeConfig } from '../../types';
import { AgentExecutor } from 'langchain/agents';

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
 */
export interface CapabilityContext {
	context: IExecuteFunctions;
	config: AgentNodeConfig;
	credentials: ThenvoiCredentials;
	input: string;
}

/**
 * Result from setup phase
 */
export interface SetupResult {
	callbacks?: any[];
	metadata?: Record<string, any>;
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
