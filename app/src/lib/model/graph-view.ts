// Read side of the canvas: turns { nodes, links } into one Concept Model
// view in graph ids. Every view (Steps, Map, Definitions) reads this, and
// never the native model, so the canvas stays mode-agnostic.

import type { ContextNode, ContextLink } from '$lib/cp-shared';
import { getNodeLabels } from '$lib/cp-shared';
import type {
	BusinessStory,
	DefinitionStatus,
	MapLayout,
	ParkedItem,
	Participant,
	RelationshipRule,
	Scope,
	StepId,
	StepNote,
	W,
	Walk
} from '$lib/types';

export interface CmConcept {
	id: string;
	node: ContextNode;
	name: string;
	description: string;
	aliases: string[];
	examples: string[];
	specialCases: string[];
	status: DefinitionStatus;
	order: number;
	w?: W;
	notes?: string;
	definitionCategory?: string;
	definitionDifferentiator?: string;
	/** The has_concept link that holds this Concept's place in the Map. */
	placement?: ContextLink;
	/** A Domain node id. */
	domainId?: string;
	storyIds: string[];
}

export interface CmDomain {
	id: string;
	node: ContextNode;
	name: string;
	description: string;
	order: number;
}

export interface CmRelationship {
	id: string;
	link: ContextLink;
	/** Concept node ids. */
	sourceId: string;
	targetId: string;
	verb: string;
	inverseVerb: string;
	rule?: RelationshipRule;
	flagged: boolean;
	cardinality?: string;
}

export interface CmEvent {
	id: string;
	node: ContextNode;
	name: string;
	order: number;
	/** Concept node ids, in join order. */
	conceptIds: string[];
	joinLinks: ContextLink[];
	/** A Relationship link id. */
	relationshipId?: string;
	/** A Concept node id, when the Event is also that Concept. */
	conceptId?: string;
}

export interface CmQuestion {
	id: string;
	node: ContextNode;
	name: string;
	order: number;
	askedBy?: string;
}

export interface CmView {
	modelNode: ContextNode | null;
	scope?: Scope;
	participants: Participant[];
	stories: BusinessStory[];
	/** Question subjects hold question node ids. */
	walks: Walk[];
	parked: ParkedItem[];
	stepNotes: Partial<Record<StepId, StepNote>>;
	/** Keyed by Concept, Event and Domain node ids. */
	layout: Required<MapLayout>;
	concepts: CmConcept[];
	domains: CmDomain[];
	relationships: CmRelationship[];
	events: CmEvent[];
	questions: CmQuestion[];
	conceptById: Map<string, CmConcept>;
	domainById: Map<string, CmDomain>;
	relationshipById: Map<string, CmRelationship>;
	eventById: Map<string, CmEvent>;
	questionById: Map<string, CmQuestion>;
	storyById: Map<string, BusinessStory>;
	participantById: Map<string, Participant>;
}

