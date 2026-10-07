// Geometry for the Map (Step 9). Pure functions, no Svelte.
//
// The Map is drawn in the Blue Book's style: Concepts are square sticky
// notes, Domains are sheets of paper around their notes, Relationships are
// gentle curves. Saved positions win. Anything not placed yet gets a starting
// spot: each note its own cell in its Domain's grid, moving only while
// something else covers that cell, and Events beside what they join. A
// Domain's sheet is drawn around its notes, so it follows them.

import type { Point } from '$lib/types';
import type { CmView } from './graph-view';
import { CONCEPT_MAP } from '$lib/ui/tokens';

/** The side of a sticky note. */
export const NOTE = CONCEPT_MAP.note.size;
export const DIAMOND = 14; // half the diagonal
const SLOT_COLS = 3;
const CELL_W = 190;
const CELL_H = 150;
const GROUPS_PER_ROW = 2;
const SLOT_PAD = 90;
/** Space around the notes inside a Domain's sheet. */
const DOMAIN_PAD = 28;
/** The band above the notes that holds the Domain's name and its rule. */
export const DOMAIN_TITLE_BAND = 60;
/** Where the rule under the Domain's name sits, down from the sheet's top. */
export const DOMAIN_RULE_Y = 44;
const EMPTY_DOMAIN = { w: 260, h: 160 };
/** Where a slot's first note puts its sheet's top-left corner, measured from the slot's origin. */
const SHEET_INSET = { x: CELL_W / 2 - NOTE / 2 - DOMAIN_PAD, y: CELL_H / 2 - NOTE / 2 };
/** Inside padding between a note's edge and its text. */
const NOTE_PAD = 8;
/** The least clear space between a note not yet placed and any note already on the Map. */
const NOTE_GAP = 16;

export interface Box {
	x: number; // centre
	y: number;
	w: number;
	h: number;
}

export interface Rect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

// ── Text in Caveat Brush ─────────────────────────────────────────────
// Character widths as a share of the font size, measured in a browser and
// grouped into four classes: narrow strokes about a quarter, m and w about
// three fifths, capitals half, everything else about two fifths. Close
// enough (within a few per cent on real names) to size text without
// measuring it at run time.

function charEm(c: string): number {
	if (" iljtfrI1.,;:!|'-".includes(c)) return 0.26;
	if ('mwMW'.includes(c)) return 0.6;
	if (c >= 'A' && c <= 'Z') return 0.5;
	return 0.41;
}

/** The width of `text` in Caveat Brush, in ems. */
export function textEm(text: string): number {
	let em = 0;
	for (const c of text) em += charEm(c);
	return em;
}

/** Word-wrap `text` into lines no wider than `maxEm`. A word wider than that gets a line of its own. */
function wrapEm(text: string, maxEm: number): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const next = line ? `${line} ${word}` : word;
		if (line && textEm(next) > maxEm) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines;
}

export interface NoteText {
	lines: string[];
	size: number;
	lineHeight: number;
}

/**
 * The name on a sticky note: wrapped to at most three lines, at the largest
 * font size that fits the note. A name that does not fit even at the
 * smallest size keeps its first lines, the last one cut short with "…".
 */
export function noteText(name: string): NoteText {
	const { sizeMax, sizeMin, maxLines } = CONCEPT_MAP.noteLabel;
	const width = NOTE - NOTE_PAD * 2;
	for (let size = sizeMax; size >= sizeMin; size--) {
		const lines = wrapEm(name, width / size);
		if (lines.length <= maxLines && lines.every((l) => textEm(l) * size <= width)) {
			return { lines, size, lineHeight: size * 1.05 };
		}
	}
	const size = sizeMin;
	const maxEm = width / size;
	// Shorten a line until it fits with "…" on the end
	const ellipsis = (line: string) => {
		let out = line.replace(/…$/, '');
		while (out.length > 1 && textEm(`${out}…`) > maxEm) out = out.slice(0, -1);
		return `${out}…`;
	};
	let lines = wrapEm(name, maxEm).map((l) => (textEm(l) > maxEm ? ellipsis(l) : l));
	if (lines.length > maxLines) {
		lines = lines.slice(0, maxLines);
		lines[maxLines - 1] = ellipsis(lines[maxLines - 1]);
	}
	return { lines, size, lineHeight: size * 1.05 };
}

