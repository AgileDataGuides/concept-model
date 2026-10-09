<script lang="ts">
	// The Definitions: the second pattern template, one thing at a time.
	// Concepts by Domain with the three parts of each Definition, then every
	// Relationship as its two sentences, then every Core Business Event.
	// A read view: editing stays in Step 5, apart from the Details popup on
	// each Concept and Event, the same one the Steps open. A Definition reads
	// in the same parts, with the same words, as Step 5 and the Details popup.
	//
	// The Steps tab's two columns: a rail on the left, the document on the
	// right. A click on a row jumps the document to that card. Scrolling by
	// hand moves the active row, so the rail always shows where the reader is.
	// The Search Filter on top of the rail finds a Concept by name, and Enter
	// jumps to the first match. A Concept named in a Definition is a link that
	// jumps the same way.
	import { onDestroy, tick } from 'svelte';
	import type { ContextNode } from '$lib/cp-shared';
	import type { CmConcept, CmView } from '$lib/model/graph-view';
	import { relationshipSentences, relationshipTriple } from '$lib/model/rules';
	import { DEFINITION_PARTS, DEFINITION_STATUSES } from '$lib/canon/steps';
	import { partOneText } from '$lib/model/definition';
	import { colorOf } from '$lib/constants/context-types';
	import type { DefinitionStatus } from '$lib/types';
	import { CARD, CARD_LIST_DIVIDER, DEFINITIONS_RAIL, EMPTY_HINT, INPUT, ROW_ACTIONS, SEARCH_FILTER, STEP_PANEL, STEP_RAIL, TYPE } from '$lib/ui/tokens';
	import DetailsPopup from '../ui/DetailsPopup.svelte';
	import LinkedText from '../ui/LinkedText.svelte';
	import SearchFilter from '../ui/SearchFilter.svelte';
	import StateChip from '../ui/StateChip.svelte';

	let { cm, nodes }: { cm: CmView; nodes: ContextNode[] } = $props();

	// Details opens the app's Details popup, as in the Steps
	let detailsId = $state<string | null>(null);
	const detailsNode = $derived(detailsId ? nodes.find((n) => n.id === detailsId) : undefined);

	const TONE = { draft: 'neutral', agreed: 'positive', flagged: 'warning' } as const;
	const statusLabel = (status: DefinitionStatus) => DEFINITION_STATUSES.find((s) => s.id === status)?.label ?? 'Draft';

	const groups = $derived.by(() => {
		const out: { key: string; name: string; concepts: CmConcept[] }[] = cm.domains.map((d) => ({
			key: d.id,
			name: d.name,
			concepts: cm.concepts.filter((c) => c.domainId === d.id)
		}));
		const loose = cm.concepts.filter((c) => !c.domainId || !cm.domainById.has(c.domainId));
		if (loose.length > 0) out.push({ key: 'no-domain', name: cm.domains.length > 0 ? 'No Domain yet' : 'Concepts', concepts: loose });
		return out.filter((g) => g.concepts.length > 0);
	});

	function nameOf(conceptId: string): string {
		return cm.conceptById.get(conceptId)?.name ?? '?';
	}

	function storyNames(concept: CmConcept): string {
		return concept.storyIds.map((id) => cm.storyById.get(id)?.name).filter(Boolean).join(', ');
	}

	// The rail's sections, kept apart from the Concept ids
	const SCOPE = 'section-scope';
	const RELATIONSHIPS = 'section-relationships';
	const EVENTS = 'section-events';

	let search = $state('');
	const query = $derived(search.trim().toLowerCase());

	// While searching, the rail shows only the matching Concepts, and only the groups that have one
	const railGroups = $derived(
		query
			? groups.map((g) => ({ ...g, concepts: g.concepts.filter((c) => c.name.toLowerCase().includes(query)) })).filter((g) => g.concepts.length > 0)
			: groups
	);

	// Every place the rail jumps to, in the document's order
	const targets = $derived([
		...(cm.scope?.statement ? [SCOPE] : []),
		...groups.flatMap((g) => g.concepts.map((c) => c.id)),
		...(cm.relationships.length > 0 ? [RELATIONSHIPS] : []),
		...(cm.events.length > 0 ? [EVENTS] : [])
	]);

	let pane = $state<HTMLElement>();
	let rail = $state<HTMLElement>();
	let searchBox = $state<HTMLElement>();

	// Each card carries data-target, the same as its rail row
	function cardOf(target: string): HTMLElement | null {
		return pane?.querySelector<HTMLElement>(`[data-target="${CSS.escape(target)}"]`) ?? null;
	}

	let readingId = $state('');
	const active = $derived(targets.includes(readingId) ? readingId : targets[0]);

	// The card a jump landed on is ringed until the reader scrolls by hand or jumps elsewhere.
	// The jump's own scroll lands on jumpTop, so it never counts as by hand.
	let jumpedId = $state('');
	let jumpTop = -1;

	function jump(target: string) {
		const card = cardOf(target);
		if (!pane || !card) return;
		readingId = target;
		jumpedId = target;
		pane.scrollTop += card.getBoundingClientRect().top - pane.getBoundingClientRect().top - DEFINITIONS_RAIL.jumpGap;
		jumpTop = pane.scrollTop;
		// A Concept link can mark a row the rail has scrolled past
		keepRowInView(target);
	}

	/** A Concept named in another Definition: jump to its own Definition and move focus there. */
	function openConcept(conceptId: string) {
		jump(conceptId);
		cardOf(conceptId)?.focus({ preventScroll: true });
	}

	function jumpToFirstMatch() {
		const first = railGroups[0]?.concepts[0];
		if (first) jump(first.id);
	}

	let frame = 0;
	onDestroy(() => cancelAnimationFrame(frame));

	// Clearing a search brings back the rows it hid, so show the active one again
	$effect(() => {
		if (!query) tick().then(() => keepRowInView(active));
	});

	function onScroll() {
		if (!pane || pane.scrollTop === jumpTop) return;
		jumpTop = -1;
		jumpedId = '';
		if (!frame) frame = requestAnimationFrame(followReader);
	}

	// The last card above the read line is the one being read. At the end of
	// the document it is the last card, which may never reach the line.
	function followReader() {
		frame = 0;
		if (!pane) return;
		const top = pane.getBoundingClientRect().top;
		const atEnd = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2;
		let current = targets[0];
		if (atEnd) current = targets[targets.length - 1];
		else {
			for (const target of targets) {
				const card = cardOf(target);
				if (!card) continue;
				if (card.getBoundingClientRect().top - top > DEFINITIONS_RAIL.readLine) break;
				current = target;
			}
		}
		if (current && current !== readingId) {
			readingId = current;
			keepRowInView(current);
		}
	}

	// Scroll the rail just enough to show the active row, below the sticky search
	function keepRowInView(target: string) {
		const row = rail?.querySelector<HTMLElement>(`[data-target="${CSS.escape(target)}"]`);
		if (!rail || !row) return;
		const box = rail.getBoundingClientRect();
		const top = box.top + (searchBox?.offsetHeight ?? 0);
		const r = row.getBoundingClientRect();
		if (r.top < top) rail.scrollTop -= top - r.top;
		else if (r.bottom > box.bottom) rail.scrollTop += r.bottom - box.bottom;
	}
