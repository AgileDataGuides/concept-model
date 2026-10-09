// THE one file for Blue Book wording.
//
// Every step name, step question, one-line description, read-more link and
// line of step guidance lives here, so a change to the book's canon is a
// one-file edit. The book, "an Agile Data Guide to Modeling Business Concepts"
// by Juha Korpela and Shane Gibson, is still in draft. Step names and
// questions follow the V4 canon (spreads s20 to s30, V6 s23 for Step 4). The
// one-line descriptions are the s19 overview cards.
//
// Copy rules for anything a person reads: one-l modeling, British spelling,
// "the organisation" never "the business", GenAI never a bare "AI", no em
// dashes, step labels in the form "Step 4 - Identify the Concepts".

import type {
	StepId,
	ScopeSlice,
	ParticipantRole,
	StoryKind,
	DefinitionStatus,
	WalkResult,
	WalkResolution,
	ParkedKind,
	W
} from '$lib/types';

export interface StepCanon {
	id: StepId;
	number: number;
	name: string;
	/** The question the step asks, the right-page heading of its spread. */
	question: string;
	/** The s19 overview card. */
	description: string;
	/** Empty until the page exists. The book still writes agiledataguides.com/XXXX. */
	readMoreUrl: string;
}

export const STEPS: StepCanon[] = [
	{
		id: 'scope',
		number: 1,
		name: 'Identify the Scope',
		question: 'What is the boundary we are about to model?',
		description: 'The slice of the organisation you are modeling, expressed as a simple boundary everyone can understand.',
		readMoreUrl: ''
	},
	{
		id: 'subject-matter-expert',
		number: 2,
		name: 'Find a Subject Matter Expert',
		question: 'Who can give us the stories that describe this slice of reality?',
		description: 'The person who knows the reality of how the organisation actually works and who will guide the discovery of the Concept Model.',
		readMoreUrl: ''
	},
	{
		id: 'stories',
		number: 3,
		name: 'Capture Business Stories',
		question: 'How do we get our expert to tell us the relevant story?',
		description: 'A real-world narrative describing what happens in the organisation using natural language, not system language.',
		readMoreUrl: ''
	},
	{
		id: 'concepts',
		number: 4,
		name: 'Identify the Concepts',
		question: 'What things does the organisation care about?',
		description: 'The nouns that appear in the story which represent things the organisation counts, manages, or tracks.',
		readMoreUrl: ''
	},
	{
		id: 'definitions',
		number: 5,
		name: 'Agree the Definitions',
		question: 'What do we mean by Customer?',
		description: 'Plain language descriptions of what each Concept means and what must be true for something to qualify as one.',
		readMoreUrl: ''
	},
	{
		id: 'relationships',
		number: 6,
		name: 'Identify the Relationships',
		question: 'Which of these things are connected in real life, and why?',
		description: 'Identify the connections between Concepts showing which Concepts are related in organisational reality.',
		readMoreUrl: ''
	},
	{
		id: 'relationship-rules',
		number: 7,
		name: 'Describe the Relationship Rules',
		question: 'How many, and could there be none?',
		description: 'A plain language way to describe the rules that describe how each connected Concept relates to the other, including the one-to-one or one-to-many nature of each Relationship.',
		readMoreUrl: ''
	},
	{
		id: 'events',
		number: 8,
		name: 'Surface the Core Business Events',
		question: 'When does something important happen?',
		description: "Identify the Concepts which drive moments that matter in the organisation's processes, revealing when something important occurs between Concepts that are connected.",
		readMoreUrl: ''
	},
	{
		id: 'map',
		number: 9,
		name: 'Draw the Map',
		question: 'Does the picture tell the story?',
		description: 'A simple visual arrangement of the Concepts, connections and Events that represent the narrative and reflect the organisational reality.',
		readMoreUrl: ''
	},
	{
		id: 'questions',
		number: 10,
		name: 'Gather Business Questions',
		question: 'What questions do you need the Map to help answer?',
		description: 'The questions the Model must help answer to ensure it is fit for how it will be used.',
		readMoreUrl: ''
	},
	{
		id: 'walk',
		number: 11,
		name: 'Walk the Map',
		question: 'Does the Map survive contact with reality?',
		description: 'A step-by-step validation using real scenarios and questions to check that the Map matches organisational reality.',
		readMoreUrl: ''
	}
];

/** "Step 4 - Identify the Concepts" */
export function stepLabel(step: StepCanon): string {
	return `Step ${step.number} - ${step.name}`;
}

export function getStep(id: StepId): StepCanon {
	const step = STEPS.find((s) => s.id === id);
	if (!step) throw new Error(`Unknown step: ${id}`);
	return step;
}

// ── Vocabulary ───────────────────────────────────────────────────────

export const PARKED_LIST_NAME = 'Parked';

/** The parked detailed attributes only: information about a Concept for the DESIGN stage. */
export const PARKED_DETAILS_NAME = 'Parked Details';

/** A parked detailed attribute, the kind the Parked Details tab lists. */
export function isParkedDetail(item: { kind: ParkedKind }): boolean {
	return item.kind === 'attribute';
}

