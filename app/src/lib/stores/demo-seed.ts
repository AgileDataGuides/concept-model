// Demo-mode seed for the Concept Model standalone GitHub Pages build.
//
// This file imports the example concept model JSON via the `$data` Vite
// alias (defined in `apps/concept-model/app/vite.config.ts`). It is
// therefore only safe to import from the standalone app's own entrypoints
// (e.g. `+page.svelte`). Anything that imports `concept-model.svelte.ts`
// from outside this app must NOT import this file — keeping the
// `$data`-resolved imports out of its build graph.
//
// The version-aware overlay logic lives in `@context-plane/shared/demo-seed`.
// This file just declares the bundled JSONs + seed version.
//
// To roll out updated examples to existing visitors, bump SEED_VERSION
// to today's date and re-publish.

import { applyDemoSeeds } from '$lib/cp-shared-demo-seed';
import type { ConceptModel } from '$lib/types';

import saasRevenueSeed from '$data/saas-revenue-concept-model.json';
import blueBookRetailSeed from '$data/blue-book-retail-concept-model.json';

// Must match LS_KEY in `concept-model.svelte.ts` — the store reads what this seeds.
const LS_KEY = 'concept-model-demo-models';
const SEED_VERSION_KEY = 'concept-model-demo-seed-version';

/** Bump when bundled JSONs change. ISO date, with a suffix for a second change on one day. */
const SEED_VERSION = '2026-10-09b';

const SEEDS: ConceptModel[] = [
	blueBookRetailSeed as unknown as ConceptModel,
	saasRevenueSeed as unknown as ConceptModel
];

/**
 * Apply demo seeds. Call from `+page.svelte` `onMount` BEFORE `initStore()`,
 * gated by `VITE_DEMO_MODE === 'true'`.
 */
export function applyConceptModelDemoSeeds(): void {
	applyDemoSeeds<ConceptModel>({
		lsKey: LS_KEY,
		seedVersionKey: SEED_VERSION_KEY,
		seedVersion: SEED_VERSION,
		seeds: SEEDS
	});
}
