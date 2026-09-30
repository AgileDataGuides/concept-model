// Write side of the canvas. Every change goes through the DataAdapter in
// graph ids, so the same views work standalone and embedded.

import type { DataAdapter, ContextNode, ContextLink } from '$lib/cp-shared';
import type { CmConcept, CmEvent, CmView } from './graph-view';
import type { MapLayout, ParkedItem, Participant, BusinessStory, Scope, StepId, StepNote, Walk } from '$lib/types';

/** A slug id, unique among `existing`. */
export function uniqueSlug(text: string, existing: Iterable<string>): string {
	const taken = new Set(existing);
	const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
	if (!taken.has(base)) return base;
	let i = 2;
	while (taken.has(`${base}-${i}`)) i++;
	return `${base}-${i}`;
}

/**
 * Update a node, keeping every property the patch does not name. It merges
 * into the node as the adapter holds it NOW, not as the view last saw it, so
 * two writes in one handler never undo each other.
 */
export async function patchNode(
	adapter: DataAdapter,
	node: ContextNode,
	patch: Record<string, unknown>,
	fields: { name?: string; description?: string } = {}
): Promise<ContextNode> {
	const current = (await adapter.getNode(node.id)) ?? node;
	return adapter.updateNode(node.id, { ...fields, properties: { ...(current.properties ?? {}), ...patch } });
}

/** Update a link, keeping every property the patch does not name. Merges into the link as it is now. */
export async function patchLink(
	adapter: DataAdapter,
	link: ContextLink,
	patch: Record<string, unknown>,
	label?: string
): Promise<void> {
	if (!adapter.updateLink) return;
	const siblings = await adapter.getLinks({ source_id: link.source_id, destination_id: link.destination_id });
	const current = siblings.find((l) => l.id === link.id) ?? link;
	await adapter.updateLink(link.id, {
		...(label !== undefined ? { label } : {}),
		properties: { ...(current.properties ?? {}), ...patch }
	});
}

export interface ModelFieldPatch {
	scope?: Scope;
	participants?: Participant[];
	stories?: BusinessStory[];
	walks?: Walk[];
	parked?: ParkedItem[];
	stepNotes?: Partial<Record<StepId, StepNote>>;
	layout?: MapLayout;
}

/** One Map's working data lives on the model node. */
export async function setModelFields(adapter: DataAdapter, cm: CmView, patch: ModelFieldPatch): Promise<void> {
	if (!cm.modelNode) return;
	await patchNode(adapter, cm.modelNode, patch as Record<string, unknown>);
}

export async function setStepNote(adapter: DataAdapter, cm: CmView, step: StepId, note: StepNote): Promise<void> {
	const next = { ...cm.stepNotes };
	if (!note.skipped && !note.note) delete next[step];
	else next[step] = { ...(note.skipped ? { skipped: true } : {}), ...(note.note ? { note: note.note } : {}) };
	await setModelFields(adapter, cm, { stepNotes: next });
}

// ── Order ────────────────────────────────────────────────────────────

/** `ids` with `dragId` moved to just before or just after `targetId`. */
export function moveId(ids: string[], dragId: string, targetId: string, position: 'before' | 'after'): string[] {
	if (!ids.includes(dragId) || dragId === targetId) return ids;
	const rest = ids.filter((id) => id !== dragId);
	const at = rest.indexOf(targetId);
	if (at === -1) return ids;
	rest.splice(position === 'after' ? at + 1 : at, 0, dragId);
	return rest;
}

/**
 * Number `items` 1, 2, 3… in the order of `orderedIds`, writing `order` only
 * where it changed. Every view sorts by it.
 */
export async function setOrder(
	adapter: DataAdapter,
	items: { id: string; node: ContextNode; order: number }[],
	orderedIds: string[]
): Promise<void> {
	const byId = new Map(items.map((item) => [item.id, item]));
	for (const [i, id] of orderedIds.entries()) {
		const item = byId.get(id);
		if (item && item.order !== i + 1) await patchNode(adapter, item.node, { order: i + 1 });
	}
}

// ── Concepts ─────────────────────────────────────────────────────────

/** A new Concept, placed in a Domain and linked to the story it came from. */
export async function addConcept(
	adapter: DataAdapter,
	name: string,
	place: { domainId?: string; storyIds?: string[] } = {}
): Promise<ContextNode> {
	const node = await adapter.createNode({ label: 'global_concept,global_glossary_term', name, properties: {} });
	if (place.domainId || place.storyIds?.length) {
		const [placement] = await adapter.getLinks({ label: 'has_concept', destination_id: node.id });
		if (placement) await patchLink(adapter, placement, { domainId: place.domainId, storyIds: place.storyIds ?? [] });
	}
	return node;
}

