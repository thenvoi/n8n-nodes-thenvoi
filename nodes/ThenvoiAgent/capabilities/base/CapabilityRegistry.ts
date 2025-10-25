/**
 * Capability Registry
 *
 * Manages and coordinates agent capabilities. Capabilities are executed
 * sequentially based on their priority (lower priority executes first).
 *
 * Sequential execution ensures:
 * - Proper message ordering
 * - Capability dependencies are respected
 * - Easier debugging and testing
 */

import { Capability, CapabilityContext, SetupResult } from './Capability';
import { AgentExecutor } from 'langchain/agents';

export class CapabilityRegistry {
	private capabilities: Capability[] = [];

	/**
	 * Registers a capability and sorts by priority
	 */
	register(capability: Capability): void {
		this.capabilities.push(capability);
		// Sort by priority (lower executes first)
		this.capabilities.sort((a, b) => a.priority - b.priority);
	}

	getCapabilities(): Capability[] {
		return [...this.capabilities];
	}

	async executeSetup(ctx: CapabilityContext): Promise<SetupResult[]> {
		const results: SetupResult[] = [];

		for (const capability of this.capabilities) {
			if (capability.onSetup) {
				const result = await capability.onSetup(ctx);
				results.push(result);
			}
		}

		return results;
	}

	async executePrepare(ctx: CapabilityContext, executor: AgentExecutor): Promise<void> {
		for (const capability of this.capabilities) {
			if (capability.onPrepare) {
				await capability.onPrepare(ctx, executor);
			}
		}
	}

	/**
	 * Executes success handlers for all capabilities sequentially
	 *
	 * Sequential execution ensures proper message ordering and
	 * allows capabilities to depend on previous capability results
	 */
	async executeSuccess(ctx: CapabilityContext, output: string): Promise<void> {
		for (const capability of this.capabilities) {
			if (capability.onSuccess) {
				await capability.onSuccess(ctx, output);
			}
		}
	}

	async executeError(ctx: CapabilityContext, error: Error): Promise<void> {
		for (const capability of this.capabilities) {
			if (capability.onError) {
				await capability.onError(ctx, error);
			}
		}
	}

	async executeFinalize(ctx: CapabilityContext): Promise<void> {
		for (const capability of this.capabilities) {
			if (capability.onFinalize) {
				await capability.onFinalize(ctx);
			}
		}
	}
}
