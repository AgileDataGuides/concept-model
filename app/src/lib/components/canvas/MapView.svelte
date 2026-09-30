<script lang="ts">
	// The Concept Map (Step 9 and the Map tab): the Concept Model as one
	// picture, drawn the way the Blue Book draws it. Concepts are blue sticky
	// notes, Domains are pinned sheets of paper, Events are diamonds, and every
	// Relationship is a gentle green curve carrying both its verbs. Plain SVG,
	// following the Context Plane's own ConceptMapView: pan, zoom, fit, drag to
	// place. Positions save to this Map (the model), never to the shared Concept.
	import '@fontsource/caveat-brush';
	import { getContext } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmRelationship, CmView } from '$lib/model/graph-view';
	import { setModelFields } from '$lib/model/graph-actions';
	import {
		bendsFor,
		bounds,
		curveControl,
		curvePoint,
		DIAMOND,
		DOMAIN_RULE_Y,
		domainMembers,
		edgePoint,
		LABEL_H,
		labelWidth,
		lineLabels,
		mapGeometry,
		NOTE,
		noteText,
		tilt,
		wrap,
		type Box,
		type LineLabel,
		type Placed
	} from '$lib/model/map-layout';
	import { relationshipSentences, relationshipTriple } from '$lib/model/rules';
	import { colorOf } from '$lib/constants/context-types';
	import type { Point } from '$lib/types';
	import { BUTTON, CONCEPT_MAP, INPUT } from '$lib/ui/tokens';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	// Events keep their entity colour, with the § 12 opacity suffixes. Notes,
	// sheets and curves take the Blue Book's own colours (tokens.md concept_map).
	const EVENT = colorOf('global_core_business_event');
	const {
		note: NOTE_STYLE,
		noteShadow,
		noteFold,
		notePin,
		noteLabel,
		domainCard,
		domainShadow,
		domainTape,
		domainRule,
		domainTitle,
		relationshipLine,
		relationshipLabel,
		selected: SELECTED
	} = CONCEPT_MAP;

	// Filter ids must be unique in the page
	const uid = $props.id();
	const noteShadowId = `cm-note-shadow-${uid}`;
	const sheetShadowId = `cm-sheet-shadow-${uid}`;

	let width = $state(0);
	let height = $state(0);
	let panX = $state(40);
	let panY = $state(40);
	let zoom = $state(1);
	let svgEl = $state<SVGSVGElement | null>(null);

	type Kind = 'concept' | 'event';
	// A press that moves less than this, in screen pixels, is a click, not a drag
	const DRAG_SLOP = 3;
	let drag = $state<{ id: string; kind: Kind; dx: number; dy: number; start: Point; moved: boolean } | null>(null);
	let dragAt = $state<Record<string, Point>>({});
	let pan = $state<{ x: number; y: number; px: number; py: number } | null>(null);
	// A Domain's sheet dragged by its name moves everything in it together
	let sheetDrag = $state<{ id: string; start: Point; members: Placed[]; moved: boolean } | null>(null);
	// The note, diamond or sheet with focus, from Tab or a click, looks selected
	// like the one being dragged, so a keyboard user can see what the arrow keys will move
	let focusId = $state<string | null>(null);

	const geometry = $derived(mapGeometry(cm, dragAt));

	function isSelected(id: string): boolean {
		return drag?.id === id || sheetDrag?.id === id || focusId === id;
	}

	function nameOf(conceptId: string): string {
		return cm.conceptById.get(conceptId)?.name ?? '?';
	}

	function lineTitle(rel: CmRelationship): string {
		const source = nameOf(rel.sourceId);
		const target = nameOf(rel.targetId);
		const s = relationshipSentences({ label: rel.verb, inverseLabel: rel.inverseVerb, rule: rel.rule }, source, target);
		return [s.forward ?? relationshipTriple(source, rel.verb, target), s.inverse].filter(Boolean).join('\n');
	}

	// Relationship curves. A single curve bows gently, to a side worked out from
	// the pair so it stays put. Curves between the same two Concepts bow apart.
	// Each curve carries both Step 6 verbs, the verb near its source Concept and
	// the inverse verb near its target (lineLabels).
	const lines = $derived.by(() => {
		const byPair = new Map<string, CmRelationship[]>();
		for (const rel of cm.relationships) {
			const key = [rel.sourceId, rel.targetId].sort().join('|');
			byPair.set(key, [...(byPair.get(key) ?? []), rel]);
		}
		const out: { rel: CmRelationship; path: string; mx: number; my: number; labels: LineLabel[] }[] = [];
		for (const [key, rels] of byPair) {
			const [firstId, secondId] = key.split('|');
			const a = geometry.concepts.get(firstId);
			const b = geometry.concepts.get(secondId);
			if (!a || !b) continue;
			const side = tilt(key, 1) >= 0 ? 1 : -1;
			const bends = bendsFor(rels.length, relationshipLine.bend * side);
			rels.forEach((rel, i) => {
				if (rel.sourceId === rel.targetId) {
					const x = a.x + a.w / 2;
					const lift = i * 16;
					const mx = x + 48 + lift;
					const labels: LineLabel[] = rel.inverseVerb
						? [
								{ text: rel.verb, x: mx, y: a.y - LABEL_H / 2, w: labelWidth(rel.verb) },
								{ text: rel.inverseVerb, x: mx, y: a.y + LABEL_H / 2, w: labelWidth(rel.inverseVerb) }
							]
						: [{ text: rel.verb, x: mx, y: a.y, w: labelWidth(rel.verb) }];
					out.push({ rel, path: `M ${x} ${a.y - 10} C ${x + 60 + lift} ${a.y - 50 - lift}, ${x + 60 + lift} ${a.y + 50 + lift}, ${x} ${a.y + 10}`, mx, my: a.y, labels });
					return;
				}
				// Laid out first to second Concept, so curves between the same pair bow apart
				const ctrl = curveControl(a, b, bends[i]);
				const [edgeA, edgeB] = [edgePoint(a, ctrl), edgePoint(b, ctrl)];
				// Orient the ends source to target, so each verb sits near its own Concept
				const [p1, p2] = rel.sourceId === firstId ? [edgeA, edgeB] : [edgeB, edgeA];
				const mid = curvePoint(p1, p2, ctrl, 0.5);
				out.push({
					rel,
					path: `M ${p1.x} ${p1.y} Q ${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`,
					mx: mid.x,
					my: mid.y,
					labels: lineLabels(p1, p2, rel.verb, rel.inverseVerb, ctrl)
				});
			});
		}
		return out;
	});

	const lineMid = $derived(new Map(lines.map((l) => [l.rel.id, { x: l.mx, y: l.my }])));

	// Thin dashed connectors from each diamond to what it joins or sits on
	const connectors = $derived.by(() => {
		const out: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
		for (const ev of cm.events) {
			const d = geometry.events.get(ev.id);
			if (!d) continue;
			const targets = new Set(ev.conceptIds);
			if (ev.conceptId) targets.add(ev.conceptId);
			for (const conceptId of targets) {
				const c = geometry.concepts.get(conceptId);
				if (!c) continue;
				const p = edgePoint(c, d);
				out.push({ key: `${ev.id}-${conceptId}`, x1: d.x, y1: d.y, x2: p.x, y2: p.y });
			}
			const mid = ev.relationshipId ? lineMid.get(ev.relationshipId) : undefined;
			if (mid) out.push({ key: `${ev.id}-rel`, x1: d.x, y1: d.y, x2: mid.x, y2: mid.y });
		}
		return out;
	});

	// ── Pointer and keyboard ──

	function toWorld(e: PointerEvent): Point {
		const r = svgEl!.getBoundingClientRect();
		return { x: (e.clientX - r.left - panX) / zoom, y: (e.clientY - r.top - panY) / zoom };
	}

	function startDrag(e: PointerEvent, id: string, kind: Kind, box: Box) {
		if (e.button !== 0) return;
		e.stopPropagation();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		const p = toWorld(e);
		drag = { id, kind, dx: p.x - box.x, dy: p.y - box.y, start: p, moved: false };
	}

	function startSheetDrag(e: PointerEvent, domainId: string) {
		if (e.button !== 0) return;
		e.stopPropagation();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		sheetDrag = { id: domainId, start: toWorld(e), members: domainMembers(cm, geometry, domainId), moved: false };
	}

	function startPan(e: PointerEvent) {
		if (e.button !== 0) return;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		pan = { x: e.clientX, y: e.clientY, px: panX, py: panY };
	}

	/** Whether the pointer has left the click zone around where the press started. */
	function beyondSlop(p: Point, start: Point): boolean {
		return Math.hypot(p.x - start.x, p.y - start.y) * zoom >= DRAG_SLOP;
	}

	function onPointerMove(e: PointerEvent) {
		if (sheetDrag) {
			const p = toWorld(e);
			if (!sheetDrag.moved && !beyondSlop(p, sheetDrag.start)) return;
			const dx = p.x - sheetDrag.start.x;
			const dy = p.y - sheetDrag.start.y;
			dragAt = Object.fromEntries(sheetDrag.members.map((m) => [m.id, { x: Math.round(m.at.x + dx), y: Math.round(m.at.y + dy) }]));
			sheetDrag.moved = true;
		} else if (drag) {
			const p = toWorld(e);
			if (!drag.moved && !beyondSlop(p, drag.start)) return;
			dragAt = { [drag.id]: { x: Math.round(p.x - drag.dx), y: Math.round(p.y - drag.dy) } };
			drag.moved = true;
		} else if (pan) {
			panX = pan.px + (e.clientX - pan.x);
			panY = pan.py + (e.clientY - pan.y);
		}
	}

	/** Save new spots for notes, diamonds and sheets in one write. */
	async function savePositions(moves: Placed[]) {
		const layout = { concepts: { ...cm.layout.concepts }, events: { ...cm.layout.events }, domains: { ...cm.layout.domains } };
		for (const m of moves) (m.kind === 'concept' ? layout.concepts : m.kind === 'event' ? layout.events : layout.domains)[m.id] = m.at;
		// A model with no sheet ever moved by its name keeps no domains map, so its file stays as it was
		const { domains, ...rest } = layout;
		await setModelFields(adapter, cm, { layout: Object.keys(domains).length > 0 ? layout : rest });
	}

	async function onPointerUp() {
		pan = null;
		if (!sheetDrag && !drag) return;
		const at = dragAt;
		let moves: Placed[] = [];
		if (sheetDrag) {
			const { members, moved } = sheetDrag;
			sheetDrag = null;
			if (moved) moves = members.map((m) => ({ ...m, at: at[m.id] ?? m.at }));
		} else if (drag) {
			const { id, kind, moved } = drag;
			drag = null;
			if (moved && at[id]) moves = [{ id, kind, at: at[id] }];
		}
		try {
			if (moves.length > 0) await savePositions(moves);
		} finally {
			// Drop the overrides, saved or not, unless a new drag has taken them over meanwhile
			if (dragAt === at) dragAt = {};
		}
	}

	/** The browser took the pointer back mid-press: nothing moves. */
	function onPointerCancel() {
		pan = null;
		drag = null;
		sheetDrag = null;
		dragAt = {};
	}

	/** How far an arrow key moves something: 10, or 40 with Shift. */
	function arrowStep(e: KeyboardEvent): Point | undefined {
		const step = e.shiftKey ? 40 : 10;
		const move: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
		return move[e.key];
	}

	function nudge(e: KeyboardEvent, id: string, kind: Kind, box: Box) {
		const by = arrowStep(e);
		if (!by) return;
		e.preventDefault();
		savePositions([{ id, kind, at: { x: box.x + by.x, y: box.y + by.y } }]);
	}

	function nudgeSheet(e: KeyboardEvent, domainId: string) {
		const by = arrowStep(e);
		if (!by) return;
		e.preventDefault();
		savePositions(domainMembers(cm, geometry, domainId).map((m) => ({ ...m, at: { x: m.at.x + by.x, y: m.at.y + by.y } })));
	}

	function zoomBy(factor: number, sx = width / 2, sy = height / 2) {
		const next = Math.max(0.25, Math.min(3, zoom * factor));
		panX = sx - ((sx - panX) / zoom) * next;
		panY = sy - ((sy - panY) / zoom) * next;
		zoom = next;
	}

	function fit() {
		const b = bounds(geometry);
		if (!b || width === 0 || height === 0) return;
		const pad = 40;
		const w = Math.max(1, b.right - b.left);
		const h = Math.max(1, b.bottom - b.top);
		zoom = Math.max(0.25, Math.min(1.5, Math.min((width - pad * 2) / w, (height - pad * 2) / h)));
		panX = (width - w * zoom) / 2 - b.left * zoom;
		panY = (height - h * zoom) / 2 - b.top * zoom;
	}

	// Fit once, when the Map first has both a size and something to show
	let fitted = false;
	$effect(() => {
		if (!fitted && width > 0 && height > 0 && (cm.concepts.length > 0 || cm.domains.length > 0)) {
			fitted = true;
			fit();
		}
	});

	// Wheel zoom needs a non-passive listener to stop the page scrolling
	const wheelZoom: Attachment<SVGSVGElement> = (el) => {
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const r = el.getBoundingClientRect();
			zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	};