/** A Concept's place in this Map: its Domain and its stories. */
export async function placeConcept(
	adapter: DataAdapter,
	concept: CmConcept,
	patch: { domainId?: string | undefined; storyIds?: string[] }
): Promise<void> {
	if (concept.placement) await patchLink(adapter, concept.placement, patch);
}

/** True when anything else points at the Concept, so removing it drops more than the box. */
export function conceptIsReferenced(cm: CmView, conceptId: string): boolean {
	return (
		cm.relationships.some((r) => r.sourceId === conceptId || r.targetId === conceptId) ||
		cm.events.some((e) => e.conceptIds.includes(conceptId) || e.conceptId === conceptId)
	);
}

// ── Relationships ────────────────────────────────────────────────────

export function addRelationship(
	adapter: DataAdapter,
	sourceId: string,
	targetId: string,
	verb: string,
	inverseVerb: string
): Promise<ContextLink> {
	return adapter.createLink({
		source_id: sourceId,
		destination_id: targetId,
		label: verb,
		properties: inverseVerb ? { inverseLabel: inverseVerb } : {}
	});
}

// ── Core Business Events ─────────────────────────────────────────────

export async function joinEvent(adapter: DataAdapter, eventId: string, conceptId: string): Promise<void> {
	await adapter.createLink({ source_id: eventId, destination_id: conceptId, label: 'event_involves_concept', properties: {} });
}

export async function unjoinEvent(adapter: DataAdapter, event: CmEvent, conceptId: string): Promise<void> {
	const link = event.joinLinks.find((l) => l.destination_id === conceptId);
	if (link) await adapter.deleteLink(link.id);
}

// ── Walks and the parked list ────────────────────────────────────────

export function walkFor(cm: CmView, type: Walk['subject']['type'], id: string): Walk | undefined {
	return cm.walks.find((w) => w.subject.type === type && w.subject.id === id);
}

/** The parked-list id of the item a stuck walk adds when it is ruled out of scope or parked. */
export function parkedIdForWalk(walk: Walk): string {
	return `from-${walk.id}`;
}

/**
 * Set, change or clear (patch = null) the one Walk for a story or question.
 * Only a stuck walk keeps a resolution. When a walk stops being stuck with
 * Out of scope or Parked, the item it put on the parked list goes in the
 * same write, from Step 10 or Step 11. When the story or question itself is
 * removed, the store's pruneReferences takes the walk and the item together.
 */
export async function setWalk(
	adapter: DataAdapter,
	cm: CmView,
	subject: Walk['subject'],
	patch: Partial<Omit<Walk, 'id' | 'subject'>> | null
): Promise<void> {
	const existing = walkFor(cm, subject.type, subject.id);
	let next: Walk | undefined;
	if (patch !== null) {
		next = existing
			? { ...existing, ...patch }
			: { id: uniqueSlug(`walk-${subject.type}`, cm.walks.map((w) => w.id)), subject, result: 'holds', ...patch };
		if (next.result !== 'stuck') delete next.resolution;
	}

	// The new walk takes the old one's place in the list
	const walks = cm.walks.filter((w) => w !== existing);
	if (next) walks.splice(existing ? cm.walks.indexOf(existing) : walks.length, 0, next);

	const fields: ModelFieldPatch = { walks };
	const parks = next?.result === 'stuck' && (next.resolution === 'out-of-scope' || next.resolution === 'parked');
	if (existing && !parks) {
		const id = parkedIdForWalk(existing);
		if (cm.parked.some((p) => p.id === id)) fields.parked = cm.parked.filter((p) => p.id !== id);
	}
	await setModelFields(adapter, cm, fields);
}

/** Add an item to the parked list, or replace the one with the same id. */
export async function park(adapter: DataAdapter, cm: CmView, item: Omit<ParkedItem, 'id'> & { id?: string }): Promise<void> {
	const id = item.id ?? uniqueSlug(item.text, cm.parked.map((p) => p.id));
	const entry: ParkedItem = { ...item, id };
	const exists = cm.parked.some((p) => p.id === id);
	await setModelFields(adapter, cm, {
		parked: exists ? cm.parked.map((p) => (p.id === id ? entry : p)) : [...cm.parked, entry]
	});
}
