import type { DataAdapter, ContextNode, ContextLink } from '$lib/cp-shared';
import { getNodeLabels } from '$lib/cp-shared';
import type { ConceptModelStore } from '$lib/stores/concept-model.svelte';
import type { Concept, ConceptRelationship, CoreBusinessEvent, CoreBusinessProcess, Domain, BusinessQuestion } from '$lib/types';
import {
	conceptModelToContextPlane,
	contextPlaneToConceptModel,
	graphId,
	modelFieldsFromGraph
} from '$lib/converters/context-plane';

type NodeKind = 'model' | 'concept' | 'event' | 'process' | 'domain' | 'question';

function kindOf(node: ContextNode): NodeKind | null {
	const labels = getNodeLabels(node);
	if (labels.includes('cm_model')) return 'model';
	if (labels.includes('global_concept')) return 'concept';
	if (labels.includes('global_core_business_event')) return 'event';
	if (labels.includes('global_core_business_process')) return 'process';
	if (labels.includes('global_domain')) return 'domain';
	if (labels.includes('global_business_question')) return 'question';
	return null;
}

/**
 * Copies the listed keys that are present in `from`. An empty string, null or
 * `false` clears the field, so the saved JSON only carries what is set.
 */
function pick<T>(from: Record<string, unknown>, keys: string[]): Partial<T> {
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		if (!Object.prototype.hasOwnProperty.call(from, key)) continue;
		const value = from[key];
		out[key] = value === '' || value === null || value === false ? undefined : value;
	}
	return out as Partial<T>;
}

/**
 * Create a DataAdapter that wraps the native ConceptModelStore.
 *
 * The canvas speaks graph ids ({ nodes, links } from the converter). This
 * adapter turns every write back into a store call in native ids.
 */
