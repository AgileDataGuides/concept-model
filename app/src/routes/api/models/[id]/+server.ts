import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, safeFilePath, isValidModel, readJsonBody } from '../utils';

export const GET: RequestHandler = async ({ params }) => {
	const filePath = safeFilePath(params.id);
	if (!filePath) {
		return json({ error: 'Invalid id' }, { status: 400 });
	}
	if (!fs.existsSync(filePath)) {
		return json({ error: 'Not found' }, { status: 404 });
	}
	const raw = fs.readFileSync(filePath, 'utf-8');
	try {
		return json(JSON.parse(raw));
	} catch {
		return json({ error: 'Corrupted model file' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const filePath = safeFilePath(params.id);
	if (!filePath) {
		return json({ error: 'Invalid id' }, { status: 400 });
	}

	const body = await readJsonBody(request);
	if (!body.ok) return body.response;
	const model = body.value;
	if (!isValidModel(model)) {
		return json({ error: 'Invalid model data' }, { status: 400 });
	}

	// The file name is the id. Force the saved id to match the URL so the two
	// can never drift apart (a drifted id makes the next save write a second file).
	model.id = params.id;

	fs.writeFileSync(filePath, JSON.stringify(model, null, 2));
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const filePath = safeFilePath(params.id);
	if (!filePath) {
		return json({ error: 'Invalid id' }, { status: 400 });
	}
	if (fs.existsSync(filePath)) {
		const archivePath = path.join(DATA_DIR, `.deleted-${Date.now()}-${params.id}.json`);
		fs.renameSync(filePath, archivePath);
	}
	return json({ ok: true });
};
