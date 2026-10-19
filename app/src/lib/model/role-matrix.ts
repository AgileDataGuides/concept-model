// The Role Matrix: which people from Step 2 a Concept came from, through
// its stories. Nothing here is stored. A person links to a Concept when they
// told one of the stories it came from (Step 3 Told by, Step 4 stories), or
// are one of that story's Stakeholders.

import type { BusinessStory, Participant } from '$lib/types';

export interface RoleMatrixInput {
	participants: Participant[];
	stories: BusinessStory[];
	concepts: { id: string; storyIds: string[] }[];
}

/** How one person links to one Concept: the stories they told, and the ones they are a Stakeholder of. */
export interface RoleLink {
	told: BusinessStory[];
	stakeholderOf: BusinessStory[];
}

export interface RoleMatrix {
	/**
	 * The rows, in the Step 2 order: everyone with the Subject Matter Expert or
	 * Stakeholder role, and anyone else who told a story or is a story Stakeholder.
	 */
	people: Participant[];
	/** Keyed by `${personId}|${conceptId}`. A pair with no link has no entry. */
	links: Map<string, RoleLink>;
}

export function linkKey(personId: string, conceptId: string): string {
	return `${personId}|${conceptId}`;
}

export function roleMatrix({ participants, stories, concepts }: RoleMatrixInput): RoleMatrix {
	const known = new Set(participants.map((p) => p.id));
	const storyById = new Map(stories.map((s) => [s.id, s]));

	/** The Stakeholders of a story, never its teller, so nobody is counted twice. */
	const stakeholdersOf = (s: BusinessStory) => (s.stakeholderIds ?? []).filter((id) => id !== s.toldBy && known.has(id));

	const onAStory = new Set<string>();
	for (const s of stories) {
		if (s.toldBy && known.has(s.toldBy)) onAStory.add(s.toldBy);
		for (const id of stakeholdersOf(s)) onAStory.add(id);
	}

	const people = participants.filter(
		(p) => p.roles.includes('subject-matter-expert') || p.roles.includes('stakeholder') || onAStory.has(p.id)
	);

	const links = new Map<string, RoleLink>();
	const linkFor = (personId: string, conceptId: string) => {
		const key = linkKey(personId, conceptId);
		let link = links.get(key);
		if (!link) {
			link = { told: [], stakeholderOf: [] };
			links.set(key, link);
		}
		return link;
	};

	for (const c of concepts) {
		for (const storyId of new Set(c.storyIds)) {
			const story = storyById.get(storyId);
			if (!story) continue;
			if (story.toldBy && known.has(story.toldBy)) linkFor(story.toldBy, c.id).told.push(story);
			for (const id of stakeholdersOf(story)) linkFor(id, c.id).stakeholderOf.push(story);
		}
	}

	return { people, links };
}