/** Word-wrap a sentence into lines of about `width` characters (the Event labels). */
export function wrap(text: string, width = 28): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/).filter(Boolean)) {
		if (line && (line + ' ' + word).length > width) {
			lines.push(line);
			line = word;
		} else {
			line = line ? `${line} ${word}` : word;
		}
	}
	if (line) lines.push(line);
	return lines;
}

// ── A hand-placed look ───────────────────────────────────────────────

/** A stable number from 0 to 1 for an id, so each note keeps its tilt across renders. */
function unit(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0) / 4294967295;
}

/** A small tilt in degrees, between -max and max, worked out from the id. */
export function tilt(id: string, max: number): number {
	return Math.round((unit(id) * 2 - 1) * max * 10) / 10;
}

// ── Layout ───────────────────────────────────────────────────────────

interface Group {
	domainId: string | null;
	conceptIds: string[];
}

function groupsOf(cm: CmView): Group[] {
	const groups: Group[] = cm.domains.map((d) => ({
		domainId: d.id,
		conceptIds: cm.concepts.filter((c) => c.domainId === d.id).map((c) => c.id)
	}));
	const loose = cm.concepts.filter((c) => !c.domainId || !cm.domainById.has(c.domainId)).map((c) => c.id);
	if (loose.length > 0) groups.push({ domainId: null, conceptIds: loose });
	return groups;
}

/** Where each Domain group's slot starts, row by row. */
function slotOrigins(groups: Group[]): Point[] {
	const origins: Point[] = [];
	let y = 0;
	for (let row = 0; row * GROUPS_PER_ROW < groups.length; row++) {
		const inRow = groups.slice(row * GROUPS_PER_ROW, (row + 1) * GROUPS_PER_ROW);
		const rows = Math.max(1, ...inRow.map((g) => Math.ceil(g.conceptIds.length / SLOT_COLS)));
		inRow.forEach((_, i) => origins.push({ x: i * (SLOT_COLS * CELL_W + SLOT_PAD), y }));
		y += rows * CELL_H + SLOT_PAD + DOMAIN_TITLE_BAND;
	}
	return origins;
}

export interface MapGeometry {
	concepts: Map<string, Box>;
	events: Map<string, Box>;
	domains: { id: string; name: string; rect: Rect; empty: boolean }[];
}

/**
 * Every note and Event box, with saved positions first and `overrides`
 * (a box being dragged) on top. Domain sheets are computed last.
 */
