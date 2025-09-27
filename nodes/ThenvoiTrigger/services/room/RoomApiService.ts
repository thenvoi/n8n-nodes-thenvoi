import { ThenvoiCredentials, RoomInfo } from '../../types';
import { Logger } from 'n8n-workflow';
import { HttpClient } from '../http/HttpClient';
import { fetchAllRooms } from './roomApiUtils';

/**
 * Main service for room API operations
 * Uses functional approach with utility functions
 */
export class RoomApiService {
	private httpClient: HttpClient;

	constructor(credentials: ThenvoiCredentials, logger: Logger) {
		this.httpClient = new HttpClient(credentials, logger);
	}

	/**
	 * Fetches all rooms with automatic pagination handling
	 */
	async fetchAllRooms(logger: Logger): Promise<RoomInfo[]> {
		return fetchAllRooms(this.httpClient, logger);
	}
}
