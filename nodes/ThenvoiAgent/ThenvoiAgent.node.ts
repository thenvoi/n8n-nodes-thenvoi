import { IExecuteFunctions, INodeExecutionData, INodeType, NodeOperationError } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { nodeDescription } from './config/nodeConfig';
import { getAgentConfig, validateAgentInput } from './utils';
import { runAgent } from './execution';

/**
 * Thenvoi AI Agent Node
 *
 * Full AI Agent implementation with LangChain callback streaming to Thenvoi.
 *
 * Features:
 * - AI Language Model connections (OpenAI, Anthropic, Gemini, etc.)
 * - AI Tool connections (multiple tools supported)
 * - AI Memory connections (conversation memory)
 * - Real-time streaming of agent activity to Thenvoi chat
 * - Tool calls, tool results, thoughts, and final responses
 * - Configurable agent behavior (max iterations, prompt, etc.)
 * - Extensible capability system for adding new features
 */
export class ThenvoiAgent implements INodeType {
	description = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = (await this.getCredentials('thenvoiApi')) as ThenvoiCredentials;
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (const [index, item] of items.entries()) {
			try {
				const config = getAgentConfig(this, index);
				const inputText = validateAgentInput(item.json);

				if (!inputText || inputText.trim().length === 0) {
					throw new NodeOperationError(this.getNode(), 'Agent received empty input', {
						itemIndex: index,
					});
				}

				this.logger.info('Starting agent execution', {
					itemIndex: index,
					chatId: config.chatId,
					inputLength: inputText.length,
					messageTypes: config.messageTypes,
					maxIterations: config.maxIterations,
				});

				const result = await runAgent(this, inputText, config, credentials);

				this.logger.info('Agent execution completed successfully', {
					itemIndex: index,
					outputLength: result.output.length,
					hasIntermediateSteps: !!result.intermediateSteps,
				});

				const outputData: INodeExecutionData = {
					json: {
						input: inputText,
						output: result.output,
						chatId: config.chatId,
						...(config.returnIntermediateSteps && result.intermediateSteps
							? { intermediateSteps: result.intermediateSteps }
							: {}),
						metadata: {
							maxIterations: config.maxIterations,
							messageTypes: config.messageTypes,
						},
					},
					pairedItem: { item: index },
				};

				returnData.push(outputData);
			} catch (error) {
				const errorMessage = (error as Error).message || 'Unknown error occurred';

				this.logger.error('Agent execution failed', {
					itemIndex: index,
					error: errorMessage,
				});

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: errorMessage,
							success: false,
						},
						pairedItem: { item: index },
					});
				} else {
					throw new NodeOperationError(this.getNode(), `Agent execution failed: ${errorMessage}`, {
						itemIndex: index,
					});
				}
			}
		}

		return [returnData];
	}
}