export function mapGeometry(cm: CmView, overrides: Record<string, Point> = {}): MapGeometry {
	const groups = groupsOf(cm);
	const origins = slotOrigins(groups);
	const concepts = new Map<string, Box>();

	// A sheet moved by its name keeps that spot, and its notes not placed yet
	// start their grid there
	const sheetSpot = (domainId: string | null): Point | undefined =>
		domainId ? (overrides[domainId] ?? cm.layout.domains[domainId]) : undefined;

	// Saved notes first, so the notes not placed yet can keep clear of them
	for (const group of groups) {
		for (const id of group.conceptIds) {
			const saved = overrides[id] ?? cm.layout.concepts[id];
			if (saved) concepts.set(id, { x: saved.x, y: saved.y, w: NOTE, h: NOTE });
		}
	}
	const clear = (p: Point): boolean => {
		for (const b of concepts.values()) {
			if (Math.abs(b.x - p.x) < NOTE + NOTE_GAP && Math.abs(b.y - p.y) < NOTE + NOTE_GAP) return false;
		}
		return true;
	};

	const place = (id: string, at: Point) => concepts.set(id, { x: at.x, y: at.y, w: NOTE, h: NOTE });

	// Each note not placed yet keeps its own grid cell while that cell is clear
	const covered: { id: string; cellAt: (cell: number) => Point }[] = [];
	groups.forEach((group, g) => {
		const spot = sheetSpot(group.domainId);
		const origin = spot ? { x: spot.x - SHEET_INSET.x, y: spot.y - SHEET_INSET.y } : origins[g];
		const cellAt = (cell: number): Point => ({
			x: origin.x + (cell % SLOT_COLS) * CELL_W + CELL_W / 2,
			y: origin.y + DOMAIN_TITLE_BAND + Math.floor(cell / SLOT_COLS) * CELL_H + CELL_H / 2
		});
		group.conceptIds.forEach((id, i) => {
			if (concepts.has(id)) return;
			if (clear(cellAt(i))) place(id, cellAt(i));
			else covered.push({ id, cellAt });
		});
	});
	// A note whose own cell is covered takes the first clear cell of its
	// Domain's grid. The rest stay put, so dragging one note never shuffles them
	for (const { id, cellAt } of covered) {
		let cell = 0;
		while (!clear(cellAt(cell))) cell++;
		place(id, cellAt(cell));
	}

	// Events: saved, else beside the Concept it is, else on its Relationship,
	// else in the middle of what it joins, else in a row below everything.
	const bottom = Math.max(0, ...[...concepts.values()].map((b) => b.y + b.h / 2)) + 110;
	const events = new Map<string, Box>();
	let floating = 0;
	for (const ev of cm.events) {
		const saved = overrides[ev.id] ?? cm.layout.events[ev.id];
		let at: Point | undefined = saved;
		if (!at && ev.conceptId && concepts.has(ev.conceptId)) {
			const c = concepts.get(ev.conceptId)!;
			at = { x: c.x + c.w / 2 + 30, y: c.y - 30 };
		}
		if (!at && ev.relationshipId) {
			const rel = cm.relationshipById.get(ev.relationshipId);
			const a = rel && concepts.get(rel.sourceId);
			const b = rel && concepts.get(rel.targetId);
			if (a && b) at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 34 };
		}
		if (!at && ev.conceptIds.length > 0) {
			const joined = ev.conceptIds.map((id) => concepts.get(id)).filter((b): b is Box => !!b);
			if (joined.length > 0) {
				at = {
					x: joined.reduce((sum, b) => sum + b.x, 0) / joined.length + 24,
					y: joined.reduce((sum, b) => sum + b.y, 0) / joined.length + 56
				};
			}
		}
		if (!at) at = { x: 100 + floating++ * 220, y: bottom };
		events.set(ev.id, { x: at.x, y: at.y, w: DIAMOND * 2, h: DIAMOND * 2 });
	}

	const domains = groups
		.filter((g) => g.domainId)
		.map((g) => {
			const domain = cm.domainById.get(g.domainId!)!;
			const boxes = g.conceptIds.map((id) => concepts.get(id)!).filter(Boolean);
			if (boxes.length === 0) {
				// An empty sheet sits at its saved spot, else where its first note will put it
				const slot = origins[groups.indexOf(g)];
				const o = sheetSpot(domain.id) ?? { x: slot.x + SHEET_INSET.x, y: slot.y + SHEET_INSET.y };
				return {
					id: domain.id,
					name: domain.name,
					empty: true,
					rect: { left: o.x, top: o.y, right: o.x + EMPTY_DOMAIN.w, bottom: o.y + EMPTY_DOMAIN.h }
				};
			}
			return {
				id: domain.id,
				name: domain.name,
				empty: false,
				rect: {
					left: Math.min(...boxes.map((b) => b.x - b.w / 2)) - DOMAIN_PAD,
					top: Math.min(...boxes.map((b) => b.y - b.h / 2)) - DOMAIN_TITLE_BAND,
					right: Math.max(...boxes.map((b) => b.x + b.w / 2)) + DOMAIN_PAD,
					bottom: Math.max(...boxes.map((b) => b.y + b.h / 2)) + DOMAIN_PAD
				}
			};
		});

	return { concepts, events, domains };
}

/** Something on the Map that has a saved spot: a note's centre, a diamond's centre, or a sheet's top-left. */
export interface Placed {
	id: string;
	kind: 'concept' | 'event' | 'domain';
	at: Point;
}

/**
 * What moves when a Domain's sheet is dragged by its name: the sheet's own
 * spot, every note in the Domain, and each placed Event whose Concepts are all
 * in it (an Event not yet placed follows its Concepts by itself).
 */
