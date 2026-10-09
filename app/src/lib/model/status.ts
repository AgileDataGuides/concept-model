// The status line and quiet hints for each step and for the Core Business
// Events tab, derived from the data.
// Nothing here is stored. Hint wording lives in canon/steps.ts.

import type { StepId } from '$lib/types';
import type { CmView } from './graph-view';
import { hasBothEnds } from './rules';
import { CONCEPT_COUNT, HINTS, MAX_MODELING_ROLES_PER_PERSON, MODELING_ROLES, QUESTION_COUNT, SOFTWARE_WORDS } from '$lib/canon/steps';

export interface StepStatus {
	/** Something has been captured for this step. */
	started: boolean;
	line: string;
	hints: string[];
}

function count(n: number, singular: string, plural = `${singular}s`): string {
	return `${n} ${n === 1 ? singular : plural}`;
}

/** "A, B and C", then "and 4 more" past five names. */
export function nameList(names: string[], max = 5): string {
	if (names.length <= max) {
		return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
	}
	return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}

/** The software word a Definition leans on, if any (s24). */
export function softwareWordIn(text: string): string | undefined {
	const lower = text.toLowerCase();
	return SOFTWARE_WORDS.find((word) => new RegExp(`\\b${word}\\b`).test(lower));
}

/** An Event is attached when it joins a Concept, sits on a Relationship, or is a Concept itself. */
export function isAttached(cm: CmView, eventId: string): boolean {
	const ev = cm.eventById.get(eventId);
	return !!ev && (ev.conceptIds.length > 0 || !!ev.relationshipId || !!ev.conceptId);
}

/** A legacy cardinality string that never became a full rule. */
export function toRestate(rel: { rule?: unknown; cardinality?: string }): boolean {
	return !!rel.cardinality && !hasBothEnds(rel.rule as never);
}

/** The Core Business Events tab, read the way a step is. The Business Event Matrix shows the same hints. */
export function eventStatus(cm: CmView): StepStatus {
	const attached = cm.events.filter((e) => isAttached(cm, e.id)).length;
	const floating = cm.events.filter((e) => !isAttached(cm, e.id)).map((e) => e.name);
	const hints = floating.length > 0 ? [HINTS.unattachedEvents(nameList(floating, 3))] : [];
	const line = cm.events.length === 0 ? 'No Events yet' : `${count(cm.events.length, 'Event')}, ${attached} attached`;
	return { started: cm.events.length > 0, line, hints };
}

