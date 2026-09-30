import type { ContextNode, ContextLink } from '$lib/cp-shared';
import type { ConceptModel } from '$lib/types';

/**
 * Convert a native ConceptModel to Context Plane { nodes, links } format.
 */
export function conceptModelToContextPlane(model: ConceptModel): { nodes: ContextNode[]; links: ContextLink[] } {
	const nodes: ContextNode[] = [];
	const links: ContextLink[] = [];
	const now = new Date().toISOString();

	// Model node (used as anchor in CP)
	const modelNodeId = `cm_model_${model.id}`;
	nodes.push({
		id: modelNodeId,
		label: 'cm_model',
		name: model.name,
		description: model.description || null,
		properties: { sourceId: model.id },
		created_at: now, updated_at: now
	});

	// Concepts
	for (let i = 0; i < model.concepts.length; i++) {
		const concept = model.concepts[i];
		const nodeId = `cm_concept_${concept.id}`;
		nodes.push({
			id: nodeId,
			label: 'global_concept,global_glossary_term',
			name: concept.name,
			description: concept.description || null,
			properties: { sourceId: concept.id, aliases: concept.aliases || [], order: concept.order ?? i + 1, definitionCategory: concept.definitionCategory || '', definitionDifferentiator: concept.definitionDifferentiator || '' },
			created_at: now, updated_at: now
		});
		links.push({
			id: `link_model_concept_${concept.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_concept',
			properties: {},
			created_at: now, updated_at: now
		});
	}

	// Relationships between concepts
	for (const rel of model.relationships) {
		const sourceNodeId = `cm_concept_${rel.sourceConceptId}`;
		const targetNodeId = `cm_concept_${rel.targetConceptId}`;
		links.push({
			id: `link_rel_${rel.id}`,
			source_id: sourceNodeId,
			destination_id: targetNodeId,
			label: rel.label || 'relates_to',
			properties: { cardinality: rel.cardinality, sourceRelId: rel.id },
			created_at: now, updated_at: now
		});
	}

	// Core Business Events
	for (let i = 0; i < model.coreBusinessEvents.length; i++) {
		const ev = model.coreBusinessEvents[i];
		const nodeId = `cm_event_${ev.id}`;
		nodes.push({
			id: nodeId,
			label: 'global_core_business_event',
			name: ev.name,
			description: ev.description || null,
			properties: { sourceId: ev.id, order: ev.order ?? i + 1 },
			created_at: now, updated_at: now
		});
		links.push({
			id: `link_model_event_${ev.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_core_event',
			properties: {},
			created_at: now, updated_at: now
		});
	}

	// Core Business Processes
	for (let i = 0; i < model.coreBusinessProcesses.length; i++) {
		const proc = model.coreBusinessProcesses[i];
		const nodeId = `cm_process_${proc.id}`;
		nodes.push({
			id: nodeId,
			label: 'global_core_business_process',
			name: proc.name,
			description: proc.description || null,
			properties: { sourceId: proc.id, order: proc.order ?? i + 1 },
			created_at: now, updated_at: now
		});
		links.push({
			id: `link_model_process_${proc.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_core_process',
			properties: {},
			created_at: now, updated_at: now
		});
	}

	// Domains
	const domains = model.domains ?? [];
	for (let i = 0; i < domains.length; i++) {
		const dom = domains[i];
		const nodeId = `cm_domain_${dom.id}`;
		nodes.push({
			id: nodeId,
			label: 'global_domain',
			name: dom.name,
			description: dom.description || null,
			properties: { sourceId: dom.id, order: dom.order ?? i + 1 },
			created_at: now, updated_at: now
		});
		links.push({
			id: `link_model_domain_${dom.id}`,
			source_id: modelNodeId,
			destination_id: nodeId,
			label: 'has_domain',
			properties: {},
			created_at: now, updated_at: now
		});
	}

	return { nodes, links };
}

/**
 * Convert Context Plane { nodes, links } format back to a native ConceptModel.
 */
export function contextPlaneToConceptModel(
	data: { nodes: ContextNode[]; links: ContextLink[] },
	modelName?: string
): ConceptModel {
	const { nodes, links } = data;

	// Find model node
	const modelNode = nodes.find((n) => n.label === 'cm_model');
	const conceptNodes = nodes.filter((n) => n.label.includes('global_concept'));
	const eventNodes = nodes.filter((n) => n.label.includes('global_core_business_event'));
	const processNodes = nodes.filter((n) => n.label.includes('global_core_business_process'));
	const domainNodes = nodes.filter((n) => n.label.includes('global_domain'));

	// Build concept ID map (node.id → sourceId or derived)
	const conceptIdMap = new Map<string, string>();
	for (const n of conceptNodes) {
		const sourceId = (n.properties?.sourceId as string) || n.id;
		conceptIdMap.set(n.id, sourceId);
	}

	const concepts = conceptNodes.map((n) => ({
		id: conceptIdMap.get(n.id) || n.id,
		name: n.name,
		description: n.description || '',
		aliases: (n.properties?.aliases as string[]) || [],
		order: (n.properties?.order as number) || undefined,
		definitionCategory: (n.properties?.definitionCategory as string) || undefined,
		definitionDifferentiator: (n.properties?.definitionDifferentiator as string) || undefined
	}));

	// Extract relationships (links between concept nodes, excluding structural has_concept links)
	const structuralLabels = new Set(['has_concept', 'has_core_event', 'has_core_process', 'has_domain']);
	const conceptNodeIds = new Set(conceptNodes.map((n) => n.id));
	const relationships = links
		.filter((l) => !structuralLabels.has(l.label) && conceptNodeIds.has(l.source_id) && conceptNodeIds.has(l.destination_id))
		.map((l) => ({
			id: (l.properties?.sourceRelId as string) || l.id,
			sourceConceptId: conceptIdMap.get(l.source_id) || l.source_id,
			targetConceptId: conceptIdMap.get(l.destination_id) || l.destination_id,
			label: l.label,
			cardinality: (l.properties?.cardinality as string) || undefined
		}));

	const coreBusinessEvents = eventNodes.map((n) => ({
		id: (n.properties?.sourceId as string) || n.id,
		name: n.name,
		description: n.description || '',
		order: (n.properties?.order as number) || undefined
	}));

	const coreBusinessProcesses = processNodes.map((n) => ({
		id: (n.properties?.sourceId as string) || n.id,
		name: n.name,
		description: n.description || '',
		order: (n.properties?.order as number) || undefined
	}));

	const domains = domainNodes.map((n) => ({
		id: (n.properties?.sourceId as string) || n.id,
		name: n.name,
		description: n.description || '',
		order: (n.properties?.order as number) || undefined
	}));

	return {
		version: '1.0',
		id: modelNode?.id || 'imported',
		name: modelName || modelNode?.name || 'Imported Concept Model',
		description: modelNode?.description || '',
		concepts,
		relationships,
		coreBusinessEvents,
		coreBusinessProcesses,
		domains
	};
}
