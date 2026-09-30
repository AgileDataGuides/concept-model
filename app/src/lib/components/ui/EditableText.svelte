<script lang="ts">
	// Click-to-edit text (DESIGN_SYSTEM.md § 6). A single click edits, blur or
	// Enter saves, Escape cancels. With `paragraphs`, Enter adds a new line and
	// only blur saves, for text that runs to several paragraphs, like a story.
	import { CLICK_TO_EDIT, INPUT, TYPE } from '$lib/ui/tokens';

	let {
		value,
		label,
		onSave,
		placeholder = 'Click to add',
		textClass = 'text-sm text-slate-700',
		multiline = false,
		paragraphs = false
	}: {
		value: string;
		label: string;
		onSave: (text: string) => unknown;
		placeholder?: string;
		textClass?: string;
		multiline?: boolean;
		paragraphs?: boolean;
	} = $props();

	let editing = $state(false);
	let draft = $state('');

	function start() {
		draft = value;
		editing = true;
	}

	function save() {
		if (!editing) return;
		editing = false;
		const next = draft.trim();
		if (next !== value.trim()) onSave(next);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			editing = false;
		} else if (e.key === 'Enter' && !paragraphs && !e.shiftKey) {
			e.preventDefault();
			save();
		}
	}

	function focusOnMount(node: HTMLInputElement | HTMLTextAreaElement) {
		node.focus();
		node.select();
	}
</script>

{#if editing}
	{#if multiline || paragraphs}
		<textarea
			use:focusOnMount
			bind:value={draft}
			rows={paragraphs ? 6 : 3}
			aria-label={label}
			class="{INPUT.inline} w-full py-0.5 resize-y"
			onblur={save}
			onkeydown={handleKeydown}
		></textarea>
	{:else}
		<input
			use:focusOnMount
			bind:value={draft}
			type="text"
			aria-label={label}
			class="{INPUT.inline} w-full"
			onblur={save}
			onkeydown={handleKeydown}
		/>
	{/if}
{:else}
	<button
		type="button"
		class="w-full text-left rounded px-1 -mx-1 cursor-text {CLICK_TO_EDIT} {textClass} {multiline || paragraphs ? 'whitespace-pre-wrap' : ''}"
		title="Click to edit"
		aria-label="{label}: {value || placeholder}"
		onclick={start}
	>
		{#if value}{value}{:else}<span class={TYPE.placeholder}>{placeholder}</span>{/if}
	</button>
{/if}
