import { MODEL_VERSION, type ConceptModel } from '$lib/types';
import { parseLegacyCardinality } from './rules';

/**
 * Bring a saved Concept Model up to the current version. Runs on every load
 * path (list, switch, import). Returns a new object, the input is untouched.
 *
 * 1.0 to 2.0: a legacy `cardinality` string becomes a Relationship Rule only
 * when both ends parse without guessing. Anything else stays as text, and
 * Step 7 shows it as "To restate". Every 2.0 field is optional, so nothing
 * else needs converting.
 */
export function migrateModel(raw: ConceptModel): ConceptModel {
	const model: ConceptModel = {
		...raw,
		description: raw.description ?? '',
		concepts: (raw.concepts ?? []).map((c) => ({ ...c, description: c.description ?? '', aliases: c.aliases ?? [] })),
		relationships: raw.relationships ?? [],
		coreBusinessEvents: raw.coreBusinessEvents ?? [],
		coreBusinessProcesses: raw.coreBusinessProcesses ?? [],
		domains: raw.domains ?? []
	};

	if (model.version !== MODEL_VERSION) {
		model.relationships = model.relationships.map((rel) => {
			if (rel.rule || !rel.cardinality) return rel;
			const rule = parseLegacyCardinality(rel.cardinality);
			return rule ? { ...rel, rule } : rel;
		});
		model.version = MODEL_VERSION;
	}

	return model;
}
