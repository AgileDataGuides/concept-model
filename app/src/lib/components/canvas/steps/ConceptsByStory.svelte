<script lang="ts">
	// Step 4, By story: one Business Story at a time, the way the book reads
	// them. Read the story, select its nouns to add them, and see the Concepts
	// it names marked in the text. Beside it, the Concepts in this story: add a
	// new one or an existing one with the typeahead, set each one's Domain, or
	// take it out of the story without removing the Concept.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmConcept, CmView } from '$lib/model/graph-view';
	import { addConcept, park, placeConcept } from '$lib/model/graph-actions';
	import type { ParkedKind } from '$lib/types';
	import { BUTTON, CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ConceptPicker from '../../ui/ConceptPicker.svelte';
	import StoryText from '../../ui/StoryText.svelte';

	let { cm, onDetails }: { cm: CmView; onDetails: (nodeId: string, storyId?: string) => void } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	let chosenStoryId = $state('');
	let chosenDomainId = $state('');

	// Fall back to the first story, and drop a Domain that has been removed
	const index = $derived(Math.max(0, cm.stories.findIndex((s) => s.id === chosenStoryId)));
	const story = $derived(cm.stories[index]);
	const domainId = $derived(cm.domainById.has(chosenDomainId) ? chosenDomainId : '');

	const inStory = $derived(story ? cm.concepts.filter((c) => c.storyIds.includes(story.id)) : []);
	const inStoryIds = $derived(inStory.map((c) => c.id));

	function addNew(name: string) {
		if (!story) return;
		return addConcept(adapter, name, { domainId: domainId || undefined, storyIds: [story.id] });
	}

	/** The typeahead's create: a new Concept, linked to this story, in the chosen Domain. */
	async function create(name: string): Promise<string | null> {
		const node = await addNew(name);
		return node?.id ?? null;
	}

	function link(conceptId: string | null) {
		const concept = conceptId ? cm.conceptById.get(conceptId) : undefined;
		if (!concept || !story || concept.storyIds.includes(story.id)) return;
		return placeConcept(adapter, concept, { storyIds: [...concept.storyIds, story.id] });
	}

	function unlink(concept: CmConcept) {
		if (!story) return;
		return placeConcept(adapter, concept, { storyIds: concept.storyIds.filter((id) => id !== story.id) });
	}

	function parkDetail(text: string, kind: ParkedKind = 'attribute') {
		return park(adapter, cm, { text, kind, note: story ? `Step 4, from the story "${story.name}"` : 'Step 4' });
	}
</script>

{#if !story}
	<p class={EMPTY_HINT}>No stories yet. Capture one in Step 3, or switch to All Concepts to add Concepts straight away.</p>
{:else}
	<div class="space-y-4">
		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class={index > 0 ? BUTTON.secondary : BUTTON.disabled} disabled={index === 0} onclick={() => (chosenStoryId = cm.stories[index - 1].id)}
				>Previous story</button
			>
			<span class={TYPE.sectionHeader}>Story {index + 1} of {cm.stories.length}</span>
			<button
				type="button"
				class={index < cm.stories.length - 1 ? BUTTON.secondary : BUTTON.disabled}
				disabled={index === cm.stories.length - 1}
				onclick={() => (chosenStoryId = cm.stories[index + 1].id)}>Next story</button
			>
			<select class="{INPUT.select} max-w-xs" aria-label="Story to read" value={story.id} onchange={(e) => (chosenStoryId = e.currentTarget.value)}>
				{#each cm.stories as s (s.id)}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
			<section class="lg:col-span-3 space-y-2">
				<h3 class={TYPE.sectionHeader}>{story.name}</h3>
				<StoryText text={story.text} {cm} inStory={inStoryIds} onAdd={addNew} onLink={link} onPark={parkDetail} onOpen={(conceptId) => onDetails(conceptId, story.id)} />
			</section>

			<section class="lg:col-span-2 space-y-3">
				<h3 class={TYPE.sectionHeader}>Concepts in this story ({inStory.length})</h3>
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
						<ConceptPicker
							concepts={cm.concepts}
							value={null}
							exclude={inStoryIds}
							label="Add a Concept to this story"
							placeholder="Search a Concept, or type a new one"
							onPick={link}
							onCreate={create}
						/>
					</div>
				</div>

				{#if inStory.length === 0}
					<p class={EMPTY_HINT}>None yet. Select a noun in the story, or search for a Concept above.</p>
				{:else}
					<ul class="space-y-1.5">
						{#each inStory as concept (concept.id)}
							<li class="{CARD} px-3 py-2 space-y-1.5">
								<div class="flex items-center gap-3">
									<button type="button" class="min-w-0 flex-1 text-left text-sm font-semibold text-slate-800 truncate" onclick={() => onDetails(concept.id)}
										>{concept.name}</button
									>
									<button type="button" class="{ROW_ACTIONS.neutral} shrink-0" title="Take {concept.name} out of this story. The Concept stays." onclick={() => unlink(concept)}
										>Remove</button
									>
								</div>
								{#if cm.domains.length > 0}
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
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				<h3 class="{TYPE.sectionHeader} pt-2">Park detailed attributes</h3>
				<AddField placeholder="Information about a Concept, like Customer name" buttonLabel="Park" onAdd={(text) => parkDetail(text)} />
			</section>
		</div>
	</div>
{/if}