export function stepStatus(cm: CmView, step: StepId): StepStatus {
	const concepts = cm.concepts.length;

	switch (step) {
		case 'scope': {
			const inDomain = cm.concepts.filter((c) => c.domainId && cm.domainById.has(c.domainId)).length;
			const parts = [cm.scope?.statement ? 'Scope set' : 'No Scope statement yet', count(cm.domains.length, 'Domain')];
			if (concepts > 0) parts.push(`${inDomain} of ${count(concepts, 'Concept')} in a Domain`);
			return { started: !!cm.scope?.statement || cm.domains.length > 0, line: parts.join(', '), hints: [] };
		}

		case 'subject-matter-expert': {
			const withRole = (role: string) => cm.participants.filter((p) => p.roles.includes(role as never)).length;
			const experts = withRole('subject-matter-expert');
			const hints: string[] = [];
			if (cm.participants.length > 0 && experts === 0) hints.push(HINTS.noSubjectMatterExpert);
			for (const p of cm.participants) {
				if (p.roles.filter((r) => MODELING_ROLES.includes(r)).length > MAX_MODELING_ROLES_PER_PERSON) hints.push(HINTS.allThreeRoles(p.name));
			}
			const stakeholders = withRole('stakeholder');
			const line =
				cm.participants.length === 0
					? 'No one yet'
					: [
							count(experts, 'expert'),
							count(withRole('facilitator'), 'Facilitator'),
							`${withRole('data-team')} Data Team`,
							...(stakeholders > 0 ? [count(stakeholders, 'Stakeholder')] : [])
						].join(', ');
			return { started: cm.participants.length > 0, line, hints };
		}

		case 'stories': {
			const happy = cm.stories.filter((s) => s.kind === 'happy-path').length;
			const hints: string[] = [];
			if (cm.stories.length === 1) hints.push(HINTS.oneStory);
			if (cm.stories.length > 0 && happy === 0) hints.push(HINTS.noHappyPath);
			const line =
				cm.stories.length === 0
					? 'No stories yet'
					: [count(cm.stories.length, 'story', 'stories'), count(happy, 'happy path', 'happy paths'), count(cm.stories.length - happy, 'variation')].join(', ');
			return { started: cm.stories.length > 0, line, hints };
		}

		case 'concepts': {
			const fromStory = cm.concepts.filter((c) => c.storyIds.some((id) => cm.storyById.has(id))).length;
			const hints: string[] = [];
			if (concepts > 0 && concepts < CONCEPT_COUNT.puddleBelow) hints.push(HINTS.tooFewConcepts(concepts));
			if (concepts > CONCEPT_COUNT.oceanAbove) hints.push(HINTS.tooManyConcepts(concepts));
			const line = concepts === 0 ? 'No Concepts yet' : `${count(concepts, 'Concept')}, ${fromStory} from a story`;
			return { started: concepts > 0, line, hints };
		}

		case 'definitions': {
			const agreed = cm.concepts.filter((c) => c.status === 'agreed').length;
			const flagged = cm.concepts.filter((c) => c.status === 'flagged').length;
			const hints: string[] = [];
			for (const c of cm.concepts) {
				const word = softwareWordIn(c.description);
				if (word) hints.push(HINTS.softwareWords(c.name, word));
			}
			const started = cm.concepts.some(
				(c) => c.status !== 'draft' || c.description || c.examples.length > 0 || c.specialCases.length > 0
			);
			const line =
				concepts === 0 ? 'No Concepts to define yet' : `${agreed} of ${concepts} agreed${flagged > 0 ? `, ${flagged} flagged` : ''}`;
			return { started, line, hints };
		}

		case 'relationships': {
			const linked = new Set(cm.relationships.flatMap((r) => [r.sourceId, r.targetId]));
			const islands = cm.concepts.filter((c) => !linked.has(c.id)).map((c) => c.name);
			const hints = cm.relationships.length > 0 && islands.length > 0 ? [HINTS.noRelationship(nameList(islands))] : [];
			const line = cm.relationships.length === 0 ? 'No Relationships yet' : count(cm.relationships.length, 'Relationship');
			return { started: cm.relationships.length > 0, line, hints };
		}

		case 'relationship-rules': {
			const total = cm.relationships.length;
			const both = cm.relationships.filter((r) => hasBothEnds(r.rule)).length;
			const flagged = cm.relationships.filter((r) => r.flagged).length;
			const restate = cm.relationships.filter((r) => toRestate(r)).length;
			const parts = [`${both} of ${total} with both rules`];
			if (flagged > 0) parts.push(`${flagged} flagged`);
			if (restate > 0) parts.push(`${restate} to restate`);
			return {
				started: cm.relationships.some((r) => r.rule?.forward || r.rule?.inverse),
				line: total === 0 ? 'No Relationships yet' : parts.join(', '),
				hints: []
			};
		}

		case 'map': {
			const placed = cm.concepts.filter((c) => cm.layout.concepts[c.id]).length;
			const line = concepts === 0 ? 'Nothing to place yet' : `${placed} of ${count(concepts, 'Concept')} placed`;
			return { started: placed > 0 || cm.events.some((e) => cm.layout.events[e.id]), line, hints: [] };
		}

		case 'questions': {
			const walked = cm.questions.filter((q) => cm.walks.some((w) => w.subject.type === 'question' && w.subject.id === q.id)).length;
			const hints =
				cm.questions.length > 0 && cm.questions.length < QUESTION_COUNT.startWith ? [HINTS.tooFewQuestions(cm.questions.length)] : [];
			const line = cm.questions.length === 0 ? 'No Business Questions yet' : `${count(cm.questions.length, 'question')}, ${walked} walked`;
			return { started: cm.questions.length > 0, line, hints };
		}

		case 'walk': {
			const walkedStories = cm.stories.filter((s) => cm.walks.some((w) => w.subject.type === 'story' && w.subject.id === s.id)).length;
			const walkedQuestions = cm.questions.filter((q) => cm.walks.some((w) => w.subject.type === 'question' && w.subject.id === q.id)).length;
			const stuck = cm.walks.filter((w) => w.result === 'stuck').length;
			const line =
				cm.stories.length === 0 && cm.questions.length === 0
					? 'Nothing to walk yet'
					: [
							`${walkedStories} of ${count(cm.stories.length, 'story', 'stories')}`,
							`${walkedQuestions} of ${count(cm.questions.length, 'question')}`,
							...(stuck > 0 ? [`${stuck} stuck`] : [])
						].join(', ');
			return { started: cm.walks.length > 0, line, hints: [] };
		}
	}
}
