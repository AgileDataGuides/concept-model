<script lang="ts" module>
	import type { StoryKind } from '$lib/types';

	/** A story being filled in on the blank card, before Add story. */
	class StoryDraft {
		name = $state('');
		text = $state('');
		kind = $state<StoryKind | undefined>(undefined);
		toldBy = $state<string | undefined>(undefined);
		stakeholderIds = $state<string[]>([]);

		clear() {
			this.name = '';
			this.text = '';
			this.kind = undefined;
			this.toldBy = undefined;
			this.stakeholderIds = [];
		}
	}

	// One draft per model, kept here rather than in the panel, so a half-typed
	// story survives a trip to another step and never moves to another model
	const drafts = new Map<string, StoryDraft>();

	function draftFor(modelId: string): StoryDraft {
		let draft = drafts.get(modelId);
		if (!draft) {
			draft = new StoryDraft();
			drafts.set(modelId, draft);
		}
		return draft;
	}
</script>

<script lang="ts">
	// Step 3 - Capture Business Stories: the expert's own words, kept. Every
	// later step reuses them, and Step 10 walks the Map back through them.
	// Each story names who told it and, from the Step 2 list, the other
	// people it matters to, its Stakeholders. A new story is filled in on a
	// blank card above the list, title and story together, and added in one go.
	// The draft stays with its model until it is added.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { setModelFields, uniqueSlug } from '$lib/model/graph-actions';
	import { STORY_KINDS } from '$lib/canon/steps';
	import type { BusinessStory } from '$lib/types';
	import { BUTTON, CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, TYPE } from '$lib/ui/tokens';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import MultiChoiceChips from '../../ui/MultiChoiceChips.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	function save(stories: BusinessStory[]) {
		return setModelFields(adapter, cm, { stories });
	}

	function update(id: string, patch: Partial<BusinessStory>) {
		return save(cm.stories.map((s) => (s.id === id ? { ...s, ...patch } : s)));
	}

	const draft = $derived(draftFor(cm.modelNode?.id ?? ''));
	let titleEl = $state<HTMLInputElement | null>(null);
	let textEl = $state<HTMLTextAreaElement | null>(null);
	let adding = false;

	/** The first story is the happy path and the rest are variations, until a kind is picked. */
	const draftKind = $derived<StoryKind>(draft.kind ?? (cm.stories.some((s) => s.kind === 'happy-path') ? 'variation' : 'happy-path'));
	const canAdd = $derived(draft.name.trim().length > 0);
	const draftStakeholderOptions = $derived(cm.participants.filter((p) => p.id !== draft.toldBy).map((p) => ({ id: p.id, label: p.name })));

	/** A new teller leaves the draft's Stakeholders, as on a saved story. */
	function setDraftTeller(toldBy: string | undefined) {
		draft.toldBy = toldBy;
		draft.stakeholderIds = draft.stakeholderIds.filter((id) => id !== toldBy);
	}

	async function add() {
		const name = draft.name.trim();
		if (!name) {
			titleEl?.focus();
			return;
		}
		if (adding) return;
		// Step 2 can lose a person while the card is half filled in
		const known = new Set(cm.participants.map((p) => p.id));
		const toldBy = draft.toldBy && known.has(draft.toldBy) ? draft.toldBy : undefined;
		const stakeholderIds = draft.stakeholderIds.filter((id) => known.has(id) && id !== toldBy);
		const story: BusinessStory = {
			id: uniqueSlug(name, cm.stories.map((s) => s.id)),
			name,
			text: draft.text.trim(),
			kind: draftKind,
			toldBy,
			stakeholderIds: stakeholderIds.length > 0 ? stakeholderIds : undefined,
			order: cm.stories.length + 1
		};
		// The card clears only once the story is saved, so a failed save loses nothing
		const saving = draft;
		adding = true;
		try {
			await save([...cm.stories, story]);
			saving.clear();
			titleEl?.focus();
		} catch (err) {
			console.error('Could not add the story', err);
		} finally {
			adding = false;
		}
	}

	/** Enter in the title goes on to the story. Ctrl+Enter, or Cmd+Enter on a Mac, adds from anywhere on the card. */
	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.isComposing) return;
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			add();
		} else if (e.target === titleEl) {
			e.preventDefault();
			textEl?.focus();
		}
	}

	/** The Step 2 people a story's Stakeholders are picked from: everyone but its teller. */
	function stakeholderOptions(story: BusinessStory) {
		return cm.participants.filter((p) => p.id !== story.toldBy).map((p) => ({ id: p.id, label: p.name }));
	}

	/** The story's Stakeholders without its teller, which an imported file can still list. */
	function stakeholdersOf(story: BusinessStory): string[] {
		return (story.stakeholderIds ?? []).filter((id) => id !== story.toldBy);
	}

	/** A new teller leaves the Stakeholders, so nobody is listed twice. */
	function setTeller(story: BusinessStory, toldBy: string | undefined) {
		const stakeholderIds = (story.stakeholderIds ?? []).filter((id) => id !== toldBy);
		return update(story.id, { toldBy, stakeholderIds: stakeholderIds.length > 0 ? stakeholderIds : undefined });
	}

	function remove(story: BusinessStory) {
		const found = cm.concepts.filter((c) => c.storyIds.includes(story.id)).length;
		if (found > 0 && !confirm(`Remove the story "${story.name}"? ${found} Concepts will no longer say they came from it.`)) return;
		return save(cm.stories.filter((s) => s.id !== story.id));
	}
