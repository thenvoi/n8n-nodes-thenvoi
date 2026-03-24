import { INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';
import { NODE_PARAMETER_PROPERTIES } from '../constants/nodeProperties';

export const nodeDescription: INodeTypeDescription = {
	displayName: 'Thenvoi AI Agent',
	name: 'thenvoiAgent',
	icon: 'file:../../../dist/nodes/ThenvoiAgent/assets/thenvoi.svg',
	group: ['transform'],
	version: 1,
	description: 'AI Agent with Thenvoi callback streaming - works like n8n AI Agent',
	subtitle: '={{$parameter["chatId"]}}',
	defaults: {
		name: 'Thenvoi AI Agent',
	},
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Agents'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
				},
			],
		},
	},
	inputs: [
		NodeConnectionTypes.Main,
		{
			displayName: 'Model',
			maxConnections: 1,
			type: NodeConnectionTypes.AiLanguageModel,
			required: true,
		},
		{
			displayName: 'Memory',
			maxConnections: 1,
			type: NodeConnectionTypes.AiMemory,
			required: false,
		},
		{
			displayName: 'Tools',
			maxConnections: undefined,
			type: NodeConnectionTypes.AiTool,
			required: false,
		},
	],
	inputNames: ['Main', 'Model', 'Memory', 'Tools'],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'thenvoiApi',
			required: true,
		},
	],
	properties: NODE_PARAMETER_PROPERTIES,
};