export function domainMembers(cm: CmView, geometry: MapGeometry, domainId: string): Placed[] {
	const sheet = geometry.domains.find((d) => d.id === domainId);
	if (!sheet) return [];
	const members: Placed[] = [{ id: domainId, kind: 'domain', at: { x: sheet.rect.left, y: sheet.rect.top } }];
	const inDomain = new Set(cm.concepts.filter((c) => c.domainId === domainId).map((c) => c.id));
	for (const id of inDomain) {
		const box = geometry.concepts.get(id)!;
		members.push({ id, kind: 'concept', at: { x: box.x, y: box.y } });
	}
	for (const ev of cm.events) {
		const box = geometry.events.get(ev.id);
		if (!box || !cm.layout.events[ev.id]) continue;
		const rel = ev.relationshipId ? cm.relationshipById.get(ev.relationshipId) : undefined;
		const attached = [...ev.conceptIds, ...(ev.conceptId ? [ev.conceptId] : []), ...(rel ? [rel.sourceId, rel.targetId] : [])];
		if (attached.length > 0 && attached.every((id) => inDomain.has(id))) members.push({ id: ev.id, kind: 'event', at: { x: box.x, y: box.y } });
	}
	return members;
}

/** Where the line from a box's centre towards `toward` leaves the box. */
export function edgePoint(box: Box, toward: Point): Point {
	const dx = toward.x - box.x;
	const dy = toward.y - box.y;
	if (dx === 0 && dy === 0) return { x: box.x, y: box.y };
	const t = Math.min(dx === 0 ? Infinity : box.w / 2 / Math.abs(dx), dy === 0 ? Infinity : box.h / 2 / Math.abs(dy));
	return { x: box.x + dx * t, y: box.y + dy * t };
}

// ── Relationship curves ──────────────────────────────────────────────

/**
 * The control point of a gentle curve from `a` to `b`: the midpoint pushed
 * sideways by `bend` times the distance. A positive bend bows to the left of
 * a to b, a negative one to the right, and 0 is a straight line.
 */
export function curveControl(a: Point, b: Point, bend: number): Point {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend };
}

/** The point at `t` (0 to 1) along the quadratic curve from `p1` to `p2` through control `c`. */
export function curvePoint(p1: Point, p2: Point, c: Point, t: number): Point {
	const u = 1 - t;
	return { x: u * u * p1.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p1.y + 2 * u * t * c.y + t * t * p2.y };
}

/** How far each curve between the same two Concepts bows: apart when there are several, one gentle arc when alone. */
export function bendsFor(count: number, single: number): number[] {
	if (count === 1) return [single];
	return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 0.22);
}

// ── Verbs on a Relationship line ─────────────────────────────────────

/** The height of a verb label's backing rect. */
export const LABEL_H = 18;
/** What a second line adds to it: the Step 7 rule words under the verb. */
export const LABEL_LINE = 15;
const LABEL_GAP = 6;

/** Width of a verb label's backing rect, in Caveat Brush at the label size. */
export function labelWidth(text: string): number {
	return textEm(text) * CONCEPT_MAP.relationshipLabel.size + 10;
}

export interface LineLabel {
	text: string;
	/** The Step 7 rule words under the verb ("one or many"), once that end of the rule is set. */
	rule?: string;
	/** Centre of the label. */
	x: number;
	y: number;
	w: number;
	h: number;
}

/** The rule words under each verb, by direction. */
export interface LineRules {
	forward?: string;
	inverse?: string;
}

/** A label's backing rect: as wide as its longer line, one line tall or two. */
export function labelBox(text: string, rule?: string): { w: number; h: number } {
	return { w: Math.max(labelWidth(text), rule ? labelWidth(rule) : 0), h: rule ? LABEL_H + LABEL_LINE : LABEL_H };
}

function label(text: string, at: Point, rule?: string): LineLabel {
	return { text, rule, x: at.x, y: at.y, ...labelBox(text, rule) };
}

/**
 * Where a Relationship's two verbs (Step 6) sit on its line, from `p1` at the
 * source Concept to `p2` at the target, following the curve through `ctrl`
 * when there is one. The verb sits near the source and the inverse verb near
 * the target, each with its Step 7 rule words under it (`rules`), so reading
 * from either note the nearest label starts the sentence: "Customer places
 * one or many", "Sales Order is placed by one". Each sits a third of the way
 * along, or nearer its end when a third would crowd the other. On a line too
 * short for both, they stack at the middle with a mark showing which way
 * each one reads. A line with no inverse verb keeps the one verb, and the
 * forward rule words, at its middle.
 */
