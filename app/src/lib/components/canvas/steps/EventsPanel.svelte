<script lang="ts">
	// Step 8 - Surface the Core Business Events: the moments that matter, each
	// said as who-does-what. A diamond rarely floats: it joins Concepts or sits
	// on a Relationship, and some Events are Concepts too (a Sales Order).
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmEvent, CmView } from '$lib/model/graph-view';
	import { addConcept, joinEvent, moveId, patchNode, setOrder, unjoinEvent } from '$lib/model/graph-actions';
	import { relationshipTriple } from '$lib/model/rules';
	import { colorOf } from '$lib/constants/context-types';
	import { CARD, CHOICE_CHIPS, DRAG_REORDER, EMPTY_HINT, INPUT, ROW_ACTIONS, SEARCH_FILTER, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ConceptPicker from '../../ui/ConceptPicker.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import SearchFilter from '../../ui/SearchFilter.svelte';
	import { createReorder } from '../../ui/reorder.svelte';

	let { cm, onDetails }: { cm: CmView; onDetails: (nodeId: string) => void } = $props();

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

	// Bumped after each join so the picker clears for the next one
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
		return null; // already joined, nothing more for the picker to do
	}
</script>

<div class="space-y-3 max-w-4xl">
	<h3 class={TYPE.sectionHeader}>Core Business Events</h3>
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
							<button type="button" class={ROW_ACTIONS.neutral} onclick={() => onDetails(ev.id)}>Details</button>
							<button type="button" class={ROW_ACTIONS.danger} onclick={() => adapter.deleteNode(ev.id)}>Remove</button>
						</div>
					</div>

					<div class="space-y-1">
						<span class={INPUT.label}>Joins</span>
						<div class="flex flex-wrap items-center gap-1.5">
							{#each ev.conceptIds as conceptId (conceptId)}
								<span class="{CHOICE_CHIPS.base} {CHOICE_CHIPS.active} {CHOICE_CHIPS.removable}">
									{nameOf(conceptId)}
									<button type="button" class={CHOICE_CHIPS.removeButton} aria-label="Unjoin {nameOf(conceptId)}" onclick={() => unjoinEvent(adapter, ev, conceptId)}>
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
										label="Join a Concept to {ev.name}"
										placeholder="Join a Concept"
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
