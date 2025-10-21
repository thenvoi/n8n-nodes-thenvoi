import { ChatMessageType } from '@lib/types';

/**
 * Configuration for sending a message to Thenvoi
 */
export type MessageConfig = {
	chatId: string;
	content: string;
	messageType: ChatMessageType;
};
