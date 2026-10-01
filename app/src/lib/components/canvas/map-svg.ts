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
// The file holds only the layers it is given, the ones the Map shows. Its
// frame is the whole Map's whichever layers are on, so every set of layers
// gives the same page: the Blue Book's figures for Steps 4, 6, 7 and 8 line
// up when they come from one model.
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
import { ALL_MAP_LAYERS, type MapLayer } from './map-layers.svelte';

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

interface Frame {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** The box round everything drawn in `svg`, with the picture's padding on each side. */
function frameOf(svg: SVGSVGElement): Frame {
	const box = svg.getBBox();
	const pad = CONCEPT_MAP.picture.padding;
	const x = Math.floor(box.x) - pad;
	const y = Math.floor(box.y) - pad;
	return { x, y, w: Math.ceil(box.x + box.width) + pad - x, h: Math.ceil(box.y + box.height) + pad - y };
}

/**
 * Draw the Map of `cm` as a still picture with `layers` on, hand its <svg>
 * to `use`, then take the picture away.
 */
async function withPicture<T>(
	cm: CmView,
	adapter: DataAdapter,
	layers: readonly MapLayer[],
	use: (svg: SVGSVGElement) => T | Promise<T>
): Promise<T> {
	// The picture has to be in the page to be measured, so it is drawn out of sight
	const host = document.createElement('div');
	host.setAttribute('aria-hidden', 'true');
	host.style.cssText = 'position: fixed; left: -100000px; top: 0; pointer-events: none';
	document.body.append(host);
	let picture: Record<string, unknown> | undefined;
	try {
		picture = mount(MapView, { target: host, props: { cm, picture: true, layers }, context: new Map([['dataAdapter', adapter]]) });
		const svg = host.querySelector('svg');
		if (!svg) throw new Error('The Map drew no picture');
		return await use(svg);
	} finally {
		if (picture) unmount(picture);
		host.remove();
	}
}

/**
 * The Map of `cm` as the text of an SVG file: each Domain, note, curve,
 * verb and diamond in `layers`, with space round the whole Map, on white.
 * `adapter` is the one the canvas has, which MapView reads from context.
 */
export async function mapSvg(cm: CmView, adapter: DataAdapter, layers: readonly MapLayer[] = ALL_MAP_LAYERS): Promise<string> {
	// Measure with the font the picture uses, so a name is as wide as it will be
	await document.fonts.load(`${CONCEPT_MAP.noteLabel.sizeMax}px 'Caveat Brush'`);

	// With a layer off, the frame comes from a picture with every layer on
	const everyLayer = ALL_MAP_LAYERS.every((layer) => layers.includes(layer));
	const frame = everyLayer ? null : await withPicture(cm, adapter, ALL_MAP_LAYERS, frameOf);

	return withPicture(cm, adapter, layers, async (svg) => {
		const { x, y, w, h } = frame ?? frameOf(svg);
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
		// Caveat Brush goes in for the text drawn in it, so a file with no notes or verbs carries none
		const handwriting = [...svg.querySelectorAll('text')]
			.filter((text) => text.getAttribute('font-family')?.includes('Caveat Brush'))
			.map((text) => text.textContent ?? '')
			.join('');
		const faces = await fontFaces(handwriting);
		const style = document.createElementNS(SVG_NS, 'style');
		style.textContent = faces;
		svg.prepend(...(faces ? [style] : []), background);

		return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg).replace(NOT_XML, '')}\n`;
	});
}
