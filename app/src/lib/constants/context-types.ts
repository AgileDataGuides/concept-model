export interface ContextTypeConfig {
	label: string;
	displayName: string;
	color: string;
	shape: string;
	description: string;
}

export const CONTEXT_TYPES: ContextTypeConfig[] = [
	{ label: 'global_concept', displayName: 'Concept', color: '#e11d48', shape: 'round-rectangle', description: 'A core business concept with definition' },
	{ label: 'global_core_business_event', displayName: 'Core Business Event', color: '#be123c', shape: 'diamond', description: 'A significant business event' },
	{ label: 'global_core_business_process', displayName: 'Core Business Process', color: '#9f1239', shape: 'diamond', description: 'A core business process' },
	{ label: 'global_domain', displayName: 'Domain', color: '#7c3aed', shape: 'round-rectangle', description: 'A business data domain' }
];

export function getContextType(label: string): ContextTypeConfig | undefined {
	return CONTEXT_TYPES.find((e) => e.label === label);
}
