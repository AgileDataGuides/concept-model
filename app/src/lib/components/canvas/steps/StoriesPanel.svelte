<script lang="ts">
	// Step 3 - Capture Business Stories: the expert's own words, kept. Every
	// later step reuses them, and Step 11 walks the Map back through them.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { setModelFields, uniqueSlug } from '$lib/model/graph-actions';
	import { STORY_KINDS } from '$lib/canon/steps';
	import type { BusinessStory } from '$lib/types';
	import { CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	function save(stories: BusinessStory[]) {
		return setModelFields(adapter, cm, { stories });
	}

	function update(id: string, patch: Partial<BusinessStory>) {
		return save(cm.stories.map((s) => (s.id === id ? { ...s, ...patch } : s)));
	}

	function add(name: string) {
		const id = uniqueSlug(name, cm.stories.map((s) => s.id));
		const kind = cm.stories.some((s) => s.kind === 'happy-path') ? 'variation' : 'happy-path';
		return save([...cm.stories, { id, name, text: '', kind, order: cm.stories.length + 1 }]);
	}

	function remove(story: BusinessStory) {
		const found = cm.concepts.filter((c) => c.storyIds.includes(story.id)).length;
		if (found > 0 && !confirm(`Remove the story "${story.name}"? ${found} Concepts will no longer say they came from it.`)) return;
		return save(cm.stories.filter((s) => s.id !== story.id));
	}
</script>

<div class="space-y-3 max-w-3xl">
	<h3 class={TYPE.sectionHeader}>Business Stories</h3>
	<AddField placeholder="Give the story a short title, press Enter" onAdd={add} />
	{#if cm.stories.length === 0}
		<p class={EMPTY_HINT}>No stories yet. Ask the expert to walk you through what happens, from the beginning.</p>
	{:else}
		<ul class="space-y-3">
			{#each cm.stories as story (story.id)}
				<li class="{CARD} p-3 space-y-2">
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1">
							<EditableText
								value={story.name}
								label="Story title"
								textClass="text-sm font-semibold text-slate-800"
								onSave={(name) => name && update(story.id, { name })}
							/>
						</div>
						<button type="button" class="{ROW_ACTIONS.danger} shrink-0 pt-0.5" onclick={() => remove(story)}>Remove</button>
					</div>
					<div class="flex flex-wrap items-end gap-4">
						<div>
							<span class={INPUT.label}>Kind</span>
							<ChoiceChips options={STORY_KINDS} value={story.kind} label="Kind of story" onChange={(kind) => kind && update(story.id, { kind })} />
						</div>
						{#if cm.participants.length > 0}
							<label class="w-56">
								<span class={INPUT.label}>Told by</span>
								<select
									class={INPUT.select}
									value={story.toldBy ?? ''}
									onchange={(e) => update(story.id, { toldBy: e.currentTarget.value || undefined })}
								>
									<option value="">Not recorded</option>
									{#each cm.participants as person (person.id)}
										<option value={person.id}>{person.name}</option>
									{/each}
								</select>
							</label>
						{/if}
					</div>
					<EditableText
						value={story.text}
						label="Story in the expert's words"
						placeholder="Write it down in the expert's words, not ours, and never in system words"
						paragraphs
						onSave={(text) => update(story.id, { text })}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>
