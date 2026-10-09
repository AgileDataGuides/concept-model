// Turtle and RDF/XML round trips of the SaaS and Blue Book examples, through this app's own
// converter: the native model to the graph, the graph to RDF, and back.

import { describe, expect, it } from 'vitest';
import { getLanguage } from '$lib/languages';
import sample from '../../../../data/saas-revenue-concept-model.json';
import blueBookSample from '../../../../data/blue-book-retail-concept-model.json';
import type { ConceptModel } from '$lib/types';
import { migrateModel } from '$lib/model/migrate';
import { conceptModelToContextPlane, contextPlaneToConceptModel } from './context-plane';

/** Drop undefined values and empty lists, which mean the same as a missing key. */
function strip<T>(value: T): T {
	return JSON.parse(JSON.stringify(value, (_key, v) => (Array.isArray(v) && v.length === 0 ? undefined : v)));
}

/**
 * The model with each Concept known by its name and each Relationship by its
 * sentence. An import mints a Concept's id from its name and a Relationship's
 * from its sentence, so an id the app minted long ago can come back different.
 */
function comparable(model: ConceptModel) {
	const conceptName = new Map(model.concepts.map((c) => [c.id, c.name]));
	const concept = (id?: string) => (id ? (conceptName.get(id) ?? `missing ${id}`) : undefined);
	const sentence = new Map(model.relationships.map((r) => [r.id, `${concept(r.sourceConceptId)} ${r.label} ${concept(r.targetConceptId)}`]));
	return strip({
		...model,
		concepts: model.concepts.map((c) => ({ ...c, id: concept(c.id) })),
		relationships: model.relationships.map((r) => ({
			...r,
			id: sentence.get(r.id),
			sourceConceptId: concept(r.sourceConceptId),
			targetConceptId: concept(r.targetConceptId)
		})),
		coreBusinessEvents: model.coreBusinessEvents.map((e) => ({
			...e,
			conceptIds: e.conceptIds?.map(concept),
			conceptId: concept(e.conceptId),
			relationshipId: e.relationshipId ? sentence.get(e.relationshipId) : undefined
		})),
		layout: model.layout && {
			...model.layout,
			concepts: Object.fromEntries(Object.entries(model.layout.concepts).map(([id, at]) => [concept(id), at]))
		}
	});
}

describe.each(['turtle', 'rdf-xml'])('%s', (languageId) => {
	const language = getLanguage(languageId)!;
	const model = migrateModel(sample as unknown as ConceptModel);

	it('brings the SaaS example back whole: every step, rule, Event and Map position', () => {
		const file = language.export(conceptModelToContextPlane(model));
		const back = migrateModel(contextPlaneToConceptModel(language.import(file)));
		expect(comparable(back)).toEqual(comparable(model));
	});

	it('brings the Blue Book retail example back whole', () => {
		const blueBook = migrateModel(blueBookSample as unknown as ConceptModel);
		const back = migrateModel(contextPlaneToConceptModel(language.import(language.export(conceptModelToContextPlane(blueBook)))));
		expect(comparable(back)).toEqual(comparable(blueBook));
	});

	it('keeps every id the app minted from a name', () => {
		const back = contextPlaneToConceptModel(language.import(language.export(conceptModelToContextPlane(model))));
		expect(back.id).toBe(model.id);
		expect(back.domains.map((d) => d.id)).toEqual(model.domains.map((d) => d.id));
		expect(back.coreBusinessEvents.map((e) => e.id)).toEqual(model.coreBusinessEvents.map((e) => e.id));
		expect((back.walks ?? []).map((w) => w.id)).toEqual((model.walks ?? []).map((w) => w.id));
	});

	it('round-trips an edited model: a renamed Concept, a half-set rule, an empty Model', () => {
		const edited: ConceptModel = {
			...model,
			concepts: model.concepts.map((c, i) => (i === 0 ? { ...c, name: 'Lead (Prospect)' } : c)),
			relationships: model.relationships.map((r, i) => (i === 0 ? { ...r, rule: { forward: r.rule?.forward }, cardinality: undefined } : r))
		};
		const back = migrateModel(contextPlaneToConceptModel(language.import(language.export(conceptModelToContextPlane(edited)))));
		expect(comparable(back)).toEqual(comparable(edited));

		const empty: ConceptModel = { version: '2.0', id: 'empty', name: 'Empty', description: '', concepts: [], relationships: [], coreBusinessEvents: [], coreBusinessProcesses: [], domains: [] };
		expect(contextPlaneToConceptModel(language.import(language.export(conceptModelToContextPlane(empty))))).toMatchObject({ name: 'Empty', concepts: [] });
	});
});
