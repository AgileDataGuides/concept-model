<script lang="ts">
	// Step 4 - Identify the Concepts: read a story, add its nouns. A new Concept
	// links to the story on screen and goes into the chosen Domain. Information
	// about a Concept ("Customer name") is parked, not added.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmConcept, CmView } from '$lib/model/graph-view';
	import { addConcept, conceptIsReferenced, moveId, park, patchNode, placeConcept, setOrder } from '$lib/model/graph-actions';
	import { colorOf } from '$lib/constants/context-types';
	import { CARD, DRAG_REORDER, EMPTY_HINT, INPUT, ROW_ACTIONS, SEARCH_FILTER, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import MultiChoiceChips from '../../ui/MultiChoiceChips.svelte';
	import SearchFilter from '../../ui/SearchFilter.svelte';
	import { createReorder } from '../../ui/reorder.svelte';

	let { cm, onDetails }: { cm: CmView; onDetails: (nodeId: string) => void } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	let chosenStoryId = $state('');
	let chosenDomainId = $state('');

	// Fall back to the first story, and drop a Domain that has been removed
	const storyId = $derived(cm.storyById.has(chosenStoryId) ? chosenStoryId : (cm.stories[0]?.id ?? ''));
	const story = $derived(cm.storyById.get(storyId));
	const domainId = $derived(cm.domainById.has(chosenDomainId) ? chosenDomainId : '');

	const storyOptions = $derived(cm.stories.map((s) => ({ id: s.id, label: s.name })));

	let search = $state('');
	const query = $derived(search.trim().toLowerCase());

	const groups = $derived.by(() => {
		const inDomain = cm.domains.map((d) => ({ id: d.id, name: d.name, concepts: cm.concepts.filter((c) => c.domainId === d.id) }));
		const loose = cm.concepts.filter((c) => !c.domainId || !cm.domainById.has(c.domainId));
		const all = loose.length > 0 ? [...inDomain, { id: '', name: cm.domains.length > 0 ? 'No Domain yet' : 'Concepts', concepts: loose }] : inDomain;
		if (!query) return all;
		// While searching, show only the matches, and only the groups that have one
		return all
			.map((g) => ({ ...g, concepts: g.concepts.filter((c) => c.name.toLowerCase().includes(query)) }))
			.filter((g) => g.concepts.length > 0);
	});

	/** The group a Concept is listed in: its Domain, or '' when it has none. */
	function groupOf(conceptId: string): string {
		const domainId = cm.conceptById.get(conceptId)?.domainId;
		return domainId && cm.domainById.has(domainId) ? domainId : '';
	}

	// Drag a Concept by its grip to change the order, within its own Domain
	// group: dropping it into another group would look like a change of Domain
	const reorder = createReorder(
		(dragId, targetId, position) => setOrder(adapter, cm.concepts, moveId(cm.concepts.map((c) => c.id), dragId, targetId, position)),
		(dragId, targetId) => groupOf(dragId) === groupOf(targetId)
	);

	// Adding clears the search, so the new Concept is in view
	function add(name: string) {
		search = '';
		return addConcept(adapter, name, { domainId: domainId || undefined, storyIds: storyId ? [storyId] : [] });
	}

	function parkAttribute(text: string) {
		return park(adapter, cm, { text, kind: 'attribute', note: story ? `Step 4, from the story "${story.name}"` : 'Step 4' });
	}

	async function parkConcept(concept: CmConcept) {
		if (conceptIsReferenced(cm, concept.id) && !confirm(`Park "${concept.name}"? Its Relationships and Event joins are removed.`)) return;
		await park(adapter, cm, { text: concept.name, kind: 'attribute', note: 'Step 4, parked from the Concept list' });
		await adapter.deleteNode(concept.id);
	}

	async function remove(concept: CmConcept) {
		if (conceptIsReferenced(cm, concept.id) && !confirm(`Remove "${concept.name}"? Its Relationships and Event joins are removed too.`)) return;
		await adapter.deleteNode(concept.id);
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
	<section class="lg:col-span-2 space-y-2">
		<h3 class={TYPE.sectionHeader}>Read a story</h3>
		{#if cm.stories.length === 0}
			<p class={EMPTY_HINT}>No stories yet. Capture one in Step 3, or add Concepts straight away.</p>
		{:else}
			<select class={INPUT.select} aria-label="Story to read" value={storyId} onchange={(e) => (chosenStoryId = e.currentTarget.value)}>
				{#each cm.stories as s (s.id)}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
			<div class="{CARD} p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
				{#if story?.text}{story.text}{:else}<span class={TYPE.placeholder}>This story has no text yet.</span>{/if}
			</div>
			<p class={INPUT.label}>A Concept added now links to this story.</p>
		{/if}

		<h3 class="{TYPE.sectionHeader} pt-4">Park an attribute</h3>
		<AddField placeholder="Information about a Concept, like Customer name" buttonLabel="Park" onAdd={parkAttribute} />
		<p class={INPUT.label}>{cm.parked.length} parked so far. Attributes wait for the DESIGN stage.</p>
	</section>

	<section class="lg:col-span-3 space-y-3">
		<h3 class={TYPE.sectionHeader}>Concepts</h3>
		<div class="flex items-end gap-2">
			{#if cm.domains.length > 0}
				<label class="w-44 shrink-0">
					<span class={INPUT.label}>Into Domain</span>
					<select class={INPUT.select} value={domainId} onchange={(e) => (chosenDomainId = e.currentTarget.value)}>
						<option value="">No Domain</option>
						{#each cm.domains as d (d.id)}
							<option value={d.id}>{d.name}</option>
						{/each}
					</select>
				</label>
			{/if}
			<div class="min-w-0 flex-1">
				<AddField placeholder="Add a Concept, a noun from the story, press Enter" onAdd={add} />
			</div>
		</div>

		<!-- Stays while a search is on, so a list that shrinks below 5 can still be cleared -->
		{#if cm.concepts.length >= SEARCH_FILTER.threshold || search}
			<SearchFilter bind:value={search} color={colorOf('global_concept')} label="Search the Concepts" />
		{/if}

		{#if cm.concepts.length === 0}
			<p class={EMPTY_HINT}>No Concepts yet. Underline the nouns: the things the organisation counts, manages or tracks.</p>
		{:else if query && groups.length === 0}
			<p class={EMPTY_HINT}>No Concept matches.</p>
		{/if}

		{#each groups as group (group.id)}
			<div class="space-y-1.5">
				<p class={TYPE.sectionHeader}>{group.name} ({group.concepts.length})</p>
				{#if group.concepts.length === 0}
					<p class={EMPTY_HINT}>Empty</p>
				{/if}
				<ul class="space-y-1.5">
					{#each group.concepts as concept (concept.id)}
						<li
							class="{CARD} px-3 py-2 space-y-1.5 {reorder.rowClass(concept.id)}"
							ondragover={(e) => reorder.over(e, concept.id)}
							ondrop={reorder.drop}
						>
							<div class="flex items-center gap-3">
								{#if group.concepts.length > 1}
									<span
										class={DRAG_REORDER.grip}
										draggable="true"
										role="img"
										aria-label="Drag to reorder"
										ondragstart={(e) => reorder.start(e, concept.id)}
										ondragend={reorder.end}>⠿</span
									>
								{/if}
								<div class="min-w-0 flex-1">
									<EditableText
										value={concept.name}
										label="Concept name"
										textClass="text-sm font-semibold text-slate-800"
										onSave={(name) => name && patchNode(adapter, concept.node, {}, { name })}
									/>
								</div>
								{#if cm.domains.length > 0}
									<div class="w-40 shrink-0">
										<select
											class={INPUT.select}
											aria-label="Domain for {concept.name}"
											value={concept.domainId ?? ''}
											onchange={(e) => placeConcept(adapter, concept, { domainId: e.currentTarget.value || undefined })}
										>
											<option value="">No Domain</option>
											{#each cm.domains as d (d.id)}
												<option value={d.id}>{d.name}</option>
											{/each}
										</select>
									</div>
								{/if}
								<div class="flex items-center gap-3 shrink-0">
									<button type="button" class={ROW_ACTIONS.neutral} onclick={() => onDetails(concept.id)}>Details</button>
									<button type="button" class={ROW_ACTIONS.neutral} onclick={() => parkConcept(concept)}>Park it</button>
									<button type="button" class={ROW_ACTIONS.danger} onclick={() => remove(concept)}>Remove</button>
								</div>
							</div>
							{#if storyOptions.length > 0}
								<MultiChoiceChips
									options={storyOptions}
									values={concept.storyIds}
									label="Stories {concept.name} came from"
									onChange={(storyIds) => placeConcept(adapter, concept, { storyIds })}
								/>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>
</div>
