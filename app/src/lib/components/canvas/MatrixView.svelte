<script lang="ts">
	// The Event Matrix: the Model's Core Business Events and Concepts as a
	// Business Event Matrix, with the features and the words of the standalone
	// BEM app. Every edit writes to the Model's own objects through the
	// DataAdapter, the same writes the Steps make, so the Steps, the Map and the
	// Definitions change with it (DESIGN_SYSTEM.md § 18).
	//   - A cell cycles empty, ✓ (the Event involves the Concept: the
	//     event_involves_concept link Step 8 writes), ✭ (the Event is also that
	//     Concept: Step 8's "Is also the Concept", one per Event), empty.
	//   - Add an Event, a Concept or a Domain. One click on a name opens the
	//     Details editor. Drag rows, columns and Domain bands to reorder.
	//   - Search, Hide unmarked, collapse a band, group by Domain or 7W's.
	import { getContext } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ContextNode, DataAdapter } from '$lib/cp-shared';
	import type { CmConcept, CmDomain, CmEvent, CmView } from '$lib/model/graph-view';
	import { addConcept, joinEvent, moveId, patchNode, setOrder, unjoinEvent } from '$lib/model/graph-actions';
	import { isAttached, nameList, stepStatus } from '$lib/model/status';
	import { HINTS, NO_SEVEN_W_LABEL, SEVEN_WS, sevenWLabel } from '$lib/canon/steps';
	import { colorOf } from '$lib/constants/context-types';
	import type { W } from '$lib/types';
	import { DRAG_REORDER, EMPTY_HINT, EVENT_MATRIX, INPUT, TOGGLE_SWITCH } from '$lib/ui/tokens';
	import AddField from '../ui/AddField.svelte';
	import DetailsPopup from '../ui/DetailsPopup.svelte';
	import ChoiceChips from '../ui/ChoiceChips.svelte';
	import QuietHint from '../ui/QuietHint.svelte';
	import SearchFilter from '../ui/SearchFilter.svelte';
	import ToggleSwitch from '../ui/ToggleSwitch.svelte';
	import { createReorder } from '../ui/reorder.svelte';

	let { cm, nodes }: { cm: CmView; nodes: ContextNode[] } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	// The 7W's, in the BEM's order, from the canon file
	const WS: W[] = SEVEN_WS.map((s) => s.id);

	// ── Group by Domain or 7W's: a view choice, remembered in this browser ──

	type GroupBy = 'domain' | 'w';
	const GROUP_KEY = 'cm-matrix-group-by';
	const GROUP_OPTIONS: { id: GroupBy; label: string; title: string }[] = [
		{ id: 'domain', label: 'Domain', title: 'A band for each Domain, in the Step 1 order' },
		{ id: 'w', label: "7W's", title: 'A band for each of Who, What, When, Where, Why, How and How Many, as in the Business Event Matrix app' }
	];

	function rememberedGroupBy(): GroupBy {
		try {
			return localStorage.getItem(GROUP_KEY) === 'w' ? 'w' : 'domain';
		} catch {
			return 'domain';
		}
	}

	let groupBy = $state<GroupBy>(rememberedGroupBy());
	const collapsed = new SvelteSet<string>();

	function setGroupBy(next: GroupBy) {
		groupBy = next;
		collapsed.clear();
		try {
			localStorage.setItem(GROUP_KEY, next);
		} catch {
			// no storage: the choice lasts until reload
		}
	}

	function toggleBand(key: string) {
		if (collapsed.has(key)) collapsed.delete(key);
		else collapsed.add(key);
	}

	// ── Marks: empty, ✓ involves, ✭ is also the Concept ──

	type Mark = '' | 'check' | 'star';
	const MARK_WORDS: Record<Mark, string> = { '': 'not marked', check: 'involves', star: 'is also this Concept' };

	function markOf(ev: CmEvent, conceptId: string): Mark {
		if (ev.conceptId === conceptId) return 'star';
		return ev.conceptIds.includes(conceptId) ? 'check' : '';
	}

	/** Every Concept the Event marks: the ones it involves, and the one it is also. */
	function marksOf(ev: CmEvent): string[] {
		const star = ev.conceptId && cm.conceptById.has(ev.conceptId) && !ev.conceptIds.includes(ev.conceptId) ? [ev.conceptId] : [];
		return [...ev.conceptIds, ...star];
	}

	/** How many Events mark the Concept, for the Event Count row. */
	function eventCount(conceptId: string): number {
		return cm.events.filter((ev) => markOf(ev, conceptId) !== '').length;
	}

	// One write per cell at a time, so a click while a slow write is in flight
	// cannot send a second one. A guard, never drawn, so a plain Set.
	const pending = new Set<string>();

	async function cycle(ev: CmEvent, conceptId: string) {
		const key = `${ev.id}|${conceptId}`;
		if (pending.has(key)) return;
		pending.add(key);
		try {
			const mark = markOf(ev, conceptId);
			if (mark === '') await joinEvent(adapter, ev.id, conceptId);
			// One ✭ per Event: a ✭ on a second Concept moves it there, and the first
			// keeps its ✓ when the Event involves it
			else if (mark === 'check') await patchNode(adapter, ev.node, { conceptId });
			else {
				await patchNode(adapter, ev.node, { conceptId: undefined });
				if (ev.conceptIds.includes(conceptId)) await unjoinEvent(adapter, ev, conceptId);
			}
		} finally {
			pending.delete(key);
		}
	}

	// ── Search and Hide unmarked, as in the BEM ──

	let eventSearch = $state('');
	let domainSearch = $state('');
	let conceptSearch = $state('');
	let hideUnmarked = $state(false);

	const eventQuery = $derived(eventSearch.trim().toLowerCase());
	const domainQuery = $derived(domainSearch.trim().toLowerCase());
	const conceptQuery = $derived(conceptSearch.trim().toLowerCase());

	function domainOf(c: CmConcept): CmDomain | undefined {
		return c.domainId ? cm.domainById.get(c.domainId) : undefined;
	}

	const searchedEvents = $derived(eventQuery ? cm.events.filter((ev) => ev.name.toLowerCase().includes(eventQuery)) : cm.events);
	const searchedConcepts = $derived(
		cm.concepts.filter(
			(c) =>
				(!conceptQuery || c.name.toLowerCase().includes(conceptQuery)) &&
				(!domainQuery || (domainOf(c)?.name ?? '').toLowerCase().includes(domainQuery))
		)
	);

	// Hide unmarked: an Event stays when it marks a Concept on screen (any
	// Concept while no Concept or Domain search is on), then a Concept stays
	// when one of those Events marks it
	const markedEvents = $derived.by(() => {
		const onScreen = searchedConcepts.map((c) => c.id);
		const axisSearch = !!conceptQuery || !!domainQuery;
		return searchedEvents.filter((ev) => marksOf(ev).some((id) => !axisSearch || onScreen.includes(id)));
	});
	const shownEvents = $derived(hideUnmarked ? markedEvents : searchedEvents);
	const shownConcepts = $derived(
		hideUnmarked ? searchedConcepts.filter((c) => markedEvents.some((ev) => markOf(ev, c.id) !== '')) : searchedConcepts
	);

	// ── Bands: Domains in the Step 1 order, or the 7W's, each over its Concepts in the Step 4 order ──

	interface Band {
		key: string;
		name: string;
		/** A Domain band is that Domain: its name opens it, its grip reorders the Domains. */
		domain?: CmDomain;
		w?: W;
		concepts: CmConcept[];
	}

	const bands = $derived.by((): Band[] => {
		const shown = (list: CmConcept[]) => list.filter((c) => shownConcepts.includes(c));
		const all: Band[] =
			groupBy === 'w'
				? [
						...WS.map((w) => ({ key: `w:${w}`, name: sevenWLabel(w), w, concepts: shown(cm.concepts.filter((c) => c.w === w)) })),
						{ key: 'w:none', name: NO_SEVEN_W_LABEL, concepts: shown(cm.concepts.filter((c) => !c.w || !WS.includes(c.w))) }
					]
				: [
						...cm.domains.map((d) => ({ key: d.id, name: d.name, domain: d, concepts: shown(cm.concepts.filter((c) => c.domainId === d.id)) })),
						{ key: 'no-domain', name: 'No Domain yet', concepts: shown(cm.concepts.filter((c) => !c.domainId || !cm.domainById.has(c.domainId))) }
					];
		return all.filter((b) => b.concepts.length > 0);
	});

	function bandClass(band: Band): string {
		if (band.domain) return EVENT_MATRIX.bandDomain;
		return band.w ? EVENT_MATRIX.wBands[band.w].band : EVENT_MATRIX.bandNoDomain;
	}

	function headerClass(band: Band): string {
		if (band.domain) return EVENT_MATRIX.conceptHeaderDomain;
		return band.w ? EVENT_MATRIX.wBands[band.w].header : EVENT_MATRIX.conceptHeaderNoDomain;
	}

	const emptyDomains = $derived(cm.domains.filter((d) => !cm.concepts.some((c) => c.domainId === d.id)));

	// ── Drag to reorder, writing the order the Steps use ──

	const eventReorder = createReorder((dragId, targetId, position) =>
		setOrder(adapter, cm.events, moveId(cm.events.map((ev) => ev.id), dragId, targetId, position))
	);

	/** The Domain band a Concept sits in. */
	function domainKeyOf(conceptId: string): string {
		const c = cm.conceptById.get(conceptId);
		return c?.domainId && cm.domainById.has(c.domainId) ? c.domainId : 'no-domain';
	}

	// Concept columns drag only when grouped by Domain, and only within their
	// own Domain. There is one Concept order, the one Step 4 shows by Domain, so
	// a drag between 7W bands would reshuffle it out of sight, and a drop into
	// another Domain would look like a change of Domain.
	const conceptReorder = createReorder(
		(dragId, targetId, position) => setOrder(adapter, cm.concepts, moveId(cm.concepts.map((c) => c.id), dragId, targetId, position)),
		(dragId, targetId) => groupBy === 'domain' && domainKeyOf(dragId) === domainKeyOf(targetId),
		'x'
	);

	const domainReorder = createReorder(
		(dragId, targetId, position) => setOrder(adapter, cm.domains, moveId(cm.domains.map((d) => d.id), dragId, targetId, position)),
		() => true,
		'x'
	);

	// ── Add, the way the Steps add ──

	let chosenDomainId = $state('');
	let chosenW = $state<W | ''>('');
	const intoDomainId = $derived(cm.domainById.has(chosenDomainId) ? chosenDomainId : '');

	/** A new Event or Concept lands in view: the searches clear and Hide unmarked turns off. */
	function showAll() {
		eventSearch = '';
		domainSearch = '';
		conceptSearch = '';
		hideUnmarked = false;
	}

	function addEvent(name: string) {
		showAll();
		return adapter.createNode({ label: 'global_core_business_event', name });
	}

	async function addNewConcept(name: string) {
		showAll();
		const node = await addConcept(adapter, name, { domainId: intoDomainId || undefined });
		if (chosenW) await patchNode(adapter, node, { w: chosenW });
	}

	function addDomain(name: string) {
		return adapter.createNode({ label: 'global_domain', name });
	}

	// ── One click on a name opens the Details popup, the same one the Steps open ──

	let detailsId = $state<string | null>(null);
	const detailsNode = $derived(detailsId ? nodes.find((n) => n.id === detailsId) : undefined);

	// ── A hover card on a Concept's column or a Domain's band, read only ──

	interface Card {
		x: number;
		y: number;
		title: string;
		lines: { label: string; text: string }[];
	}

	let card = $state<Card | null>(null);
	const CARD_WIDTH = 240;

	function showCard(e: MouseEvent, title: string, lines: { label: string; text: string }[]) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = Math.max(8, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, window.innerWidth - CARD_WIDTH - 8));
		card = { x, y: r.bottom + 4, title, lines: lines.filter((l) => l.text) };
	}

	/** Part one of the Definition, or the Aristotelian helper when that is all there is. */
	function definitionOf(c: CmConcept): string {
		if (c.description) return c.description;
		if (!c.definitionCategory && !c.definitionDifferentiator) return 'No Definition yet.';
		const differentiator = (c.definitionDifferentiator || '...').replace(/@\{([^}]+)\}/g, '$1');
		return `A ${c.definitionCategory || '...'} that ${differentiator}`;
	}

	function conceptLines(c: CmConcept) {
		return [
			{ label: 'Definition', text: definitionOf(c) },
			{ label: 'Also called', text: c.aliases.join(', ') },
			{ label: 'Domain', text: domainOf(c)?.name ?? '' },
			{ label: '7W', text: c.w ? sevenWLabel(c.w) : '' },
			{ label: 'Notes', text: c.notes ?? '' }
		];
	}

	function domainLines(d: CmDomain) {
		const p = d.node.properties ?? {};
		return [
			{ label: 'Description', text: d.description || 'No description yet.' },
			{ label: 'Owner', text: typeof p.owner === 'string' ? p.owner : '' },
			{ label: 'Also called', text: Array.isArray(p.aliases) ? p.aliases.join(', ') : '' },
			{ label: 'Concepts', text: String(cm.concepts.filter((c) => c.domainId === d.id).length) },
			{ label: 'Notes', text: typeof p.notes === 'string' ? p.notes : '' }
		];
	}

	// ── Hints and empty states ──

	// The Step 8 hint, so a floating Event reads the same here as in the Steps
	const hints = $derived(stepStatus(cm, 'events').hints);

	const emptyLine = $derived(
		cm.concepts.length === 0
			? cm.events.length === 0
				? 'Nothing in the Event Matrix yet. Add a Concept and a Core Business Event above, or in Steps 4 and 8.'
				: 'No Concepts yet. Add one above, or in Step 4, then mark the ones each Event involves.'
			: bands.length === 0
				? hideUnmarked
					? 'No Concept on screen is marked by an Event on screen.'
					: 'No Concept matches the search.'
				: ''
	);

	const noRowsLine = $derived(
		cm.events.length === 0
			? 'No Core Business Events yet. Add one above, or in Step 8.'
			: shownEvents.length === 0
				? hideUnmarked
					? 'No Event on screen marks a Concept on screen.'
					: 'No Event matches the search.'
				: ''
	);
