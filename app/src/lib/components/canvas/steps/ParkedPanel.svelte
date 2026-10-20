<script lang="ts">
	// The parked list: attributes and measurements that wait for the DESIGN
	// stage, things ruled out of scope, questions for a future Map. Each keeps
	// a note on where it came from. With details, only the parked details, in
	// two sections, detailed attributes then measurements: the Parked Details tab.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { park, setModelFields } from '$lib/model/graph-actions';
	import { PARKED_DETAIL_ADD, PARKED_DETAIL_SECTIONS, PARKED_DETAILS_NAME, PARKED_KINDS, PARKED_LIST_NAME, isParkedDetail } from '$lib/canon/steps';
	import type { ParkedItem, ParkedKind } from '$lib/types';
	import { CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, SEARCH_FILTER, STEP_PANEL, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import SearchFilter from '../../ui/SearchFilter.svelte';

	let { cm, details = false }: { cm: CmView; details?: boolean } = $props();

	const title = $derived(details ? PARKED_DETAILS_NAME : PARKED_LIST_NAME);

	/** On the Parked Details tab an item can move between the two sections. */
	const DETAIL_KINDS = PARKED_KINDS.filter((k) => PARKED_DETAIL_SECTIONS.some((s) => s.kind === k.id));

	// Parked Details: one add field for either kind, picked on the line above it and kept for the next one
	type DetailKind = 'attribute' | 'measurement';
	let addKind = $state<DetailKind>('attribute');

	// Show one kind or both, and search the text and where it came from
	let showKind = $state<DetailKind | 'all'>('all');
	const SHOW_OPTIONS = [{ id: 'all' as const, label: PARKED_DETAIL_ADD.all }, ...PARKED_DETAIL_SECTIONS.map((s) => ({ id: s.kind, label: s.heading }))];
	let search = $state('');
	const query = $derived(search.trim().toLowerCase());
	const detailCount = $derived(cm.parked.filter(isParkedDetail).length);
	/** Parked items have no entity colour, so the search takes tokens.md property_only_colour (slate-500). */
	const SEARCH_COLOUR = '#64748b';

	function matches(item: ParkedItem): boolean {
		return !query || item.text.toLowerCase().includes(query) || (item.note ?? '').toLowerCase().includes(query);
	}

	const shownSections = $derived(PARKED_DETAIL_SECTIONS.filter((s) => showKind === 'all' || showKind === s.kind));

	function add(text: string, kind: ParkedKind = 'other') {
		// Adding clears the search and shows the kind just parked, so the new item is in view (DESIGN_SYSTEM.md § 14)
		search = '';
		if (showKind !== 'all' && showKind !== kind) showKind = 'all';
		return park(adapter, cm, { text, kind, note: details ? PARKED_DETAILS_NAME : 'Parked directly' });
	}

	const adapter = getContext<DataAdapter>('dataAdapter');

	function update(id: string, patch: Partial<ParkedItem>) {
		return setModelFields(adapter, cm, { parked: cm.parked.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
	}

	function remove(id: string) {
		return setModelFields(adapter, cm, { parked: cm.parked.filter((p) => p.id !== id) });
	}
</script>

<header class="pb-3 mb-4 border-b border-slate-200 space-y-1">
	<h2 class={STEP_PANEL.question}>{title}</h2>
	{#if details}
		<p class={STEP_PANEL.description}>
			The details parked so far, for the DESIGN stage: detailed attributes, information about a Concept like Customer name, and measurements,
			something counted or measured like Order value.
		</p>
	{:else}
		<p class={STEP_PANEL.description}>
			Things that came up and belong somewhere else: a detailed attribute or a measurement for the DESIGN stage, a boundary drawn on purpose, a question
			for a future Map.
		</p>
	{/if}
</header>

{#snippet itemCard(item: ParkedItem)}
	<li class="{CARD} p-3 space-y-2">
		<div class="flex items-start gap-3">
			<div class="min-w-0 flex-1">
				<EditableText
					value={item.text}
					label="Parked item"
					textClass="text-sm font-semibold text-slate-800"
					onSave={(text) => text && update(item.id, { text })}
				/>
			</div>
			<button type="button" class="{ROW_ACTIONS.danger} shrink-0 pt-0.5" onclick={() => remove(item.id)}>Remove</button>
		</div>
		<ChoiceChips
			options={details ? DETAIL_KINDS : PARKED_KINDS}
			value={item.kind}
			label="Kind of parked item"
			onChange={(kind) => kind && update(item.id, { kind })}
		/>
		<EditableText
			value={item.note ?? ''}
			label="Where it came from"
			placeholder="Where it came from"
			textClass="text-xs text-slate-500"
			onSave={(note) => update(item.id, { note: note || undefined })}
		/>
	</li>
{/snippet}

{#if details}
	<div class="space-y-6 max-w-3xl">
		<div>
			<AddField placeholder={PARKED_DETAIL_ADD.placeholder} buttonLabel="Park" onAdd={(text) => add(text, addKind)}>
				<div>
					<span class={INPUT.label}>{PARKED_DETAIL_ADD.parkAs}</span>
					<ChoiceChips options={DETAIL_KINDS} value={addKind} label="Park the next one as" onChange={(kind) => kind && (addKind = kind as DetailKind)} />
				</div>
			</AddField>
		</div>

		<div class="space-y-1">
			<span class={INPUT.label}>{PARKED_DETAIL_ADD.show}</span>
			<ChoiceChips options={SHOW_OPTIONS} value={showKind} label="Which parked details to show" onChange={(kind) => kind && (showKind = kind)} />
			<!-- Stays while a search is on, so a list that shrinks below 5 can still be cleared -->
			{#if detailCount >= SEARCH_FILTER.threshold || search}
				<SearchFilter bind:value={search} color={SEARCH_COLOUR} label={PARKED_DETAIL_ADD.searchLabel} />
			{/if}
		</div>

		{#each shownSections as section (section.kind)}
			{@const all = cm.parked.filter((p) => p.kind === section.kind)}
			{@const items = all.filter(matches)}
			<section class="space-y-3">
				<h3 class={TYPE.sectionHeader}>{section.heading} ({query ? `${items.length} of ${all.length}` : all.length})</h3>
				{#if all.length === 0}
					<p class={EMPTY_HINT}>{section.empty}</p>
				{:else if items.length === 0}
					<p class={EMPTY_HINT}>{PARKED_DETAIL_ADD.noMatch}</p>
				{:else}
					<ul class="space-y-2">
						{#each items as item (item.id)}
							{@render itemCard(item)}
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
{:else}
	<div class="space-y-3 max-w-3xl">
		<h3 class={TYPE.sectionHeader}>{title} ({cm.parked.length})</h3>
		<AddField placeholder="Park something, press Enter" buttonLabel="Park" onAdd={(text) => add(text)} />
		{#if cm.parked.length === 0}
			<p class={EMPTY_HINT}>Nothing parked yet.</p>
		{:else}
			<ul class="space-y-2">
				{#each cm.parked as item (item.id)}
					{@render itemCard(item)}
				{/each}
			</ul>
		{/if}
	</div>
{/if}
