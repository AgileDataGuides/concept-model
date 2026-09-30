import type { DataAdapter, ContextNode, ContextLink } from '$lib/cp-shared';
import type { ConceptModelStore } from '$lib/stores/concept-model.svelte';
import { conceptModelToContextPlane, contextPlaneToConceptModel } from '$lib/converters/context-plane';

/**
 * Create a DataAdapter that wraps the native ConceptModelStore.
 * The adapter converts between ContextNode/ContextLink format and the native model.
 */
export function createStandaloneAdapter(store: ConceptModelStore): { adapter: DataAdapter } {
	// Maintain a live cache of nodes/links derived from the model
	function getSnapshot() {
		return conceptModelToContextPlane(store.getModel());
	}

	const adapter: DataAdapter = {
		async getNodes(filter) {
			const { nodes } = getSnapshot();
			if (filter?.label) return nodes.filter((n) => n.label.includes(filter.label!));
			return nodes;
		},
		async getNode(id) {
			const { nodes } = getSnapshot();
			return nodes.find((n) => n.id === id) ?? null;
		},
		async createNode(input) {
			const now = new Date().toISOString();
			const name = input.name || 'Untitled';
			const label = input.label;

			if (label === 'global_concept') {
				store.addConcept(name);
			} else if (label === 'global_core_business_event') {
				store.addCoreEvent(name);
			} else if (label === 'global_core_business_process') {
				store.addCoreProcess(name);
			} else if (label === 'global_domain') {
				store.addDomain(name);
			} else if (label === 'cm_model') {
				await store.newModel(name);
			}

			// Return a synthetic node (the store has already updated)
			const { nodes } = getSnapshot();
			const found = nodes.find((n) => n.name === name && n.label.includes(label));
			return found || { id: `temp-${Date.now()}`, label, name, properties: input.properties || null, created_at: now, updated_at: now };
		},
		async updateNode(id, updates) {
			const { nodes } = getSnapshot();
			const node = nodes.find((n) => n.id === id);
			if (!node) { return { id, label: '', name: '', ...updates } as ContextNode; }

			const sourceId = (node.properties?.sourceId as string) || '';

			if (node.label.includes('global_concept')) {
				const upd: Record<string, unknown> = {};
				if (updates.name !== undefined) upd.name = updates.name;
				if (updates.description !== undefined) upd.description = updates.description;
				if (updates.properties?.aliases) upd.aliases = updates.properties.aliases;
				if (updates.properties?.order !== undefined) upd.order = updates.properties.order;
				if (updates.properties?.definitionCategory !== undefined) upd.definitionCategory = updates.properties.definitionCategory;
				if (updates.properties?.definitionDifferentiator !== undefined) upd.definitionDifferentiator = updates.properties.definitionDifferentiator;
				store.updateConcept(sourceId, upd as any);
			} else if (node.label.includes('global_core_business_event')) {
				const upd: Record<string, unknown> = {};
				if (updates.name !== undefined) upd.name = updates.name;
				if (updates.description !== undefined) upd.description = updates.description;
				if (updates.properties?.order !== undefined) upd.order = updates.properties.order;
				store.updateCoreEvent(sourceId, upd as any);
			} else if (node.label.includes('global_core_business_process')) {
				const upd: Record<string, unknown> = {};
				if (updates.name !== undefined) upd.name = updates.name;
				if (updates.description !== undefined) upd.description = updates.description;
				if (updates.properties?.order !== undefined) upd.order = updates.properties.order;
				store.updateCoreProcess(sourceId, upd as any);
			} else if (node.label.includes('global_domain')) {
				const upd: Record<string, unknown> = {};
				if (updates.name !== undefined) upd.name = updates.name;
				if (updates.description !== undefined) upd.description = updates.description;
				if (updates.properties?.order !== undefined) upd.order = updates.properties.order;
				store.updateDomain(sourceId, upd as any);
			} else if (node.label.includes('cm_model')) {
				if (updates.name) store.renameModel(updates.name);
				if (updates.description) store.updateDescription(updates.description);
			}

			return { ...node, ...updates } as ContextNode;
		},
		async deleteNode(id) {
			const { nodes } = getSnapshot();
			const node = nodes.find((n) => n.id === id);
			if (!node) return;
			const sourceId = (node.properties?.sourceId as string) || '';

			if (node.label.includes('global_concept')) store.removeConcept(sourceId);
			else if (node.label.includes('global_core_business_event')) store.removeCoreEvent(sourceId);
			else if (node.label.includes('global_core_business_process')) store.removeCoreProcess(sourceId);
			else if (node.label.includes('global_domain')) store.removeDomain(sourceId);
		},
		async getLinks(filter) {
			const { links } = getSnapshot();
			if (filter?.label) return links.filter((l) => l.label === filter.label);
			if (filter?.source_id) return links.filter((l) => l.source_id === filter.source_id);
			return links;
		},
		async createLink(input) {
			const now = new Date().toISOString();
			// Only handle concept-to-concept relationship links
			const { nodes } = getSnapshot();
			const source = nodes.find((n) => n.id === input.source_id);
			const target = nodes.find((n) => n.id === input.destination_id);
			if (source?.label.includes('global_concept') && target?.label.includes('global_concept')) {
				const sourceConceptId = (source.properties?.sourceId as string) || '';
				const targetConceptId = (target.properties?.sourceId as string) || '';
				store.addRelationship(sourceConceptId, targetConceptId, input.label, (input.properties?.cardinality as string) || '');
			}
			return { id: `temp-${Date.now()}`, ...input, created_at: now, updated_at: now } as ContextLink;
		},
		async deleteLink(id) {
			const { links } = getSnapshot();
			const link = links.find((l) => l.id === id);
			if (link?.properties?.sourceRelId) {
				store.removeRelationship(link.properties.sourceRelId as string);
			}
		},
		async exportAll() { return getSnapshot(); },
		async importAll(data) {
			const cmModel = contextPlaneToConceptModel(data);
			await store.importJSON(JSON.stringify(cmModel));
		}
	};

	return { adapter };
}
