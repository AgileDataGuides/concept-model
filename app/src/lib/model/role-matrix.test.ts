import { describe, expect, it } from 'vitest';
import type { BusinessStory, Participant } from '$lib/types';
import { linkKey, roleMatrix } from './role-matrix';

const people: Participant[] = [
	{ id: 'cro', name: 'Chief Revenue Officer', roles: ['subject-matter-expert', 'stakeholder'] },
	{ id: 'fac', name: 'RevOps Analyst', roles: ['facilitator'] },
	{ id: 'eng', name: 'Data Engineer', roles: ['data-team'] },
	{ id: 'csm', name: 'Customer Success Manager', roles: ['stakeholder'] },
	{ id: 'fin', name: 'Finance Analyst', roles: ['subject-matter-expert'] }
];

const story = (id: string, toldBy?: string, stakeholderIds?: string[]): BusinessStory => ({
	id,
	name: id,
	text: '',
	kind: 'happy-path',
	toldBy,
	stakeholderIds
});

describe('roleMatrix', () => {
	it('rows: the Subject Matter Experts and Stakeholders, then anyone on a story, in the Step 2 order', () => {
		const m = roleMatrix({ participants: people, stories: [story('s1', 'cro', ['eng'])], concepts: [] });
		// The facilitator is on no story, so has no row. The Data Engineer is a story Stakeholder, so has one
		expect(m.people.map((p) => p.id)).toEqual(['cro', 'eng', 'csm', 'fin']);
	});

	it('marks T for a story the person told and S for a story they are a Stakeholder of', () => {
		const m = roleMatrix({
			participants: people,
			stories: [story('s1', 'cro', ['csm']), story('s2', 'fin', ['cro'])],
			concepts: [
				{ id: 'customer', storyIds: ['s1', 's2'] },
				{ id: 'invoice', storyIds: ['s2'] },
				{ id: 'product', storyIds: [] }
			]
		});
		const ids = (key: string) => {
			const link = m.links.get(key);
			return link && { told: link.told.map((s) => s.id), stakeholderOf: link.stakeholderOf.map((s) => s.id) };
		};
		expect(ids(linkKey('cro', 'customer'))).toEqual({ told: ['s1'], stakeholderOf: ['s2'] });
		expect(ids(linkKey('cro', 'invoice'))).toEqual({ told: [], stakeholderOf: ['s2'] });
		expect(ids(linkKey('csm', 'customer'))).toEqual({ told: [], stakeholderOf: ['s1'] });
		expect(ids(linkKey('fin', 'invoice'))).toEqual({ told: ['s2'], stakeholderOf: [] });
		expect(m.links.has(linkKey('csm', 'invoice'))).toBe(false);
		expect([...m.links.keys()].some((k) => k.endsWith('|product'))).toBe(false);
	});

	it('never counts a teller as a Stakeholder of their own story, and skips people and stories that are gone', () => {
		const m = roleMatrix({
			participants: people,
			stories: [story('s1', 'cro', ['cro', 'gone'])],
			concepts: [{ id: 'customer', storyIds: ['s1', 's1', 'missing'] }]
		});
		const link = m.links.get(linkKey('cro', 'customer'))!;
		expect(link.told.map((s) => s.id)).toEqual(['s1']);
		expect(link.stakeholderOf).toEqual([]);
		expect(m.links.has(linkKey('gone', 'customer'))).toBe(false);
	});
});