function str(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

function strList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function list<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

function byOrder<T extends { order: number; name: string }>(a: T, b: T): number {
	return a.order - b.order || a.name.localeCompare(b.name);
}

function hasLabel(node: ContextNode, label: string): boolean {
	return getNodeLabels(node).includes(label);
}

export function readView(nodes: ContextNode[], links: ContextLink[]): CmView {
	const modelNode = nodes.find((n) => hasLabel(n, 'cm_model')) ?? null;
	const props = modelNode?.properties ?? {};

	// Scope every collection to this model through its structural links
	const linkedFromModel = (label: string) =>
		new Set(links.filter((l) => l.source_id === modelNode?.id && l.label === label).map((l) => l.destination_id));
	const conceptIds = linkedFromModel('has_concept');
	const eventIds = linkedFromModel('has_core_event');
	const domainIds = linkedFromModel('has_domain');
	const questionIds = linkedFromModel('answers');

	const placementOf = new Map<string, ContextLink>();
	for (const l of links) if (l.source_id === modelNode?.id && l.label === 'has_concept') placementOf.set(l.destination_id, l);

	const concepts: CmConcept[] = nodes
		.filter((n) => conceptIds.has(n.id) && hasLabel(n, 'global_concept'))
		.map((n, i) => {
			const p = n.properties ?? {};
			const placement = placementOf.get(n.id);
			return {
				id: n.id,
				node: n,
				name: n.name,
				description: n.description ?? '',
				aliases: strList(p.aliases),
				examples: strList(p.examples),
				specialCases: strList(p.specialCases),
				status: (str(p.definitionStatus) as DefinitionStatus | undefined) ?? 'draft',
				order: typeof p.order === 'number' ? p.order : i + 1,
				w: str(p.w) as W | undefined,
				notes: str(p.notes),
				definitionCategory: str(p.definitionCategory),
				definitionDifferentiator: str(p.definitionDifferentiator),
				placement,
				domainId: str(placement?.properties?.domainId),
				storyIds: strList(placement?.properties?.storyIds)
			};
		})
		.sort(byOrder);

	const domains: CmDomain[] = nodes
		.filter((n) => domainIds.has(n.id) && hasLabel(n, 'global_domain'))
		.map((n, i) => ({
			id: n.id,
			node: n,
			name: n.name,
			description: n.description ?? '',
			order: typeof n.properties?.order === 'number' ? (n.properties.order as number) : i + 1
		}))
		.sort(byOrder);

	// Structural links never join two Concepts, so any link between two of
	// this model's Concepts is a Relationship, whatever its verb.
	const relationships: CmRelationship[] = links
		.filter((l) => conceptIds.has(l.source_id) && conceptIds.has(l.destination_id))
		.map((l) => ({
			id: l.id,
			link: l,
			sourceId: l.source_id,
			targetId: l.destination_id,
			verb: l.label,
			inverseVerb: str(l.properties?.inverseLabel) ?? '',
			rule: (l.properties?.rule as RelationshipRule | undefined) ?? undefined,
			flagged: l.properties?.flagged === true,
			cardinality: str(l.properties?.cardinality)
		}));

	const events: CmEvent[] = nodes
		.filter((n) => eventIds.has(n.id) && hasLabel(n, 'global_core_business_event'))
		.map((n, i) => {
			const joinLinks = links.filter(
				(l) => l.source_id === n.id && l.label === 'event_involves_concept' && conceptIds.has(l.destination_id)
			);
			return {
				id: n.id,
				node: n,
				name: n.name,
				order: typeof n.properties?.order === 'number' ? (n.properties.order as number) : i + 1,
				conceptIds: joinLinks.map((l) => l.destination_id),
				joinLinks,
				relationshipId: str(n.properties?.relationshipId),
				conceptId: str(n.properties?.conceptId)
			};
		})
		.sort(byOrder);

	const questions: CmQuestion[] = nodes
		.filter((n) => questionIds.has(n.id) && hasLabel(n, 'global_business_question'))
		.map((n, i) => ({
			id: n.id,
			node: n,
			name: n.name,
			order: typeof n.properties?.order === 'number' ? (n.properties.order as number) : i + 1,
			askedBy: str(n.properties?.askedBy)
		}))
		.sort(byOrder);

	const stories = list<BusinessStory>(props.stories);
	const participants = list<Participant>(props.participants);
	const layout = (props.layout as MapLayout | undefined) ?? { concepts: {}, events: {} };

	return {
		modelNode,
		scope: props.scope as Scope | undefined,
		participants,
		stories,
		walks: list<Walk>(props.walks),
		parked: list<ParkedItem>(props.parked),
		stepNotes: (props.stepNotes as Partial<Record<StepId, StepNote>> | undefined) ?? {},
		layout: { concepts: layout.concepts ?? {}, events: layout.events ?? {}, domains: layout.domains ?? {} },
		concepts,
		domains,
		relationships,
		events,
		questions,
		conceptById: new Map(concepts.map((c) => [c.id, c])),
		domainById: new Map(domains.map((d) => [d.id, d])),
		relationshipById: new Map(relationships.map((r) => [r.id, r])),
		eventById: new Map(events.map((e) => [e.id, e])),
		questionById: new Map(questions.map((q) => [q.id, q])),
		storyById: new Map(stories.map((s) => [s.id, s])),
		participantById: new Map(participants.map((p) => [p.id, p]))
	};
}
