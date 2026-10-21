import { BandApiError } from '../types/errors';
import { getErrorMessage } from './errors';

/** Credential policy for authentication and connection diagnostics. */
export class ConnectionDiagnostics {
	private readonly secrets: RegExp[];

	constructor(apiKey: string) {
		this.secrets = [
			...new Set([
				apiKey,
				encodeURIComponent(apiKey),
				encodeURI(apiKey),
				new URLSearchParams({ key: apiKey }).toString().slice(4),
			]),
		]
			.filter(Boolean)
			.sort((a, b) => b.length - a.length)
			.map(
				(secret) =>
					new RegExp(
						secret
							.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
							.replace(/%[a-f\d]{2}/gi, (escape) =>
								escape.replace(/[a-f]/gi, (hex) => `[${hex.toLowerCase()}${hex.toUpperCase()}]`),
							),
						'g',
					),
			);
	}

	text(value: string): string {
		let safe = value;
		for (let pass = 0; pass < 3; pass++) {
			for (const secret of this.secrets) {
				safe = safe.replace(secret, '[REDACTED]');
			}
			if (pass === 2) break;
			try {
				safe = decodeURIComponent(safe);
			} catch {
				break;
			}
		}
		safe = safe.replace(
			/((?:api_key|token|x-api-key|authorization|cookie)["']?\s*[=:]\s*["']?)(?:(?:Bearer|Basic)\s+)?[^\s&,;"'<>]+/gi,
			'$1[REDACTED]',
		);
		return safe;
	}

	error(value: BandApiError): BandApiError;
	error(value: unknown): Error;
	error(value: unknown): Error {
		const message = this.text(getErrorMessage(value));
		if (value instanceof BandApiError) {
			return new BandApiError(message, value.status);
		}
		return new Error(message);
	}
}
