// The Map's layers: the kinds of thing the Concept Map draws, each shown or
// hidden by a switch in the Map's top bar. The Blue Book draws one Map and
// shows more of it at each step: Domains and Concepts in Step 4, the
// Relationship lines and their verbs in Step 6, the rule words under each
// verb in Step 7, the Core Business Events in Step 8. So one model gives
// the figure for every step.
//
// One choice serves every Map on screen and Export SVG, so the file holds
// what the Map shows. It is a view choice, never part of the model: a
// per-viewer convenience, remembered in this browser like the selected step.

export type MapLayer = 'domains' | 'concepts' | 'relationships' | 'verbs' | 'rules' | 'events';

/** Every layer, in the order the book's steps add them to the Map. */
export const MAP_LAYERS: { id: MapLayer; label: string; title: string }[] = [
	{ id: 'domains', label: 'Domains', title: 'The pinned sheets of paper, each with its name' },
	{ id: 'concepts', label: 'Concepts', title: 'The sticky notes' },
	{ id: 'relationships', label: 'Relationship Lines', title: 'The green lines between Concepts' },
	{ id: 'verbs', label: 'Relationship Verbs', title: 'The Step 6 verbs on each Relationship line, and its sentences on hover' },
	{ id: 'rules', label: 'Relationship Rules', title: 'The Step 7 Relationship Rule words, such as one or many, on each Relationship line' },
	{ id: 'events', label: 'Events', title: 'The Core Business Event diamonds, their names and their dashed lines' }
];

export const ALL_MAP_LAYERS: readonly MapLayer[] = MAP_LAYERS.map((layer) => layer.id);

const STORAGE_KEY = 'cm-map-hidden-layers';

// Set once this browser has saved a choice that knows the Rules layer. Before
// it, the Verbs switch drew the rule words too, so a saved "Verbs off" means
// "no words on the lines" and hides Rules as well.
const RULES_KNOWN_KEY = 'cm-map-rules-layer-known';

// The layers turned off are what is kept, so a layer added later starts on
function remembered(): MapLayer[] {
	try {
		const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		if (!Array.isArray(saved)) return [];
		const legacyVerbsOff = saved.includes('verbs') && !localStorage.getItem(RULES_KNOWN_KEY);
		return ALL_MAP_LAYERS.filter((id) => saved.includes(id) || (legacyVerbsOff && id === 'rules'));
	} catch {
		// no storage: every layer shows
		return [];
	}
}

let hidden = $state<MapLayer[]>(remembered());

/** The layers the Map shows, in MAP_LAYERS order. */
export function shownLayers(): MapLayer[] {
	return ALL_MAP_LAYERS.filter((id) => !hidden.includes(id));
}

/** Show or hide one layer, on every Map and in Export SVG. */
export function showLayer(layer: MapLayer, show: boolean) {
	hidden = ALL_MAP_LAYERS.filter((id) => (id === layer ? !show : hidden.includes(id)));
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
		localStorage.setItem(RULES_KNOWN_KEY, '1');
	} catch {
		// no storage: the choice lasts until reload
	}
}