/** Step 1: the ways s20 names for slicing an organisation into a Scope. */
export const SCOPE_SLICES: { id: ScopeSlice; label: string; example: string }[] = [
	{ id: 'business-process', label: 'Business process', example: 'Order-to-Cash' },
	{ id: 'value-chain', label: 'Value chain', example: 'Credit Management' },
	{ id: 'organisational-design', label: 'Organisational design', example: 'EMEA division' },
	{ id: 'business-capability', label: 'Business capability', example: 'Ticket management' },
	{ id: 'other', label: 'Other', example: '' }
];

/** Step 2: the three modeling roles in s32, plus the Stakeholders who bring the Business Questions (s29). */
export const PARTICIPANT_ROLES: { id: ParticipantRole; label: string }[] = [
	{ id: 'subject-matter-expert', label: 'Subject Matter Expert' },
	{ id: 'facilitator', label: 'Facilitator' },
	{ id: 'data-team', label: 'Data Team' },
	{ id: 'stakeholder', label: 'Stakeholder' }
];

/** s32: "a team sport with three roles". A Stakeholder is not one of them. */
export const MODELING_ROLES: ParticipantRole[] = ['subject-matter-expert', 'facilitator', 'data-team'];

/** s32: of the three modeling roles, "One person can hold two of them at a pinch, never all three." */
export const MAX_MODELING_ROLES_PER_PERSON = 2;

export const STORY_KINDS: { id: StoryKind; label: string }[] = [
	{ id: 'happy-path', label: 'Happy path' },
	{ id: 'variation', label: 'Variation' }
];

export const DEFINITION_STATUSES: { id: DefinitionStatus; label: string }[] = [
	{ id: 'draft', label: 'Draft' },
	{ id: 'agreed', label: 'Agreed' },
	{ id: 'flagged', label: 'Flagged' }
];

/**
 * The 7W's: the kind of thing a Concept is. The Business Event Matrix
 * groups its columns by them, in this order and with these labels. The
 * Blue Book's 7W's check (s33) names the same seven, with who, what and
 * where as Concepts.
 */
export const SEVEN_WS: { id: W; label: string }[] = [
	{ id: 'who', label: 'Who' },
	{ id: 'what', label: 'What' },
	{ id: 'when', label: 'When' },
	{ id: 'where', label: 'Where' },
	{ id: 'why', label: 'Why' },
	{ id: 'how', label: 'How' },
	{ id: 'how many', label: 'How Many' }
];

/** A Concept whose 7W nobody has picked. */
export const NO_SEVEN_W_LABEL = 'No 7W yet';

export function sevenWLabel(w: W | undefined): string {
	return SEVEN_WS.find((s) => s.id === w)?.label ?? NO_SEVEN_W_LABEL;
}

/** Step 7: the words a rule reads as, in the book's order of "one" and "many". */
export const RULE_WORDS = {
	'zero-or-one': 'zero or one',
	one: 'one',
	'zero-or-many': 'zero or many',
	'one-or-many': 'one or many'
} as const;

export const WALK_RESULTS: { id: WalkResult; label: string }[] = [
	{ id: 'holds', label: 'Holds' },
	{ id: 'stuck', label: 'Stuck' }
];

export const NOT_WALKED_LABEL = 'Not walked';

export const WALK_RESOLUTIONS: { id: WalkResolution; label: string }[] = [
	{ id: 'drawn', label: 'Drawn on the Map' },
	{ id: 'out-of-scope', label: 'Out of scope' },
	{ id: 'parked', label: 'Parked' }
];

export const PARKED_KINDS: { id: ParkedKind; label: string }[] = [
	{ id: 'attribute', label: 'Detailed attribute' },
	{ id: 'out-of-scope', label: 'Out of scope' },
	{ id: 'future-map', label: 'Future Map' },
	{ id: 'other', label: 'Other' }
];

// ── Rules of thumb (quiet hints, never gates) ────────────────────────

/** V6 s23: "Expect ten to twenty Concepts. Less than five and the Scope is a puddle, more than twenty-five and it is an ocean." */
export const CONCEPT_COUNT = { puddleBelow: 5, oceanAbove: 25 };

/** s29: "the first three to five questions that come quickly". */
export const QUESTION_COUNT = { startWith: 3 };

/** s24: a Definition that needs the word table, flag or status code describes software. */
export const SOFTWARE_WORDS = ['table', 'flag', 'status code'];

export const HINTS = {
	noSubjectMatterExpert: 'No Subject Matter Expert yet. The Model comes from the people who do the work, never from us.',
	allThreeRoles: (name: string) => `${name} holds all three roles. One person can hold two at a pinch, never all three.`,
	oneStory: 'Only one story so far. Capture a handful: the happy path first, then the variations.',
	noHappyPath: 'No happy path yet. It is the spine the variations hang from.',
	tooFewConcepts: (count: number) => `${count} ${count === 1 ? 'Concept' : 'Concepts'}. Fewer than five, so the Scope may be a puddle.`,
	tooManyConcepts: (count: number) => `${count} Concepts. More than twenty-five, so the Scope may be an ocean, or attributes are sneaking in.`,
	softwareWords: (concept: string, word: string) =>
		`The Definition of ${concept} uses the word "${word}". A Definition that needs table, flag or status code describes software.`,
	noRelationship: (names: string) => `No Relationship yet for ${names}.`,
	unattachedEvents: (names: string) => `Nothing attached to ${names}. A diamond with nothing attached is a missing Concept.`,
	tooFewQuestions: (count: number) => `${count} Business ${count === 1 ? 'Question' : 'Questions'}. Start with three to five.`
};