</script>

{#snippet sectionRow(target: string, label: string)}
	<button
		type="button"
		data-target={target}
		aria-current={active === target ? 'location' : undefined}
		class="{STEP_RAIL.row} {active === target ? STEP_RAIL.rowActive : STEP_RAIL.rowInactive}"
		onclick={() => jump(target)}
	>
		<span class={active === target ? STEP_RAIL.labelActive : STEP_RAIL.labelInactive}>{label}</span>
	</button>
{/snippet}

<div class="flex h-full min-h-0">
	<nav bind:this={rail} class={STEP_RAIL.container} aria-label="The Definitions">
		<!-- Stays while a search is on, so a list that shrinks below 5 can still be cleared -->
		{#if cm.concepts.length >= SEARCH_FILTER.threshold || search}
			<div bind:this={searchBox} class={DEFINITIONS_RAIL.search}>
				<SearchFilter
					bind:value={search}
					color={colorOf('global_concept')}
					label="Search the Concepts"
					placeholder="Search the Concepts..."
					onEnter={jumpToFirstMatch}
				/>
			</div>
		{/if}
		<ul class="py-2">
			{#if !query && cm.scope?.statement}
				<li>{@render sectionRow(SCOPE, 'Scope')}</li>
			{/if}
			{#if cm.concepts.length === 0}
				<li class={DEFINITIONS_RAIL.hint}><p class={EMPTY_HINT}>No Concepts yet.</p></li>
			{:else if query && railGroups.length === 0}
				<li class={DEFINITIONS_RAIL.hint}><p class={EMPTY_HINT}>No Concept matches.</p></li>
			{/if}
			{#each railGroups as group (group.key)}
				<li>
					<p class="{DEFINITIONS_RAIL.group} {TYPE.sectionHeader}">{group.name}</p>
					<ul>
						{#each group.concepts as concept (concept.id)}
							<li>
								<button
									type="button"
									data-target={concept.id}
									aria-current={active === concept.id ? 'location' : undefined}
									class="{STEP_RAIL.row} {active === concept.id ? STEP_RAIL.rowActive : STEP_RAIL.rowInactive}"
									onclick={() => jump(concept.id)}
								>
									<span class="min-w-0 flex-1 flex items-center justify-between gap-2">
										<span class={active === concept.id ? STEP_RAIL.labelActive : STEP_RAIL.labelInactive}>{concept.name}</span>
										<StateChip tone={TONE[concept.status]} label={statusLabel(concept.status)} />
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
			{#if !query && (cm.relationships.length > 0 || cm.events.length > 0)}
				<li class={STEP_RAIL.divider}>
					{#if cm.relationships.length > 0}{@render sectionRow(RELATIONSHIPS, `Relationships (${cm.relationships.length})`)}{/if}
					{#if cm.events.length > 0}{@render sectionRow(EVENTS, `Core Business Events (${cm.events.length})`)}{/if}
				</li>
			{/if}
		</ul>
	</nav>

	<section bind:this={pane} class="flex-1 min-w-0 overflow-y-auto bg-slate-50" onscroll={onScroll}>
		<div class="max-w-4xl mx-auto p-6 space-y-8">
			{#if cm.scope?.statement}
				<section data-target={SCOPE} class="space-y-1">
					<h2 class={TYPE.sectionHeader}>Scope</h2>
					<p class="text-sm text-slate-700 whitespace-pre-wrap">{cm.scope.statement}</p>
				</section>
			{/if}

			<section class="space-y-4">
				<h2 class={TYPE.sectionHeader}>Concepts ({cm.concepts.length})</h2>
				{#if cm.concepts.length === 0}
					<p class={EMPTY_HINT}>No Concepts yet.</p>
				{/if}
				{#each groups as group (group.key)}
					<div class="space-y-2">
						<h3 class={STEP_PANEL.label}>{group.name}</h3>
						{#each group.concepts as concept (concept.id)}
							{@const partOne = partOneText(concept)}
							<article data-target={concept.id} tabindex="-1" class="{CARD} p-4 space-y-2 outline-none {jumpedId === concept.id ? DEFINITIONS_RAIL.jumped : ''}">
								<header class="flex items-start justify-between gap-3">
									<h4 class="text-sm font-semibold text-slate-800">{concept.name}</h4>
									<div class="flex items-center gap-3 shrink-0">
										<button type="button" class={ROW_ACTIONS.neutral} onclick={() => (detailsId = concept.id)}>Details</button>
										<StateChip tone={TONE[concept.status]} label={statusLabel(concept.status)} />
									</div>
								</header>
								<div>
									<span class={INPUT.label}>{DEFINITION_PARTS.partOne}</span>
									{#if partOne}
										<p class="text-sm text-slate-700 whitespace-pre-wrap"><LinkedText text={partOne} {cm} selfId={concept.id} onOpen={openConcept} /></p>
									{:else}
										<p class={EMPTY_HINT}>{DEFINITION_PARTS.empty}</p>
									{/if}
								</div>
								{#if concept.examples.length > 0}
									<div>
										<span class={INPUT.label}>{DEFINITION_PARTS.partTwo}</span>
										<ul class="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
											{#each concept.examples as example, i (i)}<li><LinkedText text={example} {cm} selfId={concept.id} onOpen={openConcept} /></li>{/each}
										</ul>
									</div>
								{/if}
								{#if concept.specialCases.length > 0}
									<div>
										<span class={INPUT.label}>{DEFINITION_PARTS.partThree}</span>
										<ul class="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
											{#each concept.specialCases as special, i (i)}<li><LinkedText text={special} {cm} selfId={concept.id} onOpen={openConcept} /></li>{/each}
										</ul>
									</div>
								{/if}
								{#if concept.aliases.length > 0 || concept.storyIds.length > 0}
									<p class="text-[11px] text-slate-500">
										{#if concept.aliases.length > 0}Also called {concept.aliases.join(', ')}.{/if}
										{#if concept.storyIds.length > 0}From {storyNames(concept)}.{/if}
									</p>
								{/if}
							</article>
						{/each}
					</div>
				{/each}
			</section>

			{#if cm.relationships.length > 0}
				<section data-target={RELATIONSHIPS} class="space-y-2">
					<h2 class={TYPE.sectionHeader}>Relationships ({cm.relationships.length})</h2>
					<ul class="{CARD} {CARD_LIST_DIVIDER} {jumpedId === RELATIONSHIPS ? DEFINITIONS_RAIL.jumped : ''}">
						{#each cm.relationships as rel (rel.id)}
							{@const s = relationshipSentences({ label: rel.verb, inverseLabel: rel.inverseVerb, rule: rel.rule }, nameOf(rel.sourceId), nameOf(rel.targetId))}
							<li class="px-4 py-2 text-sm text-slate-700">
								<p>{s.forward ?? relationshipTriple(nameOf(rel.sourceId), rel.verb, nameOf(rel.targetId))}</p>
								{#if s.inverse}<p class="text-slate-500">{s.inverse}</p>{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if cm.events.length > 0}
				<section data-target={EVENTS} class="space-y-2">
					<h2 class={TYPE.sectionHeader}>Core Business Events ({cm.events.length})</h2>
					<ul class="{CARD} {CARD_LIST_DIVIDER} {jumpedId === EVENTS ? DEFINITIONS_RAIL.jumped : ''}">
						{#each cm.events as ev (ev.id)}
							<li class="px-4 py-2 text-sm text-slate-700">
								<div class="flex items-start justify-between gap-3">
									<p class="font-medium text-slate-800">{ev.name}</p>
									<button type="button" class="{ROW_ACTIONS.neutral} shrink-0 pt-0.5" onclick={() => (detailsId = ev.id)}>Details</button>
								</div>
								{#if ev.conceptIds.length > 0}
									<p class="text-[11px] text-slate-500">Involves {ev.conceptIds.map(nameOf).join(', ')}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</section>
</div>

{#if detailsNode}
	<DetailsPopup node={detailsNode} {nodes} {cm} onClose={() => (detailsId = null)} />
{/if}
