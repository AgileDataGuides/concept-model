import type { ConceptModel } from '$lib/types';

/**
 * The Context Plane flags a `global_concept` as a Concept or a Metric on its
 * `conceptKind` property. A Metric, such as Recurring Revenue, is a count or
 * amount worked out from Concepts, with a glossary definition. It is not a
 * Concept in the Blue Book's sense, and this app shows the Blue Book's
 * Concepts only, so every load path drops a Metric: `migrateModel` for a JSON
 * file and `contextPlaneToConceptModel` for a graph. The app never shows the
 * flag.
 */
export function isMetric(record: object | null | undefined): boolean {
	return (record as { conceptKind?: unknown } | null | undefined)?.conceptKind === 'metric';
}

/**
 * The model with every Metric taken out, and every Relationship, Event join
 * and Map position that pointed at one. Returns the input when it holds none.
 */
export function withoutMetrics(model: ConceptModel): ConceptModel {
	const metricIds = new Set(model.concepts.filter(isMetric).map((c) => c.id));
	if (metricIds.size === 0) return model;

	const droppedRelIds = new Set(
		model.relationships
			.filter((r) => metricIds.has(r.sourceConceptId) || metricIds.has(r.targetConceptId))
			.map((r) => r.id)
	);
	const layoutConcepts = model.layout
		? Object.fromEntries(Object.entries(model.layout.concepts ?? {}).filter(([id]) => !metricIds.has(id)))
		: undefined;

	return {
		...model,
		concepts: model.concepts.filter((c) => !metricIds.has(c.id)),
		relationships: model.relationships.filter((r) => !droppedRelIds.has(r.id)),
		coreBusinessEvents: model.coreBusinessEvents.map((ev) => ({
			...ev,
			conceptIds: ev.conceptIds?.filter((id) => !metricIds.has(id)),
			conceptId: ev.conceptId && metricIds.has(ev.conceptId) ? undefined : ev.conceptId,
			relationshipId: ev.relationshipId && droppedRelIds.has(ev.relationshipId) ? undefined : ev.relationshipId
		})),
		...(model.layout && layoutConcepts ? { layout: { ...model.layout, concepts: layoutConcepts } } : {})
	};
}
