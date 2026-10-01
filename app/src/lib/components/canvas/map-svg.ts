// Export SVG: the whole Concept Map as one SVG file that stands alone.
//
// The file is the Map itself. MapView draws the Map once, off screen, as a
// picture (nothing to move, no pan or zoom), so the file always matches the
// Map on screen. This module frames that picture on white, puts the Blue
// Book's hand (Caveat Brush) inside it, and turns it into text.
//
// The frame is measured from what was drawn, not taken from bounds(): a
// curve bows past the notes it joins, and a long Domain name runs past its
// sheet.
//
// Mode-agnostic like the canvas: it reads the view model, never the store.

import { mount, unmount } from 'svelte';
import type { DataAdapter } from '$lib/cp-shared';
import latinUrl from '@fontsource/caveat-brush/files/caveat-brush-latin-400-normal.woff2?url';
import latinExtUrl from '@fontsource/caveat-brush/files/caveat-brush-latin-ext-400-normal.woff2?url';
import unicode from '@fontsource/caveat-brush/unicode.json';
import type { CmView } from '$lib/model/graph-view';
import { CONCEPT_MAP } from '$lib/ui/tokens';
import MapView from './MapView.svelte';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Characters XML 1.0 does not allow. A name pasted from a word processor can
 * carry one (a line break there is often U+000B), and one is enough to stop
 * the file opening, so they are dropped.
 */
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

/**
 * The two parts of Caveat Brush that @fontsource ships, each with the
 * characters it covers, in @fontsource's own order. Where the two ranges
 * overlap, the later rule wins, so the file draws those characters from the
 * same part as the app does.
 */
const CAVEAT_BRUSH = [
	{ url: latinExtUrl, range: unicode['latin-ext'] },
	{ url: latinUrl, range: unicode.latin }
];

/** Whether `text` has a character in a CSS unicode-range, such as "U+0000-00FF,U+0131". */
function usesRange(text: string, range: string): boolean {
	const spans = range.split(',').map((part) => {
		const [from, to = from] = part.trim().replace(/^U\+/i, '').split('-');
		return [parseInt(from, 16), parseInt(to, 16)];
	});
	for (const char of text) {
		const code = char.codePointAt(0)!;
		if (spans.some(([from, to]) => code >= from && code <= to)) return true;
	}
	return false;
}

/** A font file as base64. */
async function base64(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Could not load the font file ${url}`);
	const bytes = new Uint8Array(await response.arrayBuffer());
	let binary = '';
	// In slices, because one call with every byte overflows the stack
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

/** An @font-face rule for each part of Caveat Brush that `text` needs, with the font inside. */
async function fontFaces(text: string): Promise<string> {
	const parts = CAVEAT_BRUSH.filter((part) => usesRange(text, part.range));
	const rules = await Promise.all(
		parts.map(
			async (part) =>
				`@font-face { font-family: 'Caveat Brush'; font-style: normal; font-weight: 400; src: url(data:font/woff2;base64,${await base64(part.url)}) format('woff2'); unicode-range: ${part.range}; }`
		)
	);
	return rules.join('\n');
}

/**
 * The whole Map of `cm` as the text of an SVG file: every Domain, note,
 * curve and diamond, with space round them, on white. `adapter` is the one
 * the canvas has, which MapView reads from context.
 */
export async function mapSvg(cm: CmView, adapter: DataAdapter): Promise<string> {
	// Measure with the font the picture uses, so a name is as wide as it will be
	await document.fonts.load(`${CONCEPT_MAP.noteLabel.sizeMax}px 'Caveat Brush'`);

	// The picture has to be in the page to be measured, so it is drawn out of sight
	const host = document.createElement('div');
	host.setAttribute('aria-hidden', 'true');
	host.style.cssText = 'position: fixed; left: -100000px; top: 0; pointer-events: none';
	document.body.append(host);
	let picture: Record<string, unknown> | undefined;
	try {
		picture = mount(MapView, { target: host, props: { cm, picture: true }, context: new Map([['dataAdapter', adapter]]) });
		const svg = host.querySelector('svg');
		if (!svg) throw new Error('The Map drew no picture');

		const box = svg.getBBox();
		const pad = CONCEPT_MAP.picture.padding;
		const x = Math.floor(box.x) - pad;
		const y = Math.floor(box.y) - pad;
		const w = Math.ceil(box.x + box.width) + pad - x;
		const h = Math.ceil(box.y + box.height) + pad - y;
		svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
		svg.setAttribute('width', String(w));
		svg.setAttribute('height', String(h));

		// Svelte marks where its blocks go with empty comments. A file has no use for them.
		const walker = document.createTreeWalker(svg, NodeFilter.SHOW_COMMENT);
		const comments: Node[] = [];
		while (walker.nextNode()) comments.push(walker.currentNode);
		for (const comment of comments) comment.parentNode?.removeChild(comment);

		const background = document.createElementNS(SVG_NS, 'rect');
		for (const [name, value] of Object.entries({ x, y, width: w, height: h, fill: CONCEPT_MAP.picture.background })) {
			background.setAttribute(name, String(value));
		}
		const style = document.createElementNS(SVG_NS, 'style');
		style.textContent = await fontFaces(svg.textContent ?? '');
		svg.prepend(style, background);

		return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg).replace(NOT_XML, '')}\n`;
	} finally {
		if (picture) unmount(picture);
		host.remove();
	}
}
