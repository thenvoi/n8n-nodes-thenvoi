/**
 * Base event data interface that all event data should extend
 */
export interface BaseEventData {
	id: string;
	inserted_at: Date;
	updated_at: Date;
}

export interface RawBaseEventData {
	id: string;
	inserted_at: string;
	updated_at: string;
}

export type EventData<T extends RawBaseEventData> = Omit<T, keyof RawBaseEventData> & BaseEventData;

/**
 * Configuration object for initializing event handlers
 */
export interface EventHandlerConfig {
	userId: string;
}