export function lineLabels(p1: Point, p2: Point, verb: string, inverse: string, ctrl?: Point, rules: LineRules = {}): LineLabel[] {
	const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
	// A position `s` along the chord, moved onto the curve
	const onCurve = (s: number): Point => (ctrl ? curvePoint(p1, p2, ctrl, s / len) : { x: p1.x + ((p2.x - p1.x) * s) / len, y: p1.y + ((p2.y - p1.y) * s) / len });
	const mid = onCurve(len / 2);
	if (!inverse.trim()) return [label(verb, mid, rules.forward)];

	const ux = (p2.x - p1.x) / len;
	const uy = (p2.y - p1.y) / len;
	// How far a label reaches along the line, by the size of its backing rect
	const reach = (box: { w: number; h: number }) => (Math.abs(box.w * ux) + Math.abs(box.h * uy)) / 2;
	const forwardReach = reach(labelBox(verb, rules.forward));
	const inverseReach = reach(labelBox(inverse, rules.inverse));

	const minF = forwardReach + LABEL_GAP;
	const minI = inverseReach + LABEL_GAP;
	const fits = (sF: number, sI: number) => sF >= minF && len - sI >= minI && sI - sF >= forwardReach + inverseReach + LABEL_GAP;

	for (const s of [0.3, 0]) {
		const sF = Math.max(minF, len * s);
		const sI = Math.min(len - minI, len * (1 - s));
		if (fits(sF, sI)) return [label(verb, onCurve(sF), rules.forward), label(inverse, onCurve(sI), rules.inverse)];
	}

	// Too short: stack at the middle, each with a mark pointing the way it reads
	if (Math.abs(ux) >= Math.abs(uy)) {
		// A mostly level line: one above the other, the mark on the side it reads towards
		const targetIsRight = ux >= 0;
		const above = label(targetIsRight ? `${verb} ›` : `‹ ${verb}`, mid, rules.forward);
		const below = label(targetIsRight ? `‹ ${inverse}` : `${inverse} ›`, mid, rules.inverse);
		return [
			{ ...above, y: mid.y - above.h / 2 },
			{ ...below, y: mid.y + below.h / 2 }
		];
	}
	// A mostly upright line: side by side, marked up or down
	const targetIsBelow = uy >= 0;
	const forward = label(`${verb} ${targetIsBelow ? '↓' : '↑'}`, mid, rules.forward);
	const backward = label(`${inverse} ${targetIsBelow ? '↑' : '↓'}`, mid, rules.inverse);
	// Room for the rule words with the mark too, as the Map draws them with its
	// verbs switched off, so side-by-side labels never overlap
	const roomy = (l: LineLabel): LineLabel => ({ ...l, w: Math.max(l.w, l.rule ? labelWidth(`${l.rule} ↓`) : 0) });
	const [f, b] = [roomy(forward), roomy(backward)];
	return [
		{ ...f, x: mid.x - f.w / 2 - 3 },
		{ ...b, x: mid.x + b.w / 2 + 3 }
	];
}

/** The bounds of everything on the Map, for fit-to-screen. */
export function bounds(geometry: MapGeometry): Rect | null {
	const rects: Rect[] = [
		...[...geometry.concepts.values(), ...geometry.events.values()].map((b) => ({
			left: b.x - b.w / 2,
			top: b.y - b.h / 2,
			right: b.x + b.w / 2,
			bottom: b.y + b.h / 2 + 40
		})),
		// A sheet's tape reaches a little above its top edge
		...geometry.domains.map((d) => ({ ...d.rect, top: d.rect.top - 14 }))
	];
	if (rects.length === 0) return null;
	return {
		left: Math.min(...rects.map((r) => r.left)),
		top: Math.min(...rects.map((r) => r.top)),
		right: Math.max(...rects.map((r) => r.right)),
		bottom: Math.max(...rects.map((r) => r.bottom))
	};
}
