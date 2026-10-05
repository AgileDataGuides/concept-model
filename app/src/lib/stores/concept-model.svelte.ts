import type { ConceptModel, Concept, ConceptRelationship, CoreBusinessEvent, CoreBusinessProcess, Domain, BusinessQuestion } from '$lib/types';
import { MODEL_VERSION } from '$lib/types';
import { migrateModel } from '$lib/model/migrate';
import { parkedIdForWalk } from '$lib/model/graph-actions';
import { hasBothEnds, relationshipSentences, relationshipTriple, ruleToCardinality } from '$lib/model/rules';
import {
	DEFINITION_STATUSES,
	NOT_WALKED_LABEL,
	PARKED_KINDS,
	PARKED_LIST_NAME,
	PARTICIPANT_ROLES,
	SCOPE_SLICES,
	SEVEN_WS,
	STORY_KINDS,
	WALK_RESOLUTIONS,
	WALK_RESULTS
} from '$lib/canon/steps';
import { buildXlsxBlob, downloadXlsx, type SheetSpec } from '$lib/cp-shared-xlsx';

function stripDateTimeSuffix(name: string): string {
	return name.replace(/-\d{4}-\d{2}-\d{2}-\d{6}$/, '');
}

function createId(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concept';
}

function uniqueId(name: string, existing: string[]): string {
	let base = createId(name);
	if (!existing.includes(base)) return base;
	let i = 2;
	while (existing.includes(`${base}-${i}`)) i++;
	return `${base}-${i}`;
}

/** Copies each key of `updates` onto `target`. An `undefined` value clears the key. */
function assign<T extends object>(target: T, updates: Partial<T>) {
	for (const key of Object.keys(updates) as (keyof T)[]) {
		const value = updates[key];
		if (value === undefined) delete target[key];
		else target[key] = value as T[keyof T];
	}
}

function emptyModel(id: string, name: string): ConceptModel {
	return {
		version: MODEL_VERSION, id, name, description: '',
		concepts: [], relationships: [],
		coreBusinessEvents: [], coreBusinessProcesses: [],
		domains: []
	};
}

/** Fallback when there are no saved models at all. The full SaaS example lives in `data/`. */
function makeExampleModel(): ConceptModel {
	return {
		...emptyModel('example-concept-model', 'Example Concept Model'),
		description: 'A small example Concept Model',
		concepts: [
			{ id: 'customer', name: 'Customer', description: 'A person or organisation that pays for at least one Subscription', aliases: ['Client'], domainId: 'sales' },
			{ id: 'subscription', name: 'Subscription', description: "A Customer's agreement to pay for a Plan, period by period", aliases: [], domainId: 'sales' },
			{ id: 'plan', name: 'Plan', description: 'A priced package of the product that a Customer can subscribe to', aliases: ['Tier'], domainId: 'sales' }
		],
		relationships: [
			{
				id: 'customer-subscribes-to-subscription', sourceConceptId: 'customer', targetConceptId: 'subscription',
				label: 'subscribes to', inverseLabel: 'is held by',
				rule: { forward: { min: 'one', max: 'many' }, inverse: { min: 'one', max: 'one' } },
				cardinality: '1 : 1..*'
			},
			{
				id: 'subscription-is-on-plan', sourceConceptId: 'subscription', targetConceptId: 'plan',
				label: 'is on', inverseLabel: 'is taken up by',
				rule: { forward: { min: 'one', max: 'one' }, inverse: { min: 'zero', max: 'many' } },
				cardinality: '0..* : 1'
			}
		],
		coreBusinessEvents: [
			{ id: 'customer-subscribes-to-a-paid-plan', name: 'Customer Subscribes to a Paid Plan', description: '', conceptIds: ['customer', 'subscription', 'plan'] }
		],
		domains: [
			{ id: 'sales', name: 'Sales', description: 'Winning and keeping paying Customers' }
		]
	};
}

