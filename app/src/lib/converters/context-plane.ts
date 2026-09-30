import type { ContextNode, ContextLink } from '$lib/cp-shared';
import { getNodeLabels } from '$lib/cp-shared';
import type {
	ConceptModel,
	Concept,
	ConceptRelationship,
	CoreBusinessEvent,
	CoreBusinessProcess,
	Domain,
	BusinessQuestion,
	MapLayout,
	Point,
	Walk
} from '$lib/types';
import { MODEL_VERSION } from '$lib/types';

// Native Concept Model JSON <-> Context Plane { nodes, links }.
//
// Where each version 2 field lives (see design/architecture.md):
//   - One Map's working data (scope, participants, stories, walks, parked,
//     stepNotes, layout) is properties on the `cm_model` node.
//   - A Concept's Definition (examples, special cases, status) is properties on
//     the shared `global_concept` node, like `description`.
//   - A Concept's place in this Map (domainId, storyIds) is properties on its
//     `has_concept` link, so it hangs off the model side, never the shared node.
//   - Business Questions are `global_business_question` nodes linked by `answers`.
//   - The Concepts an Event joins are `event_involves_concept` links.
//
// Anything that points at a node or link holds its GRAPH id, so the canvas
// never needs to know the native ids.

export const graphId = {
	model: (id: string) => `cm_model_${id}`,
	concept: (id: string) => `cm_concept_${id}`,
	event: (id: string) => `cm_event_${id}`,
	process: (id: string) => `cm_process_${id}`,
	domain: (id: string) => `cm_domain_${id}`,
	question: (id: string) => `cm_question_${id}`,
	relationship: (id: string) => `link_rel_${id}`
};

/** Model-node properties that hold one Map's working data. */
export const MODEL_FIELD_KEYS = ['scope', 'participants', 'stories', 'walks', 'parked', 'stepNotes', 'layout'] as const;
export type ModelFieldKey = (typeof MODEL_FIELD_KEYS)[number];
export type ModelFields = Pick<ConceptModel, ModelFieldKey>;