</script>

<div class="h-full overflow-auto bg-slate-50">
	<div class="p-6 space-y-3">
		<p class={INPUT.label}>
			Each row is a Core Business Event and each column a Concept, under its band. Click a cell to mark it: ✓ the Event involves the
			Concept, ✭ the Event is also that Concept, then clear. Click a name to edit it, and drag ⠿ to reorder.
		</p>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
			<div>
				<span class={INPUT.label}>Add a Core Business Event</span>
				<AddField placeholder="Who does what, like Customer places a Sales Order" onAdd={addEvent} />
			</div>
			<div>
				<span class={INPUT.label}>Add a Concept</span>
				<div class="flex gap-2 mb-2">
					{#if cm.domains.length > 0}
						<select
							class={INPUT.select}
							aria-label="Domain for the new Concept"
							value={intoDomainId}
							onchange={(e) => (chosenDomainId = e.currentTarget.value)}
						>
							<option value="">No Domain</option>
							{#each cm.domains as d (d.id)}
								<option value={d.id}>{d.name}</option>
							{/each}
						</select>
					{/if}
					<select
						class={INPUT.select}
						aria-label="7W for the new Concept"
						value={chosenW}
						onchange={(e) => (chosenW = e.currentTarget.value as W | '')}
					>
						<option value="">{NO_SEVEN_W_LABEL}</option>
						{#each SEVEN_WS as s (s.id)}
							<option value={s.id}>{s.label}</option>
						{/each}
					</select>
				</div>
				<AddField placeholder="A noun, like Customer" onAdd={addNewConcept} />
			</div>
			<div>
				<span class={INPUT.label}>Add a Domain</span>
				<AddField placeholder="An area of the organisation, like Finance" onAdd={addDomain} />
				{#if groupBy === 'domain' && emptyDomains.length > 0}
					<p class="{INPUT.label} mt-1">
						No Concepts yet in {nameList(emptyDomains.map((d) => d.name))}, so no band. Add a Concept into a Domain to show it.
					</p>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="w-52">
				<SearchFilter bind:value={eventSearch} color={colorOf('global_core_business_event')} label="Search the Events" placeholder="Search Events..." />
			</div>
			<div class="w-52">
				<SearchFilter bind:value={domainSearch} color={colorOf('global_domain')} label="Search the Domains" placeholder="Search Domains..." />
			</div>
			<div class="w-52">
				<SearchFilter bind:value={conceptSearch} color={colorOf('global_concept')} label="Search the Concepts" placeholder="Search Concepts..." />
			</div>
			<div class="flex items-center gap-3 ml-auto">
				<span class={TOGGLE_SWITCH.label}>Group by</span>
				<ChoiceChips options={GROUP_OPTIONS} value={groupBy} label="Group the Concepts by" onChange={(v) => v && setGroupBy(v)} />
				<ToggleSwitch
					checked={hideUnmarked}
					label="Hide unmarked"
					title="Hide the Events with no mark among the Concepts on screen, then the Concepts no remaining Event marks. Works with the searches."
					onChange={(v) => (hideUnmarked = v)}
				/>
			</div>
		</div>

		{#each hints as hint, i (i)}
			<QuietHint text={hint} />
		{/each}

		{#if emptyLine}
			<p class={EMPTY_HINT}>{emptyLine}</p>
		{:else}
			<div class={EVENT_MATRIX.wrapper}>
				<table class={EVENT_MATRIX.table}>
					<thead>
						<tr>
							<th rowspan="2" scope="col" class={EVENT_MATRIX.cornerHeader}>Core Business Events</th>
							<th rowspan="2" scope="col" class={EVENT_MATRIX.countHeader} title="How many Concepts each Event marks">Concepts</th>
							{#each bands as band (band.key)}
								{@const domain = band.domain}
								{#if collapsed.has(band.key)}
									<th rowspan="2" scope="colgroup" class="{EVENT_MATRIX.bandCollapsed} {bandClass(band)}">
										<button type="button" title="Open {band.name}" onclick={() => toggleBand(band.key)}>▸ {band.name} ({band.concepts.length})</button>
									</th>
								{:else}
									<th
										colspan={band.concepts.length}
										scope="colgroup"
										class="{EVENT_MATRIX.band} {bandClass(band)} {domain ? domainReorder.rowClass(domain.id) : ''}"
										ondragover={domain ? (e) => domainReorder.over(e, domain.id) : undefined}
										ondrop={domain ? domainReorder.drop : undefined}
										onmouseenter={domain ? (e) => showCard(e, domain.name, domainLines(domain)) : undefined}
										onmouseleave={() => (card = null)}
									>
										{#if domain && cm.domains.length > 1}
											<span
												class={EVENT_MATRIX.columnGrip}
												draggable="true"
												role="img"
												aria-label="Drag to reorder the Domains"
												ondragstart={(e) => domainReorder.start(e, domain.id)}
												ondragend={domainReorder.end}>⠿</span
											>
										{/if}
										{#if domain}
											<button type="button" class={EVENT_MATRIX.nameButton} onclick={() => (detailsId = domain.id)}>{band.name}</button>
										{:else}
											{band.name}
										{/if}
										<button
											type="button"
											class={EVENT_MATRIX.bandToggle}
											aria-label="Collapse {band.name}"
											title="Collapse {band.name}"
											onclick={() => toggleBand(band.key)}>◂</button
										>
									</th>
								{/if}
							{/each}
						</tr>
						<tr>
							{#each bands as band (band.key)}
								{#if !collapsed.has(band.key)}
									{#each band.concepts as concept (concept.id)}
										<th
											scope="col"
											class="{EVENT_MATRIX.conceptHeader} {headerClass(band)} {conceptReorder.rowClass(concept.id)}"
											ondragover={(e) => conceptReorder.over(e, concept.id)}
											ondrop={conceptReorder.drop}
											onmouseenter={(e) => showCard(e, concept.name, conceptLines(concept))}
											onmouseleave={() => (card = null)}
										>
											{#if groupBy === 'domain' && band.concepts.length > 1}
												<span
													class={EVENT_MATRIX.columnGrip}
													draggable="true"
													role="img"
													aria-label="Drag to reorder"
													ondragstart={(e) => conceptReorder.start(e, concept.id)}
													ondragend={conceptReorder.end}>⠿</span
												>
											{/if}
											<button type="button" class={EVENT_MATRIX.nameButton} onclick={() => (detailsId = concept.id)}>{concept.name}</button>
										</th>
									{/each}
								{/if}
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each shownEvents as ev (ev.id)}
							{@const attached = isAttached(cm, ev.id)}
							<tr
								class="{EVENT_MATRIX.row} {eventReorder.rowClass(ev.id)}"
								ondragover={(e) => eventReorder.over(e, ev.id)}
								ondrop={eventReorder.drop}
							>
								<th scope="row" class={EVENT_MATRIX.eventCell}>
									<div class="flex items-center gap-1">
										<span class={EVENT_MATRIX.rowNumber}>{cm.events.indexOf(ev) + 1}</span>
										{#if shownEvents.length > 1}
											<span
												class={DRAG_REORDER.grip}
												draggable="true"
												role="img"
												aria-label="Drag to reorder"
												ondragstart={(e) => eventReorder.start(e, ev.id)}
												ondragend={eventReorder.end}>⠿</span
											>
										{/if}
										<button type="button" class={EVENT_MATRIX.nameButton} onclick={() => (detailsId = ev.id)}>{ev.name}</button>
									</div>
								</th>
								<td
									class="{EVENT_MATRIX.countCell} {attached ? EVENT_MATRIX.countOk : EVENT_MATRIX.countWarning}"
									title={attached ? undefined : HINTS.unattachedEvents(ev.name)}>{marksOf(ev).length}</td
								>
								{#each bands as band (band.key)}
									{#if collapsed.has(band.key)}
										<td class={EVENT_MATRIX.collapsedCell}></td>
									{:else}
										{#each band.concepts as concept (concept.id)}
											{@const mark = markOf(ev, concept.id)}
											<td class={EVENT_MATRIX.markCell}>
												<button
													type="button"
													class={EVENT_MATRIX.markButton}
													aria-label="{ev.name}, {concept.name}: {MARK_WORDS[mark]}"
													onclick={() => cycle(ev, concept.id)}
												>
													{#if mark === 'check'}
														<span class={EVENT_MATRIX.check} aria-hidden="true">&#10003;</span>
													{:else if mark === 'star'}
														<span class={EVENT_MATRIX.star} aria-hidden="true">&#10029;</span>
													{/if}
												</button>
											</td>
										{/each}
									{/if}
								{/each}
							</tr>
						{/each}
						<tr class={EVENT_MATRIX.summaryRow}>
							<th scope="row" class={EVENT_MATRIX.summaryLabel}>Event Count</th>
							<td class={EVENT_MATRIX.summaryCell}></td>
							{#each bands as band (band.key)}
								{#if collapsed.has(band.key)}
									<td class={EVENT_MATRIX.collapsedCell}></td>
								{:else}
									{#each band.concepts as concept (concept.id)}
										<td class={EVENT_MATRIX.summaryCell}>{eventCount(concept.id) || ''}</td>
									{/each}
								{/if}
							{/each}
						</tr>
					</tbody>
				</table>
			</div>
			{#if noRowsLine}
				<p class={EMPTY_HINT}>{noRowsLine}</p>
			{/if}
		{/if}
	</div>
</div>

{#if card}
	<div class={EVENT_MATRIX.hoverCard} style="left: {card.x}px; top: {card.y}px;" role="tooltip">
		<p class={EVENT_MATRIX.hoverCardTitle}>{card.title}</p>
		{#each card.lines as line (line.label)}
			<p><span class={EVENT_MATRIX.hoverCardLabel}>{line.label}</span> {line.text}</p>
		{/each}
	</div>
{/if}

{#if detailsNode}
	<DetailsPopup node={detailsNode} {nodes} {cm} onClose={() => (detailsId = null)} />
{/if}