// --- Demo mode (GitHub Pages static build) ---
// When the SvelteKit app is built with `DEMO_BUILD=true VITE_DEMO_MODE=true`
// (the `pnpm build:demo` script), all persistence flips to localStorage. The
// SvelteKit `+server.ts` API routes don't exist on a static GitHub Pages
// deployment, so the default API helpers below shim them. Normal dev /
// standalone install keeps using the API routes against `../data/`, and
// callers that pass their own persistence callbacks are never affected.
const DEMO_MODE =
	typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_DEMO_MODE?: string } }).env?.VITE_DEMO_MODE === 'true';
const LS_KEY = 'concept-model-demo-models';

function lsGetAll(): Record<string, ConceptModel> {
	try {
		const raw = localStorage.getItem(LS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function lsSaveAll(models: Record<string, ConceptModel>): void {
	localStorage.setItem(LS_KEY, JSON.stringify(models));
}

/** An error status from the API is a failure, never a quiet success. */
function ensureOk(res: Response, what: string): Response {
	if (!res.ok) throw new Error(`${what} failed with HTTP ${res.status}`);
	return res;
}

/** Thrown when unsaved edits could not be saved, so a switch, new model or import did not happen. */
export class UnsavedChangesError extends Error {
	constructor() {
		super('Your changes could not be saved, so this model stays open. Save it, then try again.');
		this.name = 'UnsavedChangesError';
	}
}

export interface ConceptModelStoreOptions {
	listModels?: () => Promise<ConceptModel[]>;
	saveModel?: (m: ConceptModel) => Promise<void>;
	createModel?: (m: ConceptModel) => Promise<void>;
	deleteModel?: (id: string) => Promise<void>;
	loadModel?: (id: string) => Promise<ConceptModel>;
}

export function createConceptModelStore(options: ConceptModelStoreOptions = {}) {
	const apiListModels = options.listModels ?? (async (): Promise<ConceptModel[]> => {
		if (DEMO_MODE) return Object.values(lsGetAll());
		const res = await fetch('/api/models');
		return res.json();
	});

	const apiSaveModel = options.saveModel ?? (async (m: ConceptModel): Promise<void> => {
		if (DEMO_MODE) {
			const all = lsGetAll();
			all[m.id] = m;
			lsSaveAll(all);
			return;
		}
		const res = await fetch(`/api/models/${m.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(m)
		});
		ensureOk(res, 'Saving the model');
	});

	const apiCreateModel = options.createModel ?? (async (m: ConceptModel): Promise<void> => {
		if (DEMO_MODE) {
			const all = lsGetAll();
			all[m.id] = m;
			lsSaveAll(all);
			return;
		}
		const res = await fetch('/api/models', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(m)
		});
		ensureOk(res, 'Creating the model');
	});

	const apiDeleteModel = options.deleteModel ?? (async (id: string): Promise<void> => {
		if (DEMO_MODE) {
			const all = lsGetAll();
			delete all[id];
			lsSaveAll(all);
			return;
		}
		ensureOk(await fetch(`/api/models/${id}`, { method: 'DELETE' }), 'Deleting the model');
	});

	const apiLoadModel = options.loadModel ?? (async (id: string): Promise<ConceptModel> => {
		if (DEMO_MODE) {
			const found = lsGetAll()[id];
			if (!found) throw new Error(`Concept model not found: ${id}`);
			return found;
		}
		const res = await fetch(`/api/models/${id}`);
		return ensureOk(res, 'Loading the model').json();
	});

	// ── Reactive state ──
	let savedList = $state<{ id: string; name: string }[]>([]);
	let model = $state<ConceptModel>(emptyModel('empty', 'Loading...'));
	let dirty = $state(false);
	let loaded = $state(false);

	function markDirty() { dirty = true; }

	// ── Init ──
	async function initStore() {
		if (loaded) return;
		const models = (await apiListModels()).map(migrateModel);
		if (models.length === 0) {
			const example = makeExampleModel();
			// The example still opens when it cannot be written, and the next Save writes it
			await apiCreateModel(example).catch((e) => console.error('Writing the example model failed:', e));
			savedList = [{ id: example.id, name: example.name }];
			model = example;
		} else {
			savedList = models.map((m) => ({ id: m.id, name: m.name }));
			const lastId = typeof window !== 'undefined' ? localStorage.getItem('cm-current-id') : null;
			const found = models.find((m) => m.id === lastId);
			model = found || models[0];
		}
		dirty = false;
		loaded = true;
	}

	function getModel(): ConceptModel { return model; }
	function getSavedList(): { id: string; name: string }[] { return savedList; }
	function isDirty(): boolean { return dirty; }
	function isLoaded(): boolean { return loaded; }

	/**
	 * Unsaved edits are saved before the current model is swapped out. If that
	 * save fails, the swap stops with an UnsavedChangesError, so the edits stay
	 * on screen instead of being dropped.
	 */
	async function saveIfDirty() {
		if (!dirty) return;
		try {
			await doSave();
		} catch (e) {
			console.error('Saving the current model failed:', e);
			throw new UnsavedChangesError();
		}
	}

	async function switchTo(id: string) {
		if (id === model.id) return;
		await saveIfDirty();
		model = migrateModel(await apiLoadModel(id));
		dirty = false;
		if (typeof window !== 'undefined') localStorage.setItem('cm-current-id', id);
	}

	async function doSave() {
		const snapshot = JSON.parse(JSON.stringify(model));
		await apiSaveModel(snapshot);
		const idx = savedList.findIndex((s) => s.id === model.id);
		if (idx >= 0) savedList[idx] = { id: model.id, name: model.name };
		dirty = false;
	}

	async function newModel(name: string) {
		await saveIfDirty();
		const existingIds = savedList.map((s) => s.id);
		const id = uniqueId(name, existingIds);
		const newM = emptyModel(id, name);
		await apiCreateModel(newM);
		savedList = [...savedList, { id, name }];
		model = newM;
		dirty = false;
		if (typeof window !== 'undefined') localStorage.setItem('cm-current-id', id);
	}

	async function doDeleteModel(id: string) {
		await apiDeleteModel(id);
		savedList = savedList.filter((s) => s.id !== id);
		if (savedList.length > 0) {
			model = migrateModel(await apiLoadModel(savedList[0].id));
		} else {
			const example = makeExampleModel();
			await apiCreateModel(example).catch((e) => console.error('Writing the example model failed:', e));
			savedList = [{ id: example.id, name: example.name }];
			model = example;
		}
		dirty = false;
		if (typeof window !== 'undefined') localStorage.setItem('cm-current-id', model.id);
	}

	function renameModel(name: string) { model.name = name; markDirty(); }
	function updateDescription(desc: string) { model.description = desc; markDirty(); }

	// ── Reference integrity ──
	// One pass after every removal: anything that points at something gone is
	// dropped, so the saved JSON never carries a dangling id.
	function pruneReferences() {
		const conceptIds = new Set(model.concepts.map((c) => c.id));
		const domainIds = new Set(model.domains.map((d) => d.id));
		const storyIds = new Set((model.stories ?? []).map((s) => s.id));
		const participantIds = new Set((model.participants ?? []).map((p) => p.id));
		const questionIds = new Set((model.businessQuestions ?? []).map((q) => q.id));

		model.relationships = model.relationships.filter(
			(r) => conceptIds.has(r.sourceConceptId) && conceptIds.has(r.targetConceptId)
		);
		const relationshipIds = new Set(model.relationships.map((r) => r.id));
		const eventIds = new Set(model.coreBusinessEvents.map((e) => e.id));

		for (const c of model.concepts) {
			if (c.domainId && !domainIds.has(c.domainId)) delete c.domainId;
			if (c.storyIds?.some((id) => !storyIds.has(id))) c.storyIds = c.storyIds.filter((id) => storyIds.has(id));
		}
		for (const e of model.coreBusinessEvents) {
			if (e.conceptIds?.some((id) => !conceptIds.has(id))) e.conceptIds = e.conceptIds.filter((id) => conceptIds.has(id));
			if (e.conceptId && !conceptIds.has(e.conceptId)) delete e.conceptId;
			if (e.relationshipId && !relationshipIds.has(e.relationshipId)) delete e.relationshipId;
		}
		for (const s of model.stories ?? []) {
			if (s.toldBy && !participantIds.has(s.toldBy)) delete s.toldBy;
		}
		for (const q of model.businessQuestions ?? []) {
			if (q.askedBy && !participantIds.has(q.askedBy)) delete q.askedBy;
		}
		if (model.walks) {
			const kept = model.walks.filter((w) =>
				w.subject.type === 'story' ? storyIds.has(w.subject.id) : questionIds.has(w.subject.id)
			);
			// A removed story or question takes its walk, and the item that walk put
			// on the parked list, so a later walk that reuses the id never owns it
			const gone = new Set(model.walks.filter((w) => !kept.includes(w)).map(parkedIdForWalk));
			model.walks = kept;
			if (model.parked?.some((p) => gone.has(p.id))) model.parked = model.parked.filter((p) => !gone.has(p.id));
		}
		if (model.layout) {
			for (const id of Object.keys(model.layout.concepts)) if (!conceptIds.has(id)) delete model.layout.concepts[id];
			for (const id of Object.keys(model.layout.events)) if (!eventIds.has(id)) delete model.layout.events[id];
			for (const id of Object.keys(model.layout.domains ?? {})) if (!domainIds.has(id)) delete model.layout.domains![id];
		}
	}

	// ── Model-level fields (Steps 1, 2, 3, 9, 10, 11 and the parked list) ──
	type ModelFields = Pick<ConceptModel, 'scope' | 'participants' | 'stories' | 'walks' | 'parked' | 'stepNotes' | 'layout'>;

	function updateModelFields(updates: Partial<ModelFields>) {
		assign(model, updates);
		pruneReferences();
		markDirty();
	}

	// ── Concepts ──
	function addConcept(name: string, extra: Partial<Pick<Concept, 'domainId' | 'storyIds'>> = {}): string {
		const id = uniqueId(name, model.concepts.map((c) => c.id));
		model.concepts = [...model.concepts, { id, name, description: '', aliases: [], order: model.concepts.length + 1, ...extra }];
		markDirty();
		return id;
	}

	function removeConcept(id: string) {
		model.concepts = model.concepts.filter((c) => c.id !== id);
		pruneReferences();
		markDirty();
	}

	function updateConcept(id: string, updates: Partial<Omit<Concept, 'id'>>) {
		const c = model.concepts.find((c) => c.id === id);
		if (!c) return;
		assign(c, updates);
		markDirty();
	}

	// ── Relationships ──
	function addRelationship(
		sourceId: string,
		targetId: string,
		label: string,
		extra: Partial<Pick<ConceptRelationship, 'inverseLabel' | 'rule' | 'cardinality' | 'flagged'>> = {}
	): string {
		const id = uniqueId(`${sourceId}-${label || 'relates-to'}-${targetId}`, model.relationships.map((r) => r.id));
		const rel: ConceptRelationship = { id, sourceConceptId: sourceId, targetConceptId: targetId, label, ...extra };
		if (hasBothEnds(rel.rule)) rel.cardinality = ruleToCardinality(rel.rule);
		model.relationships = [...model.relationships, rel];
		markDirty();
		return id;
	}

	function removeRelationship(id: string) {
		model.relationships = model.relationships.filter((r) => r.id !== id);
		pruneReferences();
		markDirty();
	}

	function updateRelationship(id: string, updates: Partial<Omit<ConceptRelationship, 'id'>>) {
		const r = model.relationships.find((r) => r.id === id);
		if (!r) return;
		assign(r, updates);
		// Keep the legacy string in step with the rule, so older readers still see it.
		if (hasBothEnds(r.rule)) r.cardinality = ruleToCardinality(r.rule);
		markDirty();
	}

	// ── Core Business Events ──
	function addCoreEvent(name: string): string {
		const id = uniqueId(name, model.coreBusinessEvents.map((e) => e.id));
		model.coreBusinessEvents = [...model.coreBusinessEvents, { id, name, description: '', order: model.coreBusinessEvents.length + 1 }];
		markDirty();
		return id;
	}

	function removeCoreEvent(id: string) {
		model.coreBusinessEvents = model.coreBusinessEvents.filter((e) => e.id !== id);
		pruneReferences();
		markDirty();
	}

	function updateCoreEvent(id: string, updates: Partial<Omit<CoreBusinessEvent, 'id'>>) {
		const e = model.coreBusinessEvents.find((e) => e.id === id);
		if (!e) return;
		assign(e, updates);
		markDirty();
	}

	// ── Core Business Processes (dormant, kept so files round-trip) ──
	function addCoreProcess(name: string): string {
		const id = uniqueId(name, model.coreBusinessProcesses.map((p) => p.id));
		model.coreBusinessProcesses = [...model.coreBusinessProcesses, { id, name, description: '', order: model.coreBusinessProcesses.length + 1 }];
		markDirty();
		return id;
	}

	function removeCoreProcess(id: string) {
		model.coreBusinessProcesses = model.coreBusinessProcesses.filter((p) => p.id !== id);
		markDirty();
	}

	function updateCoreProcess(id: string, updates: Partial<Omit<CoreBusinessProcess, 'id'>>) {
		const p = model.coreBusinessProcesses.find((p) => p.id === id);
		if (!p) return;
		assign(p, updates);
		markDirty();
	}

	// ── Domains ──
	function addDomain(name: string): string {
		const id = uniqueId(name, model.domains.map((d) => d.id));
		model.domains = [...model.domains, { id, name, description: '', order: model.domains.length + 1 }];
		markDirty();
		return id;
	}

	function removeDomain(id: string) {
		model.domains = model.domains.filter((d) => d.id !== id);
		pruneReferences();
		markDirty();
	}

	function updateDomain(id: string, updates: Partial<Omit<Domain, 'id'>>) {
		const d = model.domains.find((d) => d.id === id);
		if (!d) return;
		assign(d, updates);
		markDirty();
	}

	// ── Business Questions (Step 10) ──
	function addBusinessQuestion(name: string): string {
		const questions = model.businessQuestions ?? [];
		const id = uniqueId(name, questions.map((q) => q.id));
		model.businessQuestions = [...questions, { id, name, order: questions.length + 1 }];
		markDirty();
		return id;
	}

	function removeBusinessQuestion(id: string) {
		model.businessQuestions = (model.businessQuestions ?? []).filter((q) => q.id !== id);
		pruneReferences();
		markDirty();
	}

	function updateBusinessQuestion(id: string, updates: Partial<Omit<BusinessQuestion, 'id'>>) {
		const q = (model.businessQuestions ?? []).find((q) => q.id === id);
		if (!q) return;
		assign(q, updates);
		markDirty();
	}

	// ── Import / Export ──
	function exportJSON(): string {
		return JSON.stringify(model, null, 2);
	}

	// ── Export helpers: names and canon labels for the flat formats ──
	const conceptName = (id: string) => model.concepts.find((c) => c.id === id)?.name ?? id;
	const domainName = (id?: string) => (id ? (model.domains.find((d) => d.id === id)?.name ?? '') : '');
	const personName = (id?: string) => (id ? ((model.participants ?? []).find((p) => p.id === id)?.name ?? '') : '');
	const storyName = (id: string) => (model.stories ?? []).find((s) => s.id === id)?.name ?? id;
	const labelOf = <T extends string>(list: { id: T; label: string }[], id?: T) => (id ? (list.find((x) => x.id === id)?.label ?? id) : '');
	const statusOf = (c: Concept) => labelOf(DEFINITION_STATUSES, c.definitionStatus ?? 'draft');

	function conceptRows(): string[][] {
		return model.concepts.map((c) => [
			c.name,
			domainName(c.domainId),
			labelOf(SEVEN_WS, c.w),
			c.description || '',
			(c.examples ?? []).join('; '),
			(c.specialCases ?? []).join('; '),
			statusOf(c),
			(c.storyIds ?? []).map(storyName).join('; '),
			(c.aliases || []).join(', '),
			c.definitionCategory || '',
			c.definitionDifferentiator || ''
		]);
	}

	const CONCEPT_HEADERS = ['Concept Name', 'Domain', '7W', 'Definition', 'Examples', 'Special Cases', 'Status', 'Stories', 'Aliases', 'Definition Category', 'Definition Differentiator'];

	function exportAsCsv(): string {
		const csvEscape = (val: string) => `"${val.replace(/"/g, '""')}"`;
		return [CONCEPT_HEADERS, ...conceptRows()].map((row) => row.map(csvEscape).join(',')).join('\n');
	}

	async function exportAsXlsx() {
		const sheets: SheetSpec[] = [{ title: model.name, rows: [CONCEPT_HEADERS, ...conceptRows()] }];

		if (model.relationships.length > 0) {
			sheets.push({
				title: 'Relationships',
				rows: [
					['Source Concept', 'Verb', 'Target Concept', 'Inverse Verb', 'Rule', 'Inverse Rule', 'Cardinality', 'Flagged'],
					...model.relationships.map((r) => {
						const s = relationshipSentences(r, conceptName(r.sourceConceptId), conceptName(r.targetConceptId));
						return [conceptName(r.sourceConceptId), r.label, conceptName(r.targetConceptId), r.inverseLabel || '', s.forward ?? '', s.inverse ?? '', r.cardinality || '', r.flagged ? 'Yes' : ''];
					})
				]
			});
		}

		if (model.coreBusinessEvents.length > 0) {
			sheets.push({
				title: 'Core Business Events',
				rows: [
					['Event', 'Involves', 'Sits on Relationship', 'Is also the Concept', 'Description'],
					...model.coreBusinessEvents.map((e) => {
						const rel = model.relationships.find((r) => r.id === e.relationshipId);
						return [
							e.name,
							(e.conceptIds ?? []).map(conceptName).join('; '),
							rel ? relationshipTriple(conceptName(rel.sourceConceptId), rel.label, conceptName(rel.targetConceptId)) : '',
							e.conceptId ? conceptName(e.conceptId) : '',
							e.description || ''
						];
					})
				]
			});
		}

		if (model.coreBusinessEvents.length > 0 && model.concepts.length > 0) {
			// The Event Matrix tab's grid: Concepts by Domain in the Steps' order, ✓ involves, ✭ is also the Concept
			const inOrder = <T extends { order?: number }>(list: T[]) =>
				list.map((item, i) => ({ item, at: item.order ?? i + 1 })).sort((a, b) => a.at - b.at).map((x) => x.item);
			const domains = inOrder(model.domains);
			const concepts = inOrder(model.concepts);
			const columns = [
				...domains.flatMap((d) => concepts.filter((c) => c.domainId === d.id).map((c) => ({ c, domain: d.name }))),
				...concepts.filter((c) => !c.domainId || !domains.some((d) => d.id === c.domainId)).map((c) => ({ c, domain: '' }))
			];
			sheets.push({
				title: 'Event Matrix',
				rows: [
					['Domain', '', ...columns.map((col) => col.domain)],
					['Core Business Event', 'Concepts', ...columns.map((col) => col.c.name)],
					...inOrder(model.coreBusinessEvents).map((e) => {
						const marks = columns.map((col) => (e.conceptId === col.c.id ? '✭' : (e.conceptIds ?? []).includes(col.c.id) ? '✓' : ''));
						return [e.name, String(marks.filter(Boolean).length), ...marks];
					})
				]
			});
		}

		if (model.coreBusinessProcesses.length > 0) {
			sheets.push({
				title: 'Core Business Processes',
				rows: [['Process Name', 'Description'], ...model.coreBusinessProcesses.map((p) => [p.name, p.description || ''])]
			});
		}

		if (model.domains.length > 0) {
			sheets.push({
				title: 'Domains',
				rows: [['Domain Name', 'Description', 'Owner', 'Aliases'], ...model.domains.map((d) => [d.name, d.description || '', d.owner || '', (d.aliases ?? []).join(', ')])]
			});
		}

		if (model.scope) {
			sheets.push({
				title: 'Scope',
				rows: [['Scope Statement', 'Sliced By'], [model.scope.statement, labelOf(SCOPE_SLICES, model.scope.slicedBy)]]
			});
		}

		if ((model.participants ?? []).length > 0) {
			sheets.push({
				title: 'People',
				rows: [
					['Name or Role', 'Roles', 'Notes'],
					...(model.participants ?? []).map((p) => [p.name, p.roles.map((r) => labelOf(PARTICIPANT_ROLES, r)).join(', '), p.notes || ''])
				]
			});
		}

		if ((model.stories ?? []).length > 0) {
			sheets.push({
				title: 'Business Stories',
				rows: [
					['Title', 'Kind', 'Told By', 'Story'],
					...(model.stories ?? []).map((s) => [s.name, labelOf(STORY_KINDS, s.kind), personName(s.toldBy), s.text])
				]
			});
		}

		const walkOf = (type: 'story' | 'question', id: string) => (model.walks ?? []).find((w) => w.subject.type === type && w.subject.id === id);

		if ((model.businessQuestions ?? []).length > 0) {
			sheets.push({
				title: 'Business Questions',
				rows: [
					['Question', 'Asked By', 'Walk', 'Finding'],
					...(model.businessQuestions ?? []).map((q) => {
						const walk = walkOf('question', q.id);
						return [q.name, personName(q.askedBy), walk ? labelOf(WALK_RESULTS, walk.result) : NOT_WALKED_LABEL, walk?.finding ?? ''];
					})
				]
			});
		}

		if ((model.walks ?? []).length > 0) {
			sheets.push({
				title: 'Walks',
				rows: [
					['Walked', 'Story or Question', 'Result', 'Finding', 'What We Did'],
					...(model.walks ?? []).map((w) => [
						w.subject.type === 'story' ? 'Story' : 'Question',
						w.subject.type === 'story' ? storyName(w.subject.id) : ((model.businessQuestions ?? []).find((q) => q.id === w.subject.id)?.name ?? w.subject.id),
						labelOf(WALK_RESULTS, w.result),
						w.finding ?? '',
						labelOf(WALK_RESOLUTIONS, w.resolution)
					])
				]
			});
		}

		if ((model.parked ?? []).length > 0) {
			sheets.push({
				title: PARKED_LIST_NAME,
				rows: [['Parked', 'Kind', 'Where It Came From'], ...(model.parked ?? []).map((p) => [p.text, labelOf(PARKED_KINDS, p.kind), p.note ?? ''])]
			});
		}

		const blob = await buildXlsxBlob(sheets);
		const slug = model.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') || 'export';
		const d = new Date();
		const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
		downloadXlsx(blob, `${slug}-concept-model-${ts}.xlsx`);
	}

	async function importJSON(json: string) {
		const raw = JSON.parse(json);
		if (!raw.id || !raw.concepts) throw new Error('Invalid concept model JSON');
		await saveIfDirty();
		const parsed = migrateModel(raw);
		parsed.name = stripDateTimeSuffix(parsed.name || 'imported');
		const existingIds = savedList.map((s) => s.id);
		const id = uniqueId(parsed.name, existingIds);
		parsed.id = id;
		await apiCreateModel(parsed);
		savedList = [...savedList, { id, name: parsed.name }];
		model = parsed;
		dirty = false;
		if (typeof window !== 'undefined') localStorage.setItem('cm-current-id', id);
	}

	return {
		initStore,
		getModel,
		getSavedList,
		isDirty,
		isLoaded,
		switchTo,
		saveModel: doSave,
		newModel,
		deleteModel: doDeleteModel,
		renameModel,
		updateDescription,
		updateModelFields,
		addConcept, removeConcept, updateConcept,
		addRelationship, removeRelationship, updateRelationship,
		addCoreEvent, removeCoreEvent, updateCoreEvent,
		addCoreProcess, removeCoreProcess, updateCoreProcess,
		addDomain, removeDomain, updateDomain,
		addBusinessQuestion, removeBusinessQuestion, updateBusinessQuestion,
		exportJSON, exportAsCsv, exportAsXlsx, importJSON
	};
}

export type ConceptModelStore = ReturnType<typeof createConceptModelStore>;
