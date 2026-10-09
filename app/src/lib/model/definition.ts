// Step 5: part one of a Definition, and the Aristotle helper that can start it.
//
// The helper names a broader category and what sets the Concept apart:
//   "A Customer is a person or organisation that has placed at least one Sales Order with us."
// The Description is part one, and it feeds the Business Glossary. The helper
// only drafts it.

/** An @{Term} mention, as its plain name. */
function plain(text: string): string {
	return text.replace(/@\{([^}]+)\}/g, '$1').trim();
}

/** "a" or "an", by the sound of the first letter: "a One-Time fee", "a user", "an hour" stay right. */
function article(word: string): string {
	// An acronym reads letter by letter: "an MRR", "an ARR", "a KPI"
	if (/^[A-Z]{2,}\b/.test(word)) return /^[AEFHILMNORSX]/.test(word) ? 'an' : 'a';
	if (/^(one|once|uni|us[aeu]|eu)/i.test(word)) return 'a';
	if (/^(hour|honest|honou?r)/i.test(word)) return 'an';
	return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/**
 * A category typed as a heading ("Person or organisation") reads lower case
 * mid-sentence. A name stays as typed: an acronym, or a multi-word Title Case
 * name like another Concept's ("Sales Order"), which the category autocomplete
 * offers. A one-word Concept name reads lower case ("a customer").
 */
function midSentence(word: string): string {
	const [first, second] = word.split(/\s+/);
	if (!/^[A-Z][a-z]/.test(first) || (second && /^[A-Z]/.test(second))) return word;
	return word[0].toLowerCase() + word.slice(1);
}

/** The helper's sentence, or '' until both halves are there. */
export function definitionSentence(name: string, category: string | undefined, differentiator: string | undefined): string {
	const subject = name.trim();
	const cat = midSentence(plain(category ?? ''));
	const diff = plain(differentiator ?? '').replace(/[.\s]+$/, '');
	if (!subject || !cat || !diff) return '';
	const lead = article(subject);
	return `${lead[0].toUpperCase()}${lead.slice(1)} ${subject} is ${article(cat)} ${cat} that ${diff}.`;
}

/** Part one as a reader sees it: the Description, else the helper's sentence, else ''. */
export function partOneText(c: { name: string; description: string; definitionCategory?: string; definitionDifferentiator?: string }): string {
	return c.description.trim() || definitionSentence(c.name, c.definitionCategory, c.definitionDifferentiator);
}

/** A run of a Definition's text, and the Concept it names when it names one. */
export interface TextPart {
	text: string;
	conceptId?: string;
}

/** Characters that mean something in a regular expression, escaped. */
function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type ConceptRef = { id: string; name: string; aliases: string[] };

/**
 * One matcher per list of Concepts, so a page of Definitions builds it once.
 * The list is treated as immutable: the app builds a new one on every change,
 * and an array changed in place keeps its old matcher.
 */
const matchers = new WeakMap<ConceptRef[], { idByTerm: Map<string, string>; pattern: RegExp | null }>();

function matcherFor(concepts: ConceptRef[]) {
	let m = matchers.get(concepts);
	if (m) return m;
	const idByTerm = new Map<string, string>();
	const ambiguous = new Set<string>();
	for (const c of concepts) {
		for (const term of [c.name, ...c.aliases]) {
			const key = term.trim().toLowerCase();
			if (key.length < 2) continue;
			const seen = idByTerm.get(key);
			if (seen === undefined) idByTerm.set(key, c.id);
			else if (seen !== c.id) ambiguous.add(key);
		}
	}
	// A name or alias two Concepts share says nothing about which one is meant, so it links to neither
	for (const key of ambiguous) idByTerm.delete(key);
	// Longest first, so "Sales Order Line" wins over "Sales Order"
	const terms = [...idByTerm.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
	const pattern = terms.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${terms.join('|')})(?:es|s)?(?![\\p{L}\\p{N}])`, 'giu') : null;
	m = { idByTerm, pattern };
	matchers.set(concepts, m);
	return m;
}

/**
 * Split a Definition's text where it names another Concept, by its name or an
 * alias, in any case, and as a simple plural ("Sales Orders"). Only the first
 * mention of each Concept is marked, so a sentence reads with one link per
 * Concept. The Concept being defined is never marked, and neither is a name or
 * alias two Concepts share.
 */
export function linkConcepts(text: string, concepts: ConceptRef[], selfId: string): TextPart[] {
	const { idByTerm, pattern } = matcherFor(concepts);
	if (!text || !pattern) return [{ text }];
	const parts: TextPart[] = [];
	const linked = new Set<string>();
	// In a fact, a 'quoted' value names one thing ('LinkedIn ads'), not a Concept. A quote
	// opens and closes outside a word, so a possessive ("Acme's") is not one.
	const quoted = /^Fact:/.test(text)
		? [...text.matchAll(/(?<![\p{L}\p{N}])'[^']*'(?![\p{L}\p{N}])/gu)].map((q) => [q.index, q.index + q[0].length])
		: [];
	let from = 0;
	for (const m of text.matchAll(pattern)) {
		if (quoted.some(([start, end]) => m.index >= start && m.index < end)) continue;
		const id = idByTerm.get(m[1].toLowerCase());
		if (!id || id === selfId || linked.has(id)) continue;
		linked.add(id);
		if (m.index > from) parts.push({ text: text.slice(from, m.index) });
		parts.push({ text: m[0], conceptId: id });
		from = m.index + m[0].length;
	}
	if (from < text.length) parts.push({ text: text.slice(from) });
	return parts;
}

/** The other Concepts a Definition names, in the order it first names them. */
export function conceptsNamed(texts: string[], concepts: ConceptRef[], selfId: string): string[] {
	const ids: string[] = [];
	for (const text of texts) {
		for (const part of linkConcepts(text, concepts, selfId)) {
			if (part.conceptId && !ids.includes(part.conceptId)) ids.push(part.conceptId);
		}
	}
	return ids;
}
