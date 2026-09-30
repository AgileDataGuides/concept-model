// Step 7: Relationship Rules in words, and the legacy cardinality strings.
//
// A rule end is a minimum (zero or one) and a maximum (one or many). The book
// reads each Relationship aloud in both directions:
//   "Each Customer places one or many Sales Orders."
//   "Each Sales Order is placed by one Customer."

import type { RuleEnd, RelationshipRule } from '$lib/types';
import { RULE_WORDS } from '$lib/canon/steps';

export type RuleChoice = keyof typeof RULE_WORDS;

export const RULE_CHOICES: RuleChoice[] = ['zero-or-one', 'one', 'zero-or-many', 'one-or-many'];

export function ruleEndToChoice(end: RuleEnd): RuleChoice {
	if (end.max === 'one') return end.min === 'zero' ? 'zero-or-one' : 'one';
	return end.min === 'zero' ? 'zero-or-many' : 'one-or-many';
}

export function choiceToRuleEnd(choice: RuleChoice): RuleEnd {
	switch (choice) {
		case 'zero-or-one':
			return { min: 'zero', max: 'one' };
		case 'one':
			return { min: 'one', max: 'one' };
		case 'zero-or-many':
			return { min: 'zero', max: 'many' };
		case 'one-or-many':
			return { min: 'one', max: 'many' };
	}
}

export function ruleWords(end: RuleEnd): string {
	return RULE_WORDS[ruleEndToChoice(end)];
}

export function hasBothEnds(rule: RelationshipRule | undefined): rule is Required<RelationshipRule> {
	return !!rule?.forward && !!rule?.inverse;
}

// ── Plurals ──────────────────────────────────────────────────────────
// Plain English rules on the last word of the name, plus a short list of
// exceptions. A Concept whose plural breaks the rules reads oddly until a
// Concept can carry its own plural name.

const IRREGULAR: Record<string, string> = {
	person: 'people',
	child: 'children',
	man: 'men',
	woman: 'women',
	analysis: 'analyses',
	criterion: 'criteria'
};

const UNCOUNTABLE = new Set(['data', 'equipment', 'feedback', 'information', 'software', 'staff', 'stock']);

function matchCase(original: string, replacement: string): string {
	return original[0] === original[0].toUpperCase()
		? replacement[0].toUpperCase() + replacement.slice(1)
		: replacement;
}

function pluraliseWord(word: string): string {
	const lower = word.toLowerCase();
	if (UNCOUNTABLE.has(lower)) return word;
	if (IRREGULAR[lower]) return matchCase(word, IRREGULAR[lower]);
	if (word.length > 1 && word === word.toUpperCase()) return `${word}s`; // SKU to SKUs
	if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
	if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
	return `${word}s`;
}

/** "Sales Order" to "Sales Orders", "Company" to "Companies", "Person" to "People". */
export function pluralise(name: string): string {
	const match = name.match(/^(.*?)(\S+)(\s*)$/);
	if (!match) return name;
	const [, head, last, tail] = match;
	return `${head}${pluraliseWord(last)}${tail}`;
}

// ── Sentences ────────────────────────────────────────────────────────

export interface SentenceParts {
	subject: string;
	verb: string;
	words: string;
	object: string;
}

/** The parts of "Each {subject} {verb} {words} {object}.", with the object plural when the maximum is many. */
export function sentenceParts(subject: string, verb: string, end: RuleEnd, object: string): SentenceParts {
	return {
		subject,
		verb: verb.trim(),
		words: ruleWords(end),
		object: end.max === 'many' ? pluralise(object) : object
	};
}

/** A missing verb reads as "…", so the gap shows. */
export function sentenceText(parts: SentenceParts): string {
	return `Each ${parts.subject} ${parts.verb || '…'} ${parts.words} ${parts.object}.`;
}

/** Both sentences for a Relationship. An end that is not set yet gives null. */
export function relationshipSentences(
	rel: { label: string; inverseLabel?: string; rule?: RelationshipRule },
	sourceName: string,
	targetName: string
): { forward: string | null; inverse: string | null } {
	return {
		forward: rel.rule?.forward ? sentenceText(sentenceParts(sourceName, rel.label, rel.rule.forward, targetName)) : null,
		inverse: rel.rule?.inverse
			? sentenceText(sentenceParts(targetName, rel.inverseLabel ?? '', rel.rule.inverse, sourceName))
			: null
	};
}

/** "Customer places Sales Order", the Relationship before it has rules. */
export function relationshipTriple(sourceName: string, verb: string, targetName: string): string {
	return `${sourceName} ${verb.trim() || '…'} ${targetName}`;
}

// ── Legacy cardinality strings ───────────────────────────────────────
// Version 1.0 held one free-text `cardinality`. The SaaS example writes UML
// end pairs, source end first: "1 : 1..*" on "Customer subscribes to
// Subscription" means each Subscription has one Customer (the source end)
// and each Customer has one or many Subscriptions (the target end).
// A string migrates only when both ends parse without guessing. "1:M" and
// "M:M" give no minimum, so they stay as text for a person to restate.

const UML_ENDS: Record<string, RuleEnd> = {
	'1': { min: 'one', max: 'one' },
	'1..1': { min: 'one', max: 'one' },
	'0..1': { min: 'zero', max: 'one' },
	'1..*': { min: 'one', max: 'many' },
	'0..*': { min: 'zero', max: 'many' },
	'*': { min: 'zero', max: 'many' }
};

export function parseCardinalityEnd(token: string): RuleEnd | null {
	const normalised = token.trim().toLowerCase().replace(/\s+/g, '').replace(/\.\.n$/, '..*');
	const end = UML_ENDS[normalised];
	return end ? { ...end } : null;
}

export function parseLegacyCardinality(value: string | undefined): Required<RelationshipRule> | null {
	if (!value) return null;
	const parts = value.split(':');
	if (parts.length !== 2) return null;
	const inverse = parseCardinalityEnd(parts[0]);
	const forward = parseCardinalityEnd(parts[1]);
	return inverse && forward ? { forward, inverse } : null;
}

export function ruleEndToUml(end: RuleEnd): string {
	if (end.max === 'one') return end.min === 'zero' ? '0..1' : '1';
	return end.min === 'zero' ? '0..*' : '1..*';
}

/** The legacy string for a full rule, source end first, so older readers keep working. */
export function ruleToCardinality(rule: Required<RelationshipRule>): string {
	return `${ruleEndToUml(rule.inverse)} : ${ruleEndToUml(rule.forward)}`;
}
