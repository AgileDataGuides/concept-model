// A Concept the Context Plane flagged Metric never reaches this app, by either load path.

import { describe, expect, it } from 'vitest';
import { getLanguage } from '$lib/languages';
import type { ConceptModel } from '$lib/types';
import { migrateModel } from './migrate';
import { conceptModelToContextPlane, contextPlaneToConceptModel, graphId } from '$lib/converters/context-plane';

function modelWithAMetric(): ConceptModel {
	return {
		version: '2.0',
		id: 'm',
		name: 'With a Metric',
		description: '',
		concepts: [
			{ id: 'subscription', name: 'Subscription', description: '', aliases: [] },
			// Set back to Concept in the Context Plane, so the flag is there with the other value
			{ id: 'plan', name: 'Plan', description: '', aliases: [], conceptKind: 'concept' } as ConceptModel['concepts'][number],
			{ id: 'mrr', name: 'Recurring Revenue', description: '', aliases: [], conceptKind: 'metric' } as ConceptModel['concepts'][number]
		],
		relationships: [
			{ id: 'r-on', sourceConceptId: 'subscription', targetConceptId: 'plan', label: 'is on' },
			{ id: 'r-gen', sourceConceptId: 'subscription', targetConceptId: 'mrr', label: 'generates' }
		],
		coreBusinessEvents: [
			{ id: 'e', name: 'Customer Subscribes', description: '', conceptIds: ['subscription', 'mrr'], relationshipId: 'r-gen', conceptId: 'mrr' }
		],
		coreBusinessProcesses: [],
		domains: [],
		layout: { concepts: { subscription: { x: 0, y: 0 }, plan: { x: 1, y: 0 }, mrr: { x: 2, y: 0 } }, events: {} }
	};
}

describe('a Metric from the Context Plane', () => {
	it('is dropped from a JSON file, with everything that pointed at it', () => {
		const model = migrateModel(modelWithAMetric());
		expect(model.concepts.map((c) => c.name)).toEqual(['Subscription', 'Plan']);
		expect(model.relationships.map((r) => r.id)).toEqual(['r-on']);
		expect(model.coreBusinessEvents[0]).toMatchObject({ conceptIds: ['subscription'], relationshipId: undefined, conceptId: undefined });
		expect(Object.keys(model.layout!.concepts)).toEqual(['subscription', 'plan']);
	});

	it('is dropped from a graph', () => {
		// The converter writes no flag, so set it on the node as the Context Plane would
		const graph = conceptModelToContextPlane(modelWithAMetric());
		const metricNode = graph.nodes.find((n) => n.id === graphId.concept('mrr'))!;
		metricNode.properties = { ...metricNode.properties, conceptKind: 'metric' };
		const conceptNode = graph.nodes.find((n) => n.id === graphId.concept('plan'))!;
		conceptNode.properties = { ...conceptNode.properties, conceptKind: 'concept' };

		const model = contextPlaneToConceptModel(graph);
		expect(model.concepts.map((c) => c.name)).toEqual(['Subscription', 'Plan']);
		expect(model.relationships.map((r) => r.id)).toEqual(['r-on']);
		expect(model.coreBusinessEvents[0]).toMatchObject({ conceptIds: ['subscription'], relationshipId: undefined, conceptId: undefined });
		expect(Object.keys(model.layout!.concepts)).toEqual(['subscription', 'plan']);
	});

	it('is dropped from a Turtle or RDF/XML file, which carries the flag', () => {
		const graph = conceptModelToContextPlane(modelWithAMetric());
		const metricNode = graph.nodes.find((n) => n.id === graphId.concept('mrr'))!;
		metricNode.properties = { ...metricNode.properties, conceptKind: 'metric' };

		for (const id of ['turtle', 'rdf-xml']) {
			const language = getLanguage(id)!;
			const text = language.export!(graph);
			expect(text).toContain('conceptKind');
			const model = migrateModel(contextPlaneToConceptModel(language.import!(text)));
			expect(model.concepts.map((c) => c.name).sort()).toEqual(['Plan', 'Subscription']);
			expect(model.relationships).toHaveLength(1);
		}
	});

	it('leaves a model with no Metric as it was', () => {
		const model = { ...modelWithAMetric(), concepts: modelWithAMetric().concepts.slice(0, 2) };
		expect(migrateModel(model).concepts).toHaveLength(2);
	});
});