/** A plain, detached copy, so no graph value is a live reference into the store. */
function plain<T>(value: T): T {
	return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function mapKeys(record: Record<string, Point>, toKey: (key: string) => string | undefined): Record<string, Point> {
	const out: Record<string, Point> = {};
	for (const [key, point] of Object.entries(record)) {
		const mapped = toKey(key);
		if (mapped) out[mapped] = { x: point.x, y: point.y };
	}
	return out;
}

function mapWalks(walks: Walk[], toQuestionId: (id: string) => string | undefined): Walk[] {
	const out: Walk[] = [];
	for (const walk of walks) {
		const id = walk.subject.type === 'question' ? toQuestionId(walk.subject.id) : walk.subject.id;
		if (id) out.push({ ...plain(walk), subject: { type: walk.subject.type, id } });
	}
	return out;
}

/** Native model fields to the graph shape held on the model node. */
function modelFieldsToGraph(model: ConceptModel): Record<string, unknown> {
	return {
		scope: plain(model.scope),
		participants: plain(model.participants),
		stories: plain(model.stories),
		walks: model.walks ? mapWalks(model.walks, graphId.question) : undefined,
		parked: plain(model.parked),
		stepNotes: plain(model.stepNotes),
		layout: model.layout
			? {
					concepts: mapKeys(model.layout.concepts, graphId.concept),
					events: mapKeys(model.layout.events, graphId.event),
					...(model.layout.domains ? { domains: mapKeys(model.layout.domains, graphId.domain) } : {})
				}
			: undefined
	};
}

/**
 * The model-node properties present in `props`, back in native ids. Keys not
 * in `props` are left out, so a caller can apply only what changed.
 * `toNativeId` maps a graph node id to its native id, or undefined when gone.
 */
export function modelFieldsFromGraph(
	props: Record<string, unknown>,
	toNativeId: (graphNodeId: string) => string | undefined
): Partial<ModelFields> {
	const has = (key: ModelFieldKey) => Object.prototype.hasOwnProperty.call(props, key);
	const out: Partial<ModelFields> = {};
	if (has('scope')) out.scope = plain(props.scope as ModelFields['scope']);
	if (has('participants')) out.participants = plain(props.participants as ModelFields['participants']);
	if (has('stories')) out.stories = plain(props.stories as ModelFields['stories']);
	if (has('parked')) out.parked = plain(props.parked as ModelFields['parked']);
	if (has('stepNotes')) out.stepNotes = plain(props.stepNotes as ModelFields['stepNotes']);
	if (has('walks')) {
		const walks = props.walks as Walk[] | undefined;
		out.walks = walks ? mapWalks(walks, toNativeId) : undefined;
	}
	if (has('layout')) {
		const layout = props.layout as MapLayout | undefined;
		out.layout = layout
			? {
					concepts: mapKeys(layout.concepts ?? {}, toNativeId),
					events: mapKeys(layout.events ?? {}, toNativeId),
					...(layout.domains ? { domains: mapKeys(layout.domains, toNativeId) } : {})
				}
			: undefined;
	}
	return out;
}

/**
 * Convert a native ConceptModel to Context Plane { nodes, links } format.
 */
export function conceptModelToContextPlane(model: ConceptModel): { nodes: ContextNode[]; links: ContextLink[] } {
	const nodes: ContextNode[] = [];
	const links: ContextLink[] = [];
	const now = new Date().toISOString();
	const stamp = { created_at: now, updated_at: now };

	const modelNodeId = graphId.model(model.id);
	nodes.push({
		id: modelNodeId,
		label: 'cm_model',
		name: model.name,
		description: model.description || null,
		properties: { sourceId: model.id, version: MODEL_VERSION, ...modelFieldsToGraph(model) },
		...stamp
	});

	// Concepts, and their place in this Map on the has_concept link
	model.concepts.forEach((concept, i) => {
		const nodeId = graphId.concept(concept.id);
		nodes.push({
			id: nodeId,
			label: 'global_concept,global_glossary_term',
			name: concept.name,
			description: concept.description || null,
			properties: {
				sourceId: concept.id,
				aliases: plain(concept.aliases || []),
				order: concept.order ?? i + 1,
				definitionCategory: concept.definitionCategory || '',
				definitionDifferentiator: concept.definitionDifferentiator || '',
				examples: plain(concept.examples),
				specialCases: plain(concept.specialCases),
				definitionStatus: concept.definitionStatus,
				w: concept.w,
				notes: concept.notes
			},
			...stamp
		});
		links.push({
			id: `link_model_concept_${concept.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_concept',
			properties: {
				domainId: concept.domainId ? graphId.domain(concept.domainId) : undefined,
				storyIds: plain(concept.storyIds)
			},
			...stamp
		});
	});

	// Relationships between Concepts
	for (const rel of model.relationships) {
		links.push({
			id: graphId.relationship(rel.id),
			source_id: graphId.concept(rel.sourceConceptId),
			destination_id: graphId.concept(rel.targetConceptId),
			label: rel.label || 'relates_to',
			properties: {
				sourceRelId: rel.id,
				cardinality: rel.cardinality,
				inverseLabel: rel.inverseLabel,
				rule: plain(rel.rule),
				flagged: rel.flagged
			},
			...stamp
		});
	}

	// Core Business Events, and the Concepts each one joins
	model.coreBusinessEvents.forEach((ev, i) => {
		const nodeId = graphId.event(ev.id);
		nodes.push({
			id: nodeId,
			label: 'global_core_business_event',
			name: ev.name,
			description: ev.description || null,
			properties: {
				sourceId: ev.id,
				order: ev.order ?? i + 1,
				notes: ev.notes,
				relationshipId: ev.relationshipId ? graphId.relationship(ev.relationshipId) : undefined,
				conceptId: ev.conceptId ? graphId.concept(ev.conceptId) : undefined
			},
			...stamp
		});
		links.push({
			id: `link_model_event_${ev.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_core_event',
			properties: {},
			...stamp
		});
		for (const conceptId of ev.conceptIds ?? []) {
			links.push({
				id: `link_evc_${ev.id}__${conceptId}`,
				source_id: nodeId,
				destination_id: graphId.concept(conceptId),
				label: 'event_involves_concept',
				properties: {},
				...stamp
			});
		}
	});

	// Core Business Processes (dormant, kept so files round-trip)
	model.coreBusinessProcesses.forEach((proc, i) => {
		const nodeId = graphId.process(proc.id);
		nodes.push({
			id: nodeId,
			label: 'global_core_business_process',
			name: proc.name,
			description: proc.description || null,
			properties: { sourceId: proc.id, order: proc.order ?? i + 1, notes: proc.notes },
			...stamp
		});
		links.push({
			id: `link_model_process_${proc.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_core_process',
			properties: {},
			...stamp
		});
	});

	// Domains
	model.domains.forEach((dom, i) => {
		const nodeId = graphId.domain(dom.id);
		nodes.push({
			id: nodeId,
			label: 'global_domain',
			name: dom.name,
			description: dom.description || null,
			properties: {
				sourceId: dom.id,
				order: dom.order ?? i + 1,
				owner: dom.owner,
				aliases: plain(dom.aliases),
				notes: dom.notes
			},
			...stamp
		});
		links.push({
			id: `link_model_domain_${dom.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_domain',
			properties: {},
			...stamp
		});
	});

	// Business Questions (Step 10), the same object the Information Product Canvas uses
	(model.businessQuestions ?? []).forEach((q, i) => {
		const nodeId = graphId.question(q.id);
		nodes.push({
			id: nodeId,
			label: 'global_business_question',
			name: q.name,
			description: null,
			properties: { sourceId: q.id, order: q.order ?? i + 1, askedBy: q.askedBy },
			...stamp
		});
		links.push({
			id: `link_model_question_${q.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'answers',
			properties: {},
			...stamp
		});
	});

	return { nodes, links };
}

function str(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

function strList(value: unknown): string[] | undefined {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

function num(value: unknown): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

/**
 * Convert Context Plane { nodes, links } format back to a native ConceptModel.
 */
export function contextPlaneToConceptModel(
	data: { nodes: ContextNode[]; links: ContextLink[] },
	modelName?: string
): ConceptModel {
	const { nodes, links } = data;
	const labelled = (label: string) => nodes.filter((n) => getNodeLabels(n).includes(label));

	const modelNode = labelled('cm_model')[0];
	const conceptNodes = labelled('global_concept');
	const eventNodes = labelled('global_core_business_event');
	const processNodes = labelled('global_core_business_process');
	const domainNodes = labelled('global_domain');
	const questionNodes = labelled('global_business_question');

	// Graph id -> native id, for every node and every Relationship link
	const nativeIdOf = new Map<string, string>();
	for (const n of nodes) nativeIdOf.set(n.id, str(n.properties?.sourceId) ?? n.id);
	const toNativeId = (gid: string) => nativeIdOf.get(gid);

	const conceptNodeIds = new Set(conceptNodes.map((n) => n.id));
	const relationshipLinks = links.filter(
		(l) => conceptNodeIds.has(l.source_id) && conceptNodeIds.has(l.destination_id)
	);
	const relIdOf = new Map<string, string>();
	for (const l of relationshipLinks) relIdOf.set(l.id, str(l.properties?.sourceRelId) ?? l.id);

	const placementOf = new Map<string, ContextLink>();
	for (const l of links) if (l.label === 'has_concept') placementOf.set(l.destination_id, l);

	const concepts: Concept[] = conceptNodes.map((n) => {
		const p = n.properties ?? {};
		const placement = placementOf.get(n.id)?.properties ?? {};
		const domainGraphId = str(placement.domainId);
		const concept: Concept = {
			id: nativeIdOf.get(n.id)!,
			name: n.name,
			description: n.description || '',
			aliases: strList(p.aliases) ?? [],
			order: num(p.order),
			definitionCategory: str(p.definitionCategory),
			definitionDifferentiator: str(p.definitionDifferentiator),
			domainId: domainGraphId ? toNativeId(domainGraphId) : undefined,
			storyIds: strList(placement.storyIds),
			examples: strList(p.examples),
			specialCases: strList(p.specialCases),
			definitionStatus: str(p.definitionStatus) as Concept['definitionStatus'],
			w: str(p.w) as Concept['w'],
			notes: str(p.notes)
		};
		return concept;
	});

	const relationships: ConceptRelationship[] = relationshipLinks.map((l) => {
		const p = l.properties ?? {};
		return {
			id: relIdOf.get(l.id)!,
			sourceConceptId: nativeIdOf.get(l.source_id)!,
			targetConceptId: nativeIdOf.get(l.destination_id)!,
			label: l.label,
			cardinality: str(p.cardinality),
			inverseLabel: str(p.inverseLabel),
			rule: p.rule ? plain(p.rule as ConceptRelationship['rule']) : undefined,
			flagged: p.flagged === true ? true : undefined
		};
	});

	const coreBusinessEvents: CoreBusinessEvent[] = eventNodes.map((n) => {
		const p = n.properties ?? {};
		const joins = links
			.filter((l) => l.source_id === n.id && l.label === 'event_involves_concept' && conceptNodeIds.has(l.destination_id))
			.map((l) => nativeIdOf.get(l.destination_id)!);
		const relGraphId = str(p.relationshipId);
		const conceptGraphId = str(p.conceptId);
		return {
			id: nativeIdOf.get(n.id)!,
			name: n.name,
			description: n.description || '',
			order: num(p.order),
			conceptIds: joins.length > 0 ? joins : undefined,
			relationshipId: relGraphId ? relIdOf.get(relGraphId) : undefined,
			conceptId: conceptGraphId ? toNativeId(conceptGraphId) : undefined,
			notes: str(p.notes)
		};
	});

	const coreBusinessProcesses: CoreBusinessProcess[] = processNodes.map((n) => ({
		id: nativeIdOf.get(n.id)!,
		name: n.name,
		description: n.description || '',
		order: num(n.properties?.order),
		notes: str(n.properties?.notes)
	}));

	const domains: Domain[] = domainNodes.map((n) => ({
		id: nativeIdOf.get(n.id)!,
		name: n.name,
		description: n.description || '',
		order: num(n.properties?.order),
		owner: str(n.properties?.owner),
		aliases: strList(n.properties?.aliases),
		notes: str(n.properties?.notes)
	}));

	const businessQuestions: BusinessQuestion[] = questionNodes.map((n) => ({
		id: nativeIdOf.get(n.id)!,
		name: n.name,
		askedBy: str(n.properties?.askedBy),
		order: num(n.properties?.order)
	}));

	return {
		// A graph that does not say it is version 2 (a Context Plane export, an
		// older file) reads as 1.0, so migrateModel turns its cardinalities into rules
		version: str(modelNode?.properties?.version) ?? '1.0',
		id: str(modelNode?.properties?.sourceId) ?? modelNode?.id ?? 'imported',
		name: modelName || modelNode?.name || 'Imported Concept Model',
		description: modelNode?.description || '',
		concepts,
		relationships,
		coreBusinessEvents,
		coreBusinessProcesses,
		domains,
		...(businessQuestions.length > 0 ? { businessQuestions } : {}),
		...modelFieldsFromGraph(modelNode?.properties ?? {}, toNativeId)
	};
}