</script>

<div class="relative w-full h-full min-h-96 {CONCEPT_MAP.canvas} overflow-hidden" bind:clientWidth={width} bind:clientHeight={height}>
	<div class="absolute top-2 left-3 right-3 z-10 flex items-center justify-between gap-3 pointer-events-none">
		<p class={INPUT.label}>Drag a note, a diamond, or a Domain by its name to move it, or use the arrow keys. Drag the background to pan, scroll to zoom.</p>
		<div class="flex items-center gap-2 pointer-events-auto">
			<button type="button" class={BUTTON.secondary} onclick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">&minus;</button>
			<button type="button" class={BUTTON.secondary} onclick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
			<button type="button" class={BUTTON.secondary} onclick={fit}>Fit</button>
		</div>
	</div>

	{#if cm.concepts.length === 0 && cm.domains.length === 0}
		<div class="absolute inset-0 flex items-center justify-center">
			<p class="text-[10px] text-slate-300 italic">Nothing on the Map yet. Add Domains in Step 1 and Concepts in Step 4.</p>
		</div>
	{/if}

	<svg
		bind:this={svgEl}
		{@attach wheelZoom}
		class="w-full h-full select-none touch-none {pan ? 'cursor-grabbing' : 'cursor-grab'}"
		role="application"
		aria-label="Concept Map"
		onpointerdown={startPan}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerCancel}
	>
		<defs>
			<filter id={noteShadowId} x="-20%" y="-20%" width="150%" height="150%">
				<feDropShadow dx={noteShadow.dx} dy={noteShadow.dy} stdDeviation={noteShadow.blur} flood-color={noteShadow.color} flood-opacity={noteShadow.opacity} />
			</filter>
			<filter id={sheetShadowId} x="-10%" y="-10%" width="120%" height="130%">
				<feDropShadow dx={domainShadow.dx} dy={domainShadow.dy} stdDeviation={domainShadow.blur} flood-color={domainShadow.color} flood-opacity={domainShadow.opacity} />
			</filter>
		</defs>

		<g transform="translate({panX} {panY}) scale({zoom})">
			<!-- Domains: pinned sheets of paper around their notes, faint so the notes stand out -->
			{#each geometry.domains as domain (domain.id)}
				{@const r = domain.rect}
				<g transform="rotate({tilt(domain.id, domainCard.tiltMaxDeg)} {(r.left + r.right) / 2} {(r.top + r.bottom) / 2})">
					<g opacity={domainCard.opacity}>
						<rect
							x={r.left}
							y={r.top}
							width={r.right - r.left}
							height={r.bottom - r.top}
							rx={domainCard.rx}
							fill={domainCard.fill}
							stroke={domainCard.stroke}
							stroke-width={domainCard.strokeWidth}
							filter="url(#{sheetShadowId})"
						/>
						<line x1={r.left} y1={r.top + DOMAIN_RULE_Y} x2={r.right} y2={r.top + DOMAIN_RULE_Y} stroke={domainRule.stroke} stroke-width={domainRule.strokeWidth} />
						<rect
							x={r.left + 18}
							y={r.top - domainTape.height / 2}
							width={domainTape.width}
							height={domainTape.height}
							fill={domainTape.fill}
							transform="rotate(-6 {r.left + 18 + domainTape.width / 2} {r.top})"
						/>
						<rect
							x={r.right - 18 - domainTape.width}
							y={r.top - domainTape.height / 2}
							width={domainTape.width}
							height={domainTape.height}
							fill={domainTape.fill}
							transform="rotate(5 {r.right - 18 - domainTape.width / 2} {r.top})"
						/>
					</g>
					{#if isSelected(domain.id)}
						<rect
							x={r.left}
							y={r.top}
							width={r.right - r.left}
							height={r.bottom - r.top}
							rx={domainCard.rx}
							fill="none"
							stroke={SELECTED.sheetStroke}
							stroke-width={SELECTED.sheetStrokeWidth}
							pointer-events="none"
						/>
					{/if}
					<!-- The name band is the sheet's handle: drag it to move the Domain and everything in it -->
					<g
						role="button"
						tabindex="0"
						aria-label="{domain.name}. Drag its name, or use the arrow keys, to move the Domain and everything in it."
						class="cursor-grab outline-none"
						onpointerdown={(e) => startSheetDrag(e, domain.id)}
						onkeydown={(e) => nudgeSheet(e, domain.id)}
						onfocus={() => (focusId = domain.id)}
						onblur={() => (focusId = null)}
					>
						<rect x={r.left} y={r.top} width={r.right - r.left} height={DOMAIN_RULE_Y} fill="transparent" />
						<text
							x={r.left + 16}
							y={r.top + 32}
							font-family={domainTitle.fontFamily}
							font-weight={domainTitle.fontWeight}
							font-size={domainTitle.size}
							fill={domainTitle.fill}
							opacity={domainTitle.opacity}>{domain.name}</text
						>
					</g>
				</g>
			{/each}

			<!-- Connectors from diamonds -->
			{#each connectors as c (c.key)}
				<line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="{EVENT}40" stroke-width="1" stroke-dasharray="3 3" />
			{/each}

			<!-- Relationships: green curves, each with its verbs -->
			{#each lines as line (line.rel.id)}
				<g>
					<title>{lineTitle(line.rel)}</title>
					<path d={line.path} fill="none" stroke={relationshipLine.stroke} stroke-width={relationshipLine.strokeWidth} />
					{#each line.labels as l, i (i)}
						<rect x={l.x - l.w / 2} y={l.y - LABEL_H / 2} width={l.w} height={LABEL_H} rx={relationshipLabel.rx} fill={relationshipLabel.backing} fill-opacity={relationshipLabel.backingOpacity} />
						<text
							x={l.x}
							y={l.y + 4.5}
							text-anchor="middle"
							font-family={relationshipLabel.fontFamily}
							font-size={relationshipLabel.size}
							fill={relationshipLabel.fill}>{l.text}</text
						>
					{/each}
				</g>
			{/each}

			<!-- Concepts: sticky notes, each turned a little -->
			{#each cm.concepts as concept (concept.id)}
				{@const box = geometry.concepts.get(concept.id)}
				{#if box}
					{@const text = noteText(concept.name)}
					{@const left = box.x - NOTE / 2}
					{@const top = box.y - NOTE / 2}
					{@const chosen = isSelected(concept.id)}
					<g
						role="button"
						tabindex="0"
						aria-label="{concept.name}. Drag, or use the arrow keys, to move it."
						class="cursor-grab outline-none"
						transform="rotate({tilt(concept.id, NOTE_STYLE.tiltMaxDeg)} {box.x} {box.y})"
						onpointerdown={(e) => startDrag(e, concept.id, 'concept', box)}
						onkeydown={(e) => nudge(e, concept.id, 'concept', box)}
						onfocus={() => (focusId = concept.id)}
						onblur={() => (focusId = null)}
					>
						<rect
							x={left}
							y={top}
							width={NOTE}
							height={NOTE}
							rx={NOTE_STYLE.rx}
							fill={NOTE_STYLE.fill}
							stroke={chosen ? SELECTED.noteStroke : 'none'}
							stroke-width={chosen ? SELECTED.noteStrokeWidth : 0}
							filter="url(#{noteShadowId})"
						/>
						<path
							d="M {left + NOTE - noteFold.size} {top + NOTE} L {left + NOTE} {top + NOTE - noteFold.size} L {left + NOTE + 1} {top + NOTE + 1} Z"
							fill={noteFold.fill}
						/>
						<circle cx={box.x} cy={top + 7} r={notePin.r} fill={notePin.fill} />
						<text text-anchor="middle" font-family={noteLabel.fontFamily} font-size={text.size} fill={noteLabel.fill}>
							{#each text.lines as lineText, i (i)}
								<tspan x={box.x} y={box.y + (i - (text.lines.length - 1) / 2) * text.lineHeight + text.size * 0.35}>{lineText}</tspan>
							{/each}
						</text>
					</g>
				{/if}
			{/each}

			<!-- Core Business Events -->
			{#each cm.events as ev (ev.id)}
				{@const d = geometry.events.get(ev.id)}
				{#if d}
					<g
						role="button"
						tabindex="0"
						aria-label="{ev.name}. Drag, or use the arrow keys, to move it."
						class="cursor-grab outline-none"
						onpointerdown={(e) => startDrag(e, ev.id, 'event', d)}
						onkeydown={(e) => nudge(e, ev.id, 'event', d)}
						onfocus={() => (focusId = ev.id)}
						onblur={() => (focusId = null)}
					>
						<polygon
							points="{d.x},{d.y - DIAMOND} {d.x + DIAMOND},{d.y} {d.x},{d.y + DIAMOND} {d.x - DIAMOND},{d.y}"
							fill="{EVENT}12"
							stroke={EVENT}
							stroke-width={isSelected(ev.id) ? SELECTED.diamondStrokeWidth : 1.5}
						/>
						<text x={d.x} y={d.y + DIAMOND + 12} text-anchor="middle" class="text-[10px] font-medium" fill={EVENT}>
							{#each wrap(ev.name, 26) as lineText, i (i)}
								<tspan x={d.x} dy={i === 0 ? 0 : 12}>{lineText}</tspan>
							{/each}
						</text>
					</g>
				{/if}
			{/each}
		</g>
	</svg>
</div>
