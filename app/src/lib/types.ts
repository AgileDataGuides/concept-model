export interface ConceptRelationship {
	id: string;
	sourceConceptId: string;
	targetConceptId: string;
	label: string;
	cardinality?: string;
}

export interface Concept {
	id: string;
	name: string;
	description: string;
	aliases: string[];
	order?: number;
	/** Aristotelian definition — broader category (genus): "A [Y] that [Z]" */
	definitionCategory?: string;
	/** Aristotelian definition — distinguishing feature (differentia): "A [Y] that [Z]" */
	definitionDifferentiator?: string;
}

export interface CoreBusinessEvent {
	id: string;
	name: string;
	description: string;
	order?: number;
}

export interface CoreBusinessProcess {
	id: string;
	name: string;
	description: string;
	order?: number;
}

export interface Domain {
	id: string;
	name: string;
	description: string;
	order?: number;
}

export interface ConceptModel {
	version: string;
	id: string;
	name: string;
	description: string;
	concepts: Concept[];
	relationships: ConceptRelationship[];
	coreBusinessEvents: CoreBusinessEvent[];
	coreBusinessProcesses: CoreBusinessProcess[];
	domains: Domain[];
}
