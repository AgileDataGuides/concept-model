// Native Concept Model JSON, version 2.0.
//
// Everything added in 2.0 is optional, so a 1.0 file becomes a valid 2.0
// model once `migrateModel()` has run on it. The fields map onto the eleven
// Modeling Business Concepts steps of the Blue Book (see `canon/steps.ts`).

export const MODEL_VERSION = '2.0';

export type W = 'who' | 'what' | 'when' | 'where' | 'why' | 'how' | 'how many';

/** The eleven steps, by slug. A slug survives a reordered or renumbered canon. */
export type StepId =
	| 'scope'
	| 'subject-matter-expert'
	| 'stories'
	| 'concepts'
	| 'definitions'
	| 'relationships'
	| 'relationship-rules'
	| 'events'
	| 'map'
	| 'questions'
	| 'walk';

export type ScopeSlice = 'business-process' | 'value-chain' | 'organisational-design' | 'business-capability' | 'other';
/** The book's three modeling roles (s32), plus the Stakeholders who bring the Business Questions (s29). */
export type ParticipantRole = 'subject-matter-expert' | 'facilitator' | 'data-team' | 'stakeholder';
export type StoryKind = 'happy-path' | 'variation';
export type DefinitionStatus = 'draft' | 'agreed' | 'flagged';
export type WalkResult = 'holds' | 'stuck';
export type WalkResolution = 'drawn' | 'out-of-scope' | 'parked';
export type ParkedKind = 'attribute' | 'out-of-scope' | 'future-map' | 'other';

/** One end of a Relationship Rule: the minimum (could there be none?) and the maximum (one or many). */
export interface RuleEnd {
	min: 'zero' | 'one';
	max: 'one' | 'many';
}

/**
 * Step 7. `forward` is how many targets each source relates to, `inverse` is
 * how many sources each target relates to. Each end is set on its own, so a
 * half-described rule is a valid state.
 */
export interface RelationshipRule {
	forward?: RuleEnd;
	inverse?: RuleEnd;
}

export interface ConceptRelationship {
	id: string;
	sourceConceptId: string;
	targetConceptId: string;
	/** The verb, read source to target: "places". */
	label: string;
	/** Legacy UML end pair, source end then target end ("1 : 1..*"). Written from `rule` once both ends are set. */
	cardinality?: string;
	/** The verb, read target to source: "is placed by". */
	inverseLabel?: string;
	rule?: RelationshipRule;
	/** An exotic rule the expert mentioned, to come back to. */
	flagged?: boolean;
}

export interface Concept {
	id: string;
	name: string;
	/** Part one of the Definition: the nature of the thing, in plain words. */
	description: string;
	aliases: string[];
	order?: number;
	/** Aristotle helper for part one: the broader category (genus). */
	definitionCategory?: string;
	/** Aristotle helper for part one: the distinguishing feature (differentia). */
	definitionDifferentiator?: string;
	domainId?: string;
	/** The stories this Concept was found in (Step 4). */
	storyIds?: string[];
	/** Part two of the Definition. */
	examples?: string[];
	/** Part three of the Definition: special cases and points of confusion. */
	specialCases?: string[];
	/** Absent reads as draft. */
	definitionStatus?: DefinitionStatus;
	w?: W;
	notes?: string;
}

export interface CoreBusinessEvent {
	id: string;
	/** The who-does-what sentence. */
	name: string;
	description: string;
	order?: number;
	/** The Concepts the Event joins. */
	conceptIds?: string[];
	/** The Relationship the Event sits on. */
	relationshipId?: string;
	/** Set when the Event is also a Concept (a Sales Order is both). */
	conceptId?: string;
	notes?: string;
}

/** Dormant: the book's Model has three building blocks and a process is not one. Kept so files round-trip. */
export interface CoreBusinessProcess {
	id: string;
	name: string;
	description: string;
	order?: number;
	notes?: string;
}

export interface Domain {
	id: string;
	name: string;
	description: string;
	order?: number;
	owner?: string;
	aliases?: string[];
	notes?: string;
}

export interface Scope {
	statement: string;
	slicedBy?: ScopeSlice;
}

export interface Participant {
	id: string;
	/** A name or a role title. */
	name: string;
	/** One or two roles. The book allows two at a pinch, never all three. */
	roles: ParticipantRole[];
	notes?: string;
}

export interface BusinessStory {
	id: string;
	name: string;
	/** In the expert's words. */
	text: string;
	kind: StoryKind;
	/** A participant id. */
	toldBy?: string;
	order?: number;
}

export interface BusinessQuestion {
	id: string;
	name: string;
	/** A participant id. */
	askedBy?: string;
	order?: number;
}

/** One walk per story or question. A subject with no Walk has not been walked. */
export interface Walk {
	id: string;
	subject: { type: 'story' | 'question'; id: string };
	result: WalkResult;
	finding?: string;
	resolution?: WalkResolution;
}

export interface ParkedItem {
	id: string;
	text: string;
	kind: ParkedKind;
	/** Where it came from. */
	note?: string;
}

export interface Point {
	x: number;
	y: number;
}

/** Step 9. Positions belong to this Map, never to the shared Concept. */
export interface MapLayout {
	concepts: Record<string, Point>;
	events: Record<string, Point>;
	/**
	 * The top-left of each Domain sheet moved by its name. An empty sheet sits
	 * there, and notes not yet placed start their grid there. A sheet with
	 * Concepts is drawn around them.
	 */
	domains?: Record<string, Point>;
}

export interface StepNote {
	skipped?: boolean;
	note?: string;
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
	scope?: Scope;
	participants?: Participant[];
	stories?: BusinessStory[];
	businessQuestions?: BusinessQuestion[];
	walks?: Walk[];
	parked?: ParkedItem[];
	stepNotes?: Partial<Record<StepId, StepNote>>;
	layout?: MapLayout;
}
