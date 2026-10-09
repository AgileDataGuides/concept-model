import { describe, expect, it } from 'vitest';
import { conceptsNamed, definitionSentence, linkConcepts, partOneText } from './definition';

describe('definitionSentence', () => {
	it('writes the Aristotle sentence from the two halves', () => {
		expect(definitionSentence('Customer', 'Person or organisation', 'has placed at least one Sales Order with us')).toBe(
			'A Customer is a person or organisation that has placed at least one Sales Order with us.'
		);
	});

	it('picks "an" by the first letter, keeps acronyms, and reads @-mentions as names', () => {
		expect(definitionSentence('Order Line', 'item', 'sits on one @{Sales Order}.')).toBe('An Order Line is an item that sits on one Sales Order.');
		expect(definitionSentence('Store', 'ATM-like place', 'sells goods')).toBe('A Store is an ATM-like place that sells goods.');
	});

	it('reads "a" before a "one" or "uni" sound', () => {
		expect(definitionSentence('One-Time Revenue', 'income', 'does not repeat')).toBe('A One-Time Revenue is an income that does not repeat.');
		expect(definitionSentence('Plan', 'unit of sale', 'sets a price')).toBe('A Plan is a unit of sale that sets a price.');
		expect(definitionSentence('Usage Event', 'record', 'counts use')).toBe('A Usage Event is a record that counts use.');
		expect(definitionSentence('MRR', 'measure', 'sums Recurring Revenue')).toBe('An MRR is a measure that sums Recurring Revenue.');
		expect(definitionSentence('KPI', 'measure', 'tracks a goal')).toBe('A KPI is a measure that tracks a goal.');
	});

	it('keeps a Title Case name as the category, and lower-cases a heading', () => {
		expect(definitionSentence('Order Line', 'Sales Order', 'names one Product')).toBe('An Order Line is a Sales Order that names one Product.');
		expect(definitionSentence('Team', 'Group of Employees', 'work together')).toBe('A Team is a group of Employees that work together.');
	});

	it('is empty until both halves are there', () => {
		expect(definitionSentence('Customer', 'person', '')).toBe('');
		expect(definitionSentence('Customer', '', 'buys')).toBe('');
	});
});

describe('partOneText', () => {
	it('prefers the Description, then the helper sentence', () => {
		const c = { name: 'Customer', description: '', definitionCategory: 'person', definitionDifferentiator: 'buys from us' };
		expect(partOneText(c)).toBe('A Customer is a person that buys from us.');
		expect(partOneText({ ...c, description: 'Someone who buys.' })).toBe('Someone who buys.');
		expect(partOneText({ ...c, definitionCategory: '' })).toBe('');
	});
});

describe('linkConcepts', () => {
	const concepts = [
		{ id: 'customer', name: 'Customer', aliases: ['Client'] },
		{ id: 'order', name: 'Sales Order', aliases: [] },
		{ id: 'line', name: 'Sales Order Line', aliases: [] },
		{ id: 'channel', name: 'Channel', aliases: [] }
	];

	it('marks the first mention of each other Concept, by name, alias or plural', () => {
		const parts = linkConcepts('A Customer has placed Sales Orders through any channel, as a client. Sales Orders again.', concepts, 'x');
		expect(parts.filter((p) => p.conceptId).map((p) => [p.text, p.conceptId])).toEqual([
			['Customer', 'customer'],
			['Sales Orders', 'order'],
			['channel', 'channel']
		]);
		expect(parts.map((p) => p.text).join('')).toBe('A Customer has placed Sales Orders through any channel, as a client. Sales Orders again.');
	});

	it('prefers the longest name, skips the Concept being defined, and needs whole words', () => {
		const parts = linkConcepts('Each Sales Order Line sits on a Customer. Channels and Channelling.', concepts, 'customer');
		expect(parts.filter((p) => p.conceptId).map((p) => p.text)).toEqual(['Sales Order Line', 'Channels']);
	});

	it('never links inside the defined Concept\'s own name', () => {
		expect(linkConcepts('A Sales Order Line sits on one Sales Order.', concepts, 'line')).toEqual([
			{ text: 'A Sales Order Line sits on one ' },
			{ text: 'Sales Order', conceptId: 'order' },
			{ text: '.' }
		]);
	});

	it('leaves the quoted values in a fact alone', () => {
		expect(linkConcepts("Fact: Customer 'Channel Partners Ltd' is acquired through Channel 'Web'.", concepts, 'x')).toEqual([
			{ text: 'Fact: ' },
			{ text: 'Customer', conceptId: 'customer' },
			{ text: " 'Channel Partners Ltd' is acquired through " },
			{ text: 'Channel', conceptId: 'channel' },
			{ text: " 'Web'." }
		]);
	});

	it('reads a possessive in a fact as an apostrophe, not a quote', () => {
		expect(linkConcepts("Fact: Acme's Customer 'Web' places a Sales Order.", concepts, 'x').filter((p) => p.conceptId).map((p) => p.text)).toEqual([
			'Customer',
			'Sales Order'
		]);
	});

	it('links neither Concept when two share a name or alias', () => {
		const shared = [
			{ id: 'plan', name: 'Plan', aliases: ['Offering'] },
			{ id: 'product', name: 'Product', aliases: ['Offering'] }
		];
		expect(linkConcepts('Each offering has a Plan.', shared, 'x').filter((p) => p.conceptId).map((p) => p.text)).toEqual(['Plan']);
		expect(linkConcepts('Each offering is sold.', shared, 'x').filter((p) => p.conceptId)).toEqual([]);
	});

	it('keeps a Concept whose alias repeats its own name', () => {
		const repeat = [{ id: 'plan', name: 'Plan', aliases: ['plan'] }];
		expect(linkConcepts('Each Plan.', repeat, 'x').filter((p) => p.conceptId).map((p) => p.text)).toEqual(['Plan']);
	});

	it('names each Concept once across all parts', () => {
		expect(conceptsNamed(['A Customer and a Channel.', 'Another Customer, a Sales Order.'], concepts, 'line')).toEqual(['customer', 'channel', 'order']);
	});
});
