// Entity colours for this app, from design/tokens.md § entities. Components
// read colours from here and add the § 12 opacity suffixes, never a hard-coded hex.

export interface ContextTypeConfig {
	label: string;
	displayName: string;
	color: string;
	shape: string;
	description: string;
}

export const CONTEXT_TYPES: ContextTypeConfig[] = [
	{ label: 'global_concept', displayName: 'Concept', color: '#e11d48', shape: 'round-rectangle', description: 'A thing the organisation counts, manages or tracks' },
	{ label: 'global_core_business_event', displayName: 'Core Business Event', color: '#16a34a', shape: 'diamond', description: 'A moment that matters, where data is born' },
	{ label: 'global_core_business_process', displayName: 'Core Business Process', color: '#9f1239', shape: 'diamond', description: 'A core business process' },
	{ label: 'global_domain', displayName: 'Domain', color: '#7c3aed', shape: 'round-rectangle', description: 'An area of the organisation centred on one important topic' },
	{ label: 'global_business_question', displayName: 'Business Question', color: '#7c3aed', shape: 'round-rectangle', description: 'A question the Model must help answer' }
];

export function getContextType(label: string): ContextTypeConfig | undefined {
	return CONTEXT_TYPES.find((e) => e.label === label);
}

/** The entity hex for a label. Falls back to slate-500 for an unknown label. */
export function colorOf(label: string): string {
	return getContextType(label)?.color ?? '#64748b';
}
