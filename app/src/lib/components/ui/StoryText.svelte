<script lang="ts">
	// A Business Story read in Step 4 (tokens.md story_text). Every mention of
	// a Concept is marked: solid when it is in this story, a light box when
	// the text names it but it is not in this story yet. A click opens it. Select
	// words in the story and buttons appear under it: add them as a Concept,
	// or park them as a detailed attribute or a measurement. A selection that
	// names an existing Concept offers that Concept instead of a new one.
	import type { Attachment } from 'svelte/attachments';
	import type { CmView } from '$lib/model/graph-view';
	import type { ParkedKind } from '$lib/types';
	import { conceptNamed, markConcepts } from '$lib/model/definition';
	import { BUTTON, INPUT, STORY_TEXT, TYPE } from '$lib/ui/tokens';

	let {
		text,
		cm,
		inStory,
		onAdd,
		onLink,
		onPark,
		onOpen
	}: {
		text: string;
		cm: CmView;
		/** The ids of the Concepts this story already names in Step 4. */
		inStory: string[];
		/** Add a new Concept, linked to this story. */
		onAdd: (name: string) => unknown;
		/** Link an existing Concept to this story. */
		onLink: (conceptId: string) => unknown;
		onPark: (text: string, kind: ParkedKind) => unknown;
		onOpen: (conceptId: string) => void;
	} = $props();

	const parts = $derived(markConcepts(text, cm.concepts));

	let box = $state<HTMLElement>();
	let picked = $state('');

	// The longest selection worth offering: a noun phrase, not a paragraph
	const MAX_PICK = 60;

	/** The words selected inside this story, trimmed of the punctuation around them. */
	function readSelection() {
		const selection = window.getSelection();
		if (!selection || selection.isCollapsed || !box || !box.contains(selection.anchorNode) || !box.contains(selection.focusNode)) {
			picked = '';
			return;
		}
		const words = selection
			.toString()
			.replace(/\s+/g, ' ')
			.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
		picked = words.length > 0 && words.length <= MAX_PICK ? words : '';
	}

	// Selecting text is reading, not an action on the box, so the listeners go on
	// through an attachment rather than as handlers on a non-interactive element
	const watchSelection: Attachment<HTMLElement> = (el) => {
		el.addEventListener('mouseup', readSelection);
		el.addEventListener('keyup', readSelection);
		return () => {
			el.removeEventListener('mouseup', readSelection);
			el.removeEventListener('keyup', readSelection);
		};
	};

	const existing = $derived(picked ? conceptNamed(picked, cm.concepts) : undefined);
	const existingName = $derived(existing ? cm.conceptById.get(existing)?.name : undefined);

	async function act(run: () => unknown) {
		await run();
		picked = '';
		window.getSelection()?.removeAllRanges();
	}
</script>

<!-- The text runs on from the tag, so pre-wrap shows no stray line break -->
<div bind:this={box} class={STORY_TEXT.body} {@attach watchSelection}>{#if text}{#each parts as part, i (i)}{#if part.conceptId}<button
					type="button"
					class={inStory.includes(part.conceptId) ? STORY_TEXT.found : STORY_TEXT.named}
					title={inStory.includes(part.conceptId)
						? `Open ${cm.conceptById.get(part.conceptId)?.name}`
						: `${cm.conceptById.get(part.conceptId)?.name} is a Concept, not in this story yet. Click to open it and link it to this story.`}
					onclick={() => part.conceptId && onOpen(part.conceptId)}>{part.text}</button
				>{:else}{part.text}{/if}{/each}{:else}<span class={TYPE.placeholder}>This story has no text yet.</span>{/if}</div>

{#if picked}
	<div class="flex flex-wrap items-center gap-2">
		{#if existing && existingName}
			{#if inStory.includes(existing)}
				<p class={INPUT.label}>{existingName} is already in this story.</p>
			{:else}
				<button type="button" class={BUTTON.add} onclick={() => act(() => onLink(existing))}>Link {existingName} to story</button>
			{/if}
		{:else}
			<button type="button" class={BUTTON.add} onclick={() => act(() => onAdd(picked))}>Add "{picked}" as a Concept</button>
			<button type="button" class={BUTTON.secondary} onclick={() => act(() => onPark(picked, 'attribute'))}>Park as a detailed attribute</button>
			<button type="button" class={BUTTON.secondary} onclick={() => act(() => onPark(picked, 'measurement'))}>Park as a measurement</button>
		{/if}
	</div>
{:else if text}
	<p class={INPUT.label}>Select a noun in the story to add it as a Concept. Blue words are Concepts in this story. A word in a light box is a Concept not in this story yet. Click either to open it.</p>
{/if}
