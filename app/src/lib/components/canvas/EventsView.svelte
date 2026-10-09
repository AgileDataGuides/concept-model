<script lang="ts">
	// The Core Business Events tab: the moments that matter, each said as
	// who-does-what. A diamond rarely floats: it involves Concepts or sits on a
	// Relationship, and some Events are Concepts too (a Sales Order). The
	// canon's Step 8, moved to a tab of its own beside the Business Event Matrix.
	import { getContext } from 'svelte';
	import type { ContextNode, DataAdapter } from '$lib/cp-shared';
	import type { CmEvent, CmView } from '$lib/model/graph-view';
	import { addConcept, joinEvent, moveId, patchNode, setOrder, unjoinEvent } from '$lib/model/graph-actions';
	import { relationshipTriple } from '$lib/model/rules';
	import { eventStatus } from '$lib/model/status';
	import { CORE_BUSINESS_EVENTS } from '$lib/canon/steps';
	import { colorOf } from '$lib/constants/context-types';
	import { CARD, CHOICE_CHIPS, DRAG_REORDER, EMPTY_HINT, INPUT, ROW_ACTIONS, SEARCH_FILTER, STEP_PANEL, TYPE } from '$lib/ui/tokens';
	import AddField from '../ui/AddField.svelte';
	import ConceptPicker from '../ui/ConceptPicker.svelte';
	import DetailsPopup from '../ui/DetailsPopup.svelte';
	import EditableText from '../ui/EditableText.svelte';
	import QuietHint from '../ui/QuietHint.svelte';
	import SearchFilter from '../ui/SearchFilter.svelte';
	import { createReorder } from '../ui/reorder.svelte';

	let { cm, nodes }: { cm: CmView; nodes: ContextNode[] } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	let search = $state('');
	const query = $derived(search.trim().toLowerCase());
	const shownEvents = $derived(query ? cm.events.filter((ev) => ev.name.toLowerCase().includes(query)) : cm.events);

	// Drag an Event by its grip to change the order the lists use
	const reorder = createReorder((dragId, targetId, position) =>
		setOrder(adapter, cm.events, moveId(cm.events.map((ev) => ev.id), dragId, targetId, position))
	);

	// Adding clears the search, so the new Event is in view
	function addEvent(name: string) {
		search = '';
		return adapter.createNode({ label: 'global_core_business_event', name });
	}

	// Bumped after each add so the picker clears for the next one
	let pickerKey = $state(0);

	function nameOf(conceptId: string): string {
		return cm.conceptById.get(conceptId)?.name ?? '?';
	}

	async function join(ev: CmEvent, conceptId: string | null) {
		if (!conceptId) return;
		await joinEvent(adapter, ev.id, conceptId);
		pickerKey++;
	}

	async function createAndJoin(ev: CmEvent, name: string): Promise<string | null> {
		const node = await addConcept(adapter, name);
		await joinEvent(adapter, ev.id, node.id);
		pickerKey++;
		return null; // already added, nothing more for the picker to do
	}

	const hints = $derived(eventStatus(cm).hints);

	// Details opens the app's Details popup, the same editor the Steps open
	let detailsId = $state<string | null>(null);
	const detailsNode = $derived(detailsId ? nodes.find((n) => n.id === detailsId) : undefined);
</script>

