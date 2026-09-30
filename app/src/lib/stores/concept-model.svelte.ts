import type { ConceptModel, Concept, ConceptRelationship, CoreBusinessEvent, CoreBusinessProcess, Domain } from '$lib/types';
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

function makeExampleModel(): ConceptModel {
	return {
		version: '1.0',
		id: 'example-concept-model',
		name: 'Example Concept Model',
		description: 'An example conceptual data model',
		concepts: [
			{ id: 'customer', name: 'Customer', description: 'A person or organisation that purchases products or services', aliases: ['Client', 'Buyer'] },
			{ id: 'product', name: 'Product', description: 'A good or service offered for sale', aliases: ['Item', 'SKU'] },
			{ id: 'order', name: 'Order', description: 'A request to purchase one or more products', aliases: ['Purchase Order'] }
		],
		relationships: [
			{ id: 'customer-places-order', sourceConceptId: 'customer', targetConceptId: 'order', label: 'places', cardinality: '1:M' },
			{ id: 'order-contains-product', sourceConceptId: 'order', targetConceptId: 'product', label: 'contains', cardinality: 'M:M' }
		],
		coreBusinessEvents: [
			{ id: 'customer-orders-product', name: 'Customer Orders Product', description: '' }
		],
		coreBusinessProcesses: [
			{ id: 'order-fulfilment', name: 'Order Fulfilment', description: '' }
		],
		domains: [
			{ id: 'sales', name: 'Sales', description: 'Sales and revenue domain' }
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
		await fetch(`/api/models/${m.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(m)
		});
	});

	const apiCreateModel = options.createModel ?? (async (m: ConceptModel): Promise<void> => {
		if (DEMO_MODE) {
			const all = lsGetAll();
			all[m.id] = m;
			lsSaveAll(all);
			return;
		}
		await fetch('/api/models', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(m)
		});
	});

	const apiDeleteModel = options.deleteModel ?? (async (id: string): Promise<void> => {
		if (DEMO_MODE) {
			const all = lsGetAll();
			delete all[id];
			lsSaveAll(all);
			return;
		}
		await fetch(`/api/models/${id}`, { method: 'DELETE' });
	});

	const apiLoadModel = options.loadModel ?? (async (id: string): Promise<ConceptModel> => {
		if (DEMO_MODE) {
			const found = lsGetAll()[id];
			if (!found) throw new Error(`Concept model not found: ${id}`);
			return found;
		}
		const res = await fetch(`/api/models/${id}`);
		return res.json();
	});

	// ── Reactive state ──
	let savedList = $state<{ id: string; name: string }[]>([]);
	let model = $state<ConceptModel>({
		version: '1.0',
		id: 'empty',
		name: 'Loading...',
		description: '',
		concepts: [],
		relationships: [],
		coreBusinessEvents: [],
		coreBusinessProcesses: [],
		domains: []
	});
	let dirty = $state(false);
	let loaded = $state(false);

	function markDirty() { dirty = true; }

	// ── Init ──
	async function initStore() {
		if (loaded) return;
		const models = await apiListModels();
		if (models.length === 0) {
			const example = makeExampleModel();
			await apiCreateModel(example);
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

	async function switchTo(id: string) {
		if (id === model.id) return;
		model = await apiLoadModel(id);
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
		const existingIds = savedList.map((s) => s.id);
		const id = uniqueId(name, existingIds);
		const newM: ConceptModel = {
			version: '1.0', id, name, description: '',
			concepts: [], relationships: [],
			coreBusinessEvents: [], coreBusinessProcesses: [],
			domains: []
		};
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
			model = await apiLoadModel(savedList[0].id);
		} else {
			const example = makeExampleModel();
			await apiCreateModel(example);
			savedList = [{ id: example.id, name: example.name }];
			model = example;
		}
		dirty = false;
		if (typeof window !== 'undefined') localStorage.setItem('cm-current-id', model.id);
	}

	function renameModel(name: string) { model.name = name; markDirty(); }
	function updateDescription(desc: string) { model.description = desc; markDirty(); }

	// ── Concepts ──
	function addConcept(name: string) {
		const id = uniqueId(name, model.concepts.map((c) => c.id));
		model.concepts = [...model.concepts, { id, name, description: '', aliases: [], order: model.concepts.length + 1 }];
		markDirty();
	}

	function removeConcept(id: string) {
		model.concepts = model.concepts.filter((c) => c.id !== id);
		model.relationships = model.relationships.filter(
			(r) => r.sourceConceptId !== id && r.targetConceptId !== id
		);
		markDirty();
	}

	function updateConcept(id: string, updates: Partial<Pick<Concept, 'name' | 'description' | 'aliases' | 'order' | 'definitionCategory' | 'definitionDifferentiator'>>) {
		const c = model.concepts.find((c) => c.id === id);
		if (!c) return;
		if (updates.name !== undefined) c.name = updates.name;
		if (updates.description !== undefined) c.description = updates.description;
		if (updates.aliases !== undefined) c.aliases = updates.aliases;
		if (updates.order !== undefined) c.order = updates.order;
		if (updates.definitionCategory !== undefined) c.definitionCategory = updates.definitionCategory;
		if (updates.definitionDifferentiator !== undefined) c.definitionDifferentiator = updates.definitionDifferentiator;
		markDirty();
	}

	// ── Relationships ──
	function addRelationship(sourceId: string, targetId: string, label: string, cardinality?: string) {
		const id = uniqueId(`${sourceId}-${label}-${targetId}`, model.relationships.map((r) => r.id));
		model.relationships = [...model.relationships, { id, sourceConceptId: sourceId, targetConceptId: targetId, label, cardinality }];
		markDirty();
	}

	function removeRelationship(id: string) {
		model.relationships = model.relationships.filter((r) => r.id !== id);
		markDirty();
	}

	function updateRelationship(id: string, updates: Partial<Pick<ConceptRelationship, 'label' | 'cardinality'>>) {
		const r = model.relationships.find((r) => r.id === id);
		if (!r) return;
		if (updates.label !== undefined) r.label = updates.label;
		if (updates.cardinality !== undefined) r.cardinality = updates.cardinality;
		markDirty();
	}

	// ── Core Business Events ──
	function addCoreEvent(name: string) {
		const id = uniqueId(name, model.coreBusinessEvents.map((e) => e.id));
		model.coreBusinessEvents = [...model.coreBusinessEvents, { id, name, description: '', order: model.coreBusinessEvents.length + 1 }];
		markDirty();
	}

	function removeCoreEvent(id: string) {
		model.coreBusinessEvents = model.coreBusinessEvents.filter((e) => e.id !== id);
		markDirty();
	}

	function updateCoreEvent(id: string, updates: Partial<Pick<CoreBusinessEvent, 'name' | 'description' | 'order'>>) {
		const e = model.coreBusinessEvents.find((e) => e.id === id);
		if (!e) return;
		if (updates.name !== undefined) e.name = updates.name;
		if (updates.description !== undefined) e.description = updates.description;
		if (updates.order !== undefined) e.order = updates.order;
		markDirty();
	}

	// ── Core Business Processes ──
	function addCoreProcess(name: string) {
		const id = uniqueId(name, model.coreBusinessProcesses.map((p) => p.id));
		model.coreBusinessProcesses = [...model.coreBusinessProcesses, { id, name, description: '', order: model.coreBusinessProcesses.length + 1 }];
		markDirty();
	}

	function removeCoreProcess(id: string) {
		model.coreBusinessProcesses = model.coreBusinessProcesses.filter((p) => p.id !== id);
		markDirty();
	}

	function updateCoreProcess(id: string, updates: Partial<Pick<CoreBusinessProcess, 'name' | 'description' | 'order'>>) {
		const p = model.coreBusinessProcesses.find((p) => p.id === id);
		if (!p) return;
		if (updates.name !== undefined) p.name = updates.name;
		if (updates.description !== undefined) p.description = updates.description;
		if (updates.order !== undefined) p.order = updates.order;
		markDirty();
	}

	// ── Domains ──
	function addDomain(name: string) {
		const id = uniqueId(name, (model.domains ?? []).map((d) => d.id));
		model.domains = [...(model.domains ?? []), { id, name, description: '', order: (model.domains ?? []).length + 1 }];
		markDirty();
	}

	function removeDomain(id: string) {
		model.domains = (model.domains ?? []).filter((d) => d.id !== id);
		markDirty();
	}

	function updateDomain(id: string, updates: Partial<Pick<Domain, 'name' | 'description' | 'order'>>) {
		const d = (model.domains ?? []).find((d) => d.id === id);
		if (!d) return;
		if (updates.name !== undefined) d.name = updates.name;
		if (updates.description !== undefined) d.description = updates.description;
		if (updates.order !== undefined) d.order = updates.order;
		markDirty();
	}

	// ── Import / Export ──
	function exportJSON(): string {
		return JSON.stringify(model, null, 2);
	}

	function exportAsCsv(): string {
		const headers = ['Concept Name', 'Definition Category', 'Definition Differentiator', 'Description', 'Aliases'];
		const csvEscape = (val: string) => `"${val.replace(/"/g, '""')}"`;

		const rows = model.concepts.map((c) => {
			return [
				csvEscape(c.name),
				csvEscape(c.definitionCategory || ''),
				csvEscape(c.definitionDifferentiator || ''),
				csvEscape(c.description || ''),
				csvEscape((c.aliases || []).join(', '))
			].join(',');
		});

		return [headers.map(csvEscape).join(','), ...rows].join('\n');
	}

	async function exportAsXlsx() {
		// Sheet 1: Concepts
		const conceptHeaders = ['Concept Name', 'Definition Category', 'Definition Differentiator', 'Description', 'Aliases'];
		const conceptData = model.concepts.map((c) => [
			c.name,
			c.definitionCategory || '',
			c.definitionDifferentiator || '',
			c.description || '',
			(c.aliases || []).join(', ')
		]);

		const sheets: SheetSpec[] = [
			{ title: model.name, rows: [conceptHeaders, ...conceptData] }
		];

		// Sheet 2: Relationships
		if (model.relationships.length > 0) {
			const relHeaders = ['Source Concept', 'Relationship', 'Target Concept', 'Cardinality'];
			const relData = model.relationships.map((r) => {
				const src = model.concepts.find((c) => c.id === r.sourceConceptId);
				const tgt = model.concepts.find((c) => c.id === r.targetConceptId);
				return [src?.name || r.sourceConceptId, r.label, tgt?.name || r.targetConceptId, r.cardinality || ''];
			});
			sheets.push({ title: 'Relationships', rows: [relHeaders, ...relData] });
		}

		// Sheet 3: Core Business Events
		if (model.coreBusinessEvents.length > 0) {
			const evHeaders = ['Event Name', 'Description'];
			const evData = model.coreBusinessEvents.map((e) => [e.name, e.description || '']);
			sheets.push({ title: 'Core Business Events', rows: [evHeaders, ...evData] });
		}

		// Sheet 4: Core Business Processes
		if (model.coreBusinessProcesses.length > 0) {
			const procHeaders = ['Process Name', 'Description'];
			const procData = model.coreBusinessProcesses.map((p) => [p.name, p.description || '']);
			sheets.push({ title: 'Core Business Processes', rows: [procHeaders, ...procData] });
		}

		// Sheet 5: Domains
		if ((model.domains ?? []).length > 0) {
			const domHeaders = ['Domain Name', 'Description'];
			const domData = (model.domains ?? []).map((d) => [d.name, d.description || '']);
			sheets.push({ title: 'Domains', rows: [domHeaders, ...domData] });
		}

		const blob = await buildXlsxBlob(sheets);
		const slug = model.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') || 'export';
		const d = new Date();
		const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
		downloadXlsx(blob, `${slug}-concept-model-${ts}.xlsx`);
	}

	async function importJSON(json: string) {
		const parsed = JSON.parse(json);
		if (!parsed.id || !parsed.concepts) throw new Error('Invalid concept model JSON');
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
		addConcept, removeConcept, updateConcept,
		addRelationship, removeRelationship, updateRelationship,
		addCoreEvent, removeCoreEvent, updateCoreEvent,
		addCoreProcess, removeCoreProcess, updateCoreProcess,
		addDomain, removeDomain, updateDomain,
		exportJSON, exportAsCsv, exportAsXlsx, importJSON
	};
}

export type ConceptModelStore = ReturnType<typeof createConceptModelStore>;
