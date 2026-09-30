import { json } from '@sveltejs/kit';
import path from 'path';

export const DATA_DIR = path.resolve(process.cwd(), '..', 'data');

/** Max accepted request body size for model writes (POST + PUT). */
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

export function safeFilePath(id: string): string | null {
	if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) return null;
	const filePath = path.join(DATA_DIR, `${id}.json`);
	if (!path.resolve(filePath).startsWith(path.resolve(DATA_DIR))) return null;
	return filePath;
}

/**
 * Read a request body as text with a hard size cap. Returns either the parsed
 * JSON value or a `Response` to send back.
 *
 * `Content-Length` is client-supplied and chunked requests report `0`, so the
 * cap is enforced on the body actually read. Same helper as the IPC app.
 */
export async function readJsonBody(
	request: Request
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) {
		return { ok: false, response: json({ error: 'Payload too large' }, { status: 413 }) };
	}
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false, response: json({ error: 'Invalid JSON' }, { status: 400 }) };
	}
}

/** Top-level lists a Concept Model may carry. Each must be an array when present. */
const LIST_FIELDS = [
	'relationships',
	'coreBusinessEvents',
	'coreBusinessProcesses',
	'domains',
	'participants',
	'stories',
	'businessQuestions',
	'walks',
	'parked'
];

/**
 * Server-side trust boundary for incoming model writes. Only the top-level
 * shape is checked. The client migrates and repairs everything below it.
 */
export function isValidModel(data: unknown): data is { id: string; name: string; concepts: unknown[]; [key: string]: unknown } {
	if (typeof data !== 'object' || data === null) return false;
	const obj = data as Record<string, unknown>;
	if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
	if (typeof obj.name !== 'string') return false;
	if (!Array.isArray(obj.concepts)) return false;
	return LIST_FIELDS.every((field) => obj[field] === undefined || Array.isArray(obj[field]));
}