<div class="h-full overflow-y-auto bg-slate-50 {STEP_PANEL.body}">
	<header class="pb-3 mb-4 border-b border-slate-200 space-y-1">
		<p class={STEP_PANEL.label}>{CORE_BUSINESS_EVENTS.name}</p>
		<h2 class={STEP_PANEL.question}>{CORE_BUSINESS_EVENTS.question}</h2>
		<p class={STEP_PANEL.description}>{CORE_BUSINESS_EVENTS.description}</p>
	</header>

	{#if hints.length > 0}
		<div class="space-y-1 mb-4">
			{#each hints as hint, i (i)}
				<QuietHint text={hint} />
			{/each}
		</div>
	{/if}

	<div class="space-y-3 max-w-4xl">
		<h3 class={TYPE.sectionHeader}>{CORE_BUSINESS_EVENTS.name} ({cm.events.length})</h3>
		<AddField placeholder="Add an Event as who-does-what, like Customer places a Sales Order" onAdd={addEvent} />
		<!-- Stays while a search is on, so a list that shrinks below 5 can still be cleared -->
		{#if cm.events.length >= SEARCH_FILTER.threshold || search}
			<SearchFilter bind:value={search} color={colorOf('global_core_business_event')} label="Search the Events" />
		{/if}
		{#if cm.events.length === 0}
			<p class={EMPTY_HINT}>No Events yet. Listen for the happenings that create something the organisation counts.</p>
		{:else if shownEvents.length === 0}
			<p class={EMPTY_HINT}>No Event matches.</p>
		{:else}
			<ul class="space-y-2">
				{#each shownEvents as ev (ev.id)}
					<li class="{CARD} p-3 space-y-2 {reorder.rowClass(ev.id)}" ondragover={(e) => reorder.over(e, ev.id)} ondrop={reorder.drop}>
						<div class="flex items-start gap-3">
							{#if shownEvents.length > 1}
								<span
									class={DRAG_REORDER.grip}
									draggable="true"
									role="img"
									aria-label="Drag to reorder"
									ondragstart={(e) => reorder.start(e, ev.id)}
									ondragend={reorder.end}>⠿</span
								>
							{/if}
							<div class="min-w-0 flex-1">
								<EditableText
									value={ev.name}
									label="Who-does-what sentence"
									textClass="text-sm font-semibold text-slate-800"
									onSave={(name) => name && patchNode(adapter, ev.node, {}, { name })}
								/>
							</div>
							<div class="flex items-center gap-3 shrink-0 pt-0.5">
								<button type="button" class={ROW_ACTIONS.neutral} onclick={() => (detailsId = ev.id)}>Details</button>
								<button type="button" class={ROW_ACTIONS.danger} onclick={() => adapter.deleteNode(ev.id)}>Remove</button>
							</div>
						</div>

						<div class="space-y-1">
							<span class={INPUT.label}>Involves</span>
							<div class="flex flex-wrap items-center gap-1.5">
								{#each ev.conceptIds as conceptId (conceptId)}
									<span class="{CHOICE_CHIPS.base} {CHOICE_CHIPS.active} {CHOICE_CHIPS.removable}">
										{nameOf(conceptId)}
										<button type="button" class={CHOICE_CHIPS.removeButton} aria-label="Remove {nameOf(conceptId)} from {ev.name}" onclick={() => unjoinEvent(adapter, ev, conceptId)}>
											<svg class={CHOICE_CHIPS.removeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/each}
								<div class="w-56">
									{#key pickerKey}
										<ConceptPicker
											concepts={cm.concepts}
											label="Add a Concept that {ev.name} involves"
											placeholder="Add a Concept"
											exclude={ev.conceptIds}
											onPick={(id) => join(ev, id)}
											onCreate={(name) => createAndJoin(ev, name)}
										/>
									{/key}
								</div>
							</div>
						</div>

						<div class="flex flex-wrap gap-4">
							<label class="w-72">
								<span class={INPUT.label}>Sits on the Relationship</span>
								<select
									class={INPUT.select}
									value={ev.relationshipId ?? ''}
									onchange={(e) => patchNode(adapter, ev.node, { relationshipId: e.currentTarget.value || undefined })}
								>
									<option value="">None</option>
									{#each cm.relationships as rel (rel.id)}
										<option value={rel.id}>{relationshipTriple(nameOf(rel.sourceId), rel.verb, nameOf(rel.targetId))}</option>
									{/each}
								</select>
							</label>
							<label class="w-56">
								<span class={INPUT.label}>Is also the Concept</span>
								<select
									class={INPUT.select}
									value={ev.conceptId ?? ''}
									onchange={(e) => patchNode(adapter, ev.node, { conceptId: e.currentTarget.value || undefined })}
								>
									<option value="">None</option>
									{#each cm.concepts as concept (concept.id)}
										<option value={concept.id}>{concept.name}</option>
									{/each}
								</select>
							</label>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

{#if detailsNode}
	<DetailsPopup node={detailsNode} {nodes} {cm} onClose={() => (detailsId = null)} />
{/if}