export function createStandaloneAdapter(store: ConceptModelStore): { adapter: DataAdapter } {
	function getSnapshot() {
		return conceptModelToContextPlane(store.getModel());
	}

	function indexSnapshot() {
		const snap = getSnapshot();
		const nodeById = new Map(snap.nodes.map((n) => [n.id, n]));
		const linkById = new Map(snap.links.map((l) => [l.id, l]));
		const nativeId = (gid: string): string | undefined => {
			const sourceId = nodeById.get(gid)?.properties?.sourceId;
			return typeof sourceId === 'string' ? sourceId : undefined;
		};
		const nativeRelId = (lid: string): string | undefined => {
			const sourceRelId = linkById.get(lid)?.properties?.sourceRelId;
			return typeof sourceRelId === 'string' ? sourceRelId : undefined;
		};
		return { ...snap, nodeById, linkById, nativeId, nativeRelId };
	}

	function freshNode(id: string): ContextNode | undefined {
		return getSnapshot().nodes.find((n) => n.id === id);
	}

	function freshLink(id: string): ContextLink | undefined {
		return getSnapshot().links.find((l) => l.id === id);
	}

	const adapter: DataAdapter = {
		async getNodes(filter) {
			const { nodes } = getSnapshot();
			if (filter?.label) return nodes.filter((n) => getNodeLabels(n).includes(filter.label!));
			return nodes;
		},

		async getNode(id) {
			return freshNode(id) ?? null;
		},

		async createNode(input) {
			const now = new Date().toISOString();
			const name = input.name || 'Untitled';
			const labels = input.label.split(',').map((l) => l.trim());

			let id: string | null = null;
			if (labels.includes('global_concept')) id = graphId.concept(store.addConcept(name));
			else if (labels.includes('global_core_business_event')) id = graphId.event(store.addCoreEvent(name));
			else if (labels.includes('global_core_business_process')) id = graphId.process(store.addCoreProcess(name));
			else if (labels.includes('global_domain')) id = graphId.domain(store.addDomain(name));
			else if (labels.includes('global_business_question')) id = graphId.question(store.addBusinessQuestion(name));
			else if (labels.includes('cm_model')) {
				await store.newModel(name);
				id = graphId.model(store.getModel().id);
			}

			const created = id ? freshNode(id) : undefined;
			return created ?? { id: `temp-${Date.now()}`, label: input.label, name, properties: input.properties || null, created_at: now, updated_at: now };
		},

		async updateNode(id, updates) {
			const idx = indexSnapshot();
			const node = idx.nodeById.get(id);
			if (!node) return { id, label: '', name: '', ...updates } as ContextNode;

			const kind = kindOf(node);
			const sourceId = idx.nativeId(id) ?? '';
			const props = (updates.properties ?? {}) as Record<string, unknown>;
			const common: { name?: string; description?: string } = {};
			if (updates.name !== undefined) common.name = updates.name;
			if (updates.description !== undefined) common.description = updates.description ?? '';

			switch (kind) {
				case 'concept':
					store.updateConcept(sourceId, {
						...common,
						...pick<Concept>(props, ['aliases', 'order', 'definitionCategory', 'definitionDifferentiator', 'examples', 'specialCases', 'definitionStatus', 'w', 'notes'])
					});
					break;
				case 'event': {
					const upd: Partial<CoreBusinessEvent> = { ...common, ...pick<CoreBusinessEvent>(props, ['order', 'notes']) };
					if (Object.prototype.hasOwnProperty.call(props, 'relationshipId')) {
						upd.relationshipId = typeof props.relationshipId === 'string' ? idx.nativeRelId(props.relationshipId) : undefined;
					}
					if (Object.prototype.hasOwnProperty.call(props, 'conceptId')) {
						upd.conceptId = typeof props.conceptId === 'string' ? idx.nativeId(props.conceptId) : undefined;
					}
					store.updateCoreEvent(sourceId, upd);
					break;
				}
				case 'process':
					store.updateCoreProcess(sourceId, { ...common, ...pick<CoreBusinessProcess>(props, ['order', 'notes']) });
					break;
				case 'domain':
					store.updateDomain(sourceId, { ...common, ...pick<Domain>(props, ['order', 'owner', 'aliases', 'notes']) });
					break;
				case 'question':
					store.updateBusinessQuestion(sourceId, {
						...(common.name !== undefined ? { name: common.name } : {}),
						...pick<BusinessQuestion>(props, ['order', 'askedBy'])
					});
					break;
				case 'model': {
					if (updates.name) store.renameModel(updates.name);
					if (updates.description !== undefined) store.updateDescription(updates.description ?? '');
					const fields = modelFieldsFromGraph(props, idx.nativeId);
					if (Object.keys(fields).length > 0) store.updateModelFields(fields);
					break;
				}
			}

			return freshNode(id) ?? ({ ...node, ...updates } as ContextNode);
		},

		async deleteNode(id) {
			const idx = indexSnapshot();
			const node = idx.nodeById.get(id);
			if (!node) return;
			const sourceId = idx.nativeId(id) ?? '';
			switch (kindOf(node)) {
				case 'concept':
					store.removeConcept(sourceId);
					break;
				case 'event':
					store.removeCoreEvent(sourceId);
					break;
				case 'process':
					store.removeCoreProcess(sourceId);
					break;
				case 'domain':
					store.removeDomain(sourceId);
					break;
				case 'question':
					store.removeBusinessQuestion(sourceId);
					break;
			}
		},

		async getLinks(filter) {
			const { links } = getSnapshot();
			return links.filter(
				(l) =>
					(!filter?.label || l.label === filter.label) &&
					(!filter?.source_id || l.source_id === filter.source_id) &&
					(!filter?.destination_id || l.destination_id === filter.destination_id)
			);
		},

		async createLink(input) {
			const now = new Date().toISOString();
			const synthetic = { id: `temp-${Date.now()}`, ...input, created_at: now, updated_at: now } as ContextLink;
			const idx = indexSnapshot();
			const source = idx.nodeById.get(input.source_id);
			const target = idx.nodeById.get(input.destination_id);
			if (!source || !target) return synthetic;
			const sourceKind = kindOf(source);
			const targetKind = kindOf(target);
			const sourceId = idx.nativeId(source.id) ?? '';
			const targetId = idx.nativeId(target.id) ?? '';

			// A Relationship between two Concepts (Step 6)
			if (sourceKind === 'concept' && targetKind === 'concept') {
				const extra = pick<ConceptRelationship>((input.properties ?? {}) as Record<string, unknown>, ['inverseLabel', 'rule', 'flagged', 'cardinality']);
				const relId = store.addRelationship(sourceId, targetId, input.label, extra);
				return freshLink(graphId.relationship(relId)) ?? synthetic;
			}

			// A Core Business Event joining a Concept (the Core Business Events tab)
			if (sourceKind === 'event' && targetKind === 'concept' && input.label === 'event_involves_concept') {
				const ev = store.getModel().coreBusinessEvents.find((e) => e.id === sourceId);
				const joined = ev?.conceptIds ?? [];
				if (ev && !joined.includes(targetId)) store.updateCoreEvent(sourceId, { conceptIds: [...joined, targetId] });
				return freshLink(`link_evc_${sourceId}__${targetId}`) ?? synthetic;
			}

			return synthetic;
		},

		async updateLink(id, updates) {
			const idx = indexSnapshot();
			const link = idx.linkById.get(id);
			if (!link) return { id, source_id: '', destination_id: '', label: '', ...updates } as ContextLink;
			const props = (updates.properties ?? {}) as Record<string, unknown>;

			if (link.label === 'has_concept') {
				// A Concept's place in this Map: its Domain and the stories it came from
				const conceptId = idx.nativeId(link.destination_id);
				if (conceptId) {
					const upd: Partial<Concept> = {};
					if (Object.prototype.hasOwnProperty.call(props, 'domainId')) {
						upd.domainId = typeof props.domainId === 'string' ? idx.nativeId(props.domainId) : undefined;
					}
					if (Object.prototype.hasOwnProperty.call(props, 'storyIds')) {
						upd.storyIds = Array.isArray(props.storyIds) ? (props.storyIds as string[]) : undefined;
					}
					store.updateConcept(conceptId, upd);
				}
			} else {
				const relId = idx.nativeRelId(id);
				if (relId) {
					store.updateRelationship(relId, {
						...(updates.label !== undefined ? { label: updates.label } : {}),
						...pick<ConceptRelationship>(props, ['inverseLabel', 'rule', 'flagged', 'cardinality'])
					});
				}
			}

			return freshLink(id) ?? ({ ...link, ...updates } as ContextLink);
		},

		async deleteLink(id) {
			const idx = indexSnapshot();
			const link = idx.linkById.get(id);
			if (!link) return;
			const relId = idx.nativeRelId(id);
			if (relId) {
				store.removeRelationship(relId);
			} else if (link.label === 'event_involves_concept') {
				const eventId = idx.nativeId(link.source_id);
				const conceptId = idx.nativeId(link.destination_id);
				const ev = store.getModel().coreBusinessEvents.find((e) => e.id === eventId);
				if (ev && conceptId) store.updateCoreEvent(ev.id, { conceptIds: (ev.conceptIds ?? []).filter((c) => c !== conceptId) });
			}
		},

		async exportAll() {
			return getSnapshot();
		},

		async importAll(data) {
			const cmModel = contextPlaneToConceptModel(data);
			await store.importJSON(JSON.stringify(cmModel));
		}
	};

	return { adapter };
}