</script>

<div class="space-y-3 max-w-3xl">
	<h3 class={TYPE.sectionHeader}>Business Stories</h3>
	<!-- Keys bubble up from every field, so Ctrl+Enter adds from anywhere on the card -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="{CARD} p-3 space-y-2" role="group" aria-label="New story" onkeydown={handleKeydown}>
		<label class="block">
			<span class={INPUT.label}>New story</span>
			<input
				bind:this={titleEl}
				bind:value={draft.name}
				type="text"
				placeholder="Give the story a short title"
				aria-label="Title of the new story"
				class={INPUT.text}
			/>
		</label>
		<div class="flex flex-wrap items-end gap-4">
			<div>
				<span class={INPUT.label}>Kind</span>
				<ChoiceChips options={STORY_KINDS} value={draftKind} label="Kind of the new story" onChange={(kind) => kind && (draft.kind = kind)} />
			</div>
			{#if cm.participants.length > 0}
				<label class="w-56">
					<span class={INPUT.label}>Told by</span>
					<select class={INPUT.select} value={draft.toldBy ?? ''} onchange={(e) => setDraftTeller(e.currentTarget.value || undefined)}>
						<option value="">Not recorded</option>
						{#each cm.participants as person (person.id)}
							<option value={person.id}>{person.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
		{#if draftStakeholderOptions.length > 0}
			<div>
				<span class={INPUT.label}>Stakeholders</span>
				<MultiChoiceChips
					options={draftStakeholderOptions}
					values={draft.stakeholderIds}
					label="Stakeholders of the new story"
					onChange={(ids) => (draft.stakeholderIds = ids)}
				/>
			</div>
		{/if}
		<textarea
			bind:this={textEl}
			bind:value={draft.text}
			rows="5"
			placeholder="Write it down in the expert's words, not ours, and never in system words"
			aria-label="The new story in the expert's words"
			class={INPUT.textarea}
		></textarea>
		<div class="flex justify-end">
			<button
				type="button"
				class={canAdd ? BUTTON.add : BUTTON.disabled}
				disabled={!canAdd}
				title={canAdd ? 'Add the story (Ctrl+Enter, or Cmd+Enter on a Mac)' : 'Give the story a title first'}
				onclick={add}>Add story</button
			>
		</div>
	</div>
	{#if cm.stories.length === 0}
		<p class={EMPTY_HINT}>No stories yet. Ask the expert to walk you through what happens, from the beginning.</p>
	{:else}
		<ul class="space-y-3">
			{#each cm.stories as story (story.id)}
				{@const options = stakeholderOptions(story)}
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
									onchange={(e) => setTeller(story, e.currentTarget.value || undefined)}
								>
									<option value="">Not recorded</option>
									{#each cm.participants as person (person.id)}
										<option value={person.id}>{person.name}</option>
									{/each}
								</select>
							</label>
						{/if}
					</div>
					{#if options.length > 0}
						<div>
							<span class={INPUT.label}>Stakeholders</span>
							<MultiChoiceChips
								{options}
								values={stakeholdersOf(story)}
								label="Stakeholders of the story {story.name}"
								onChange={(ids) => update(story.id, { stakeholderIds: ids.length > 0 ? ids : undefined })}
							/>
						</div>
					{/if}
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
