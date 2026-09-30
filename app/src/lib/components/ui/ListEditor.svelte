<script lang="ts">
	// A short list of lines, like a Definition's examples. Click a line to
	// edit it, clear it to remove it, or add a new one with Enter.
	import { INPUT, ROW_ACTIONS } from '$lib/ui/tokens';
	import AddField from './AddField.svelte';
	import EditableText from './EditableText.svelte';

	let {
		items,
		label,
		placeholder,
		onChange
	}: {
		items: string[];
		label: string;
		placeholder: string;
		onChange: (items: string[]) => unknown;
	} = $props();

	function replace(index: number, text: string) {
		onChange(text ? items.map((item, i) => (i === index ? text : item)) : items.filter((_, i) => i !== index));
	}
</script>

<div class="space-y-1.5">
	<span class={INPUT.label}>{label}</span>
	{#if items.length > 0}
		<ul class="space-y-1">
			{#each items as item, i (i)}
				<li class="flex items-start gap-2">
					<span class="text-slate-400 text-sm leading-6 select-none">&bull;</span>
					<div class="min-w-0 flex-1">
						<EditableText value={item} label="{label}, line {i + 1}" onSave={(text) => replace(i, text)} />
					</div>
					<button type="button" class="{ROW_ACTIONS.danger} shrink-0 pt-1" onclick={() => replace(i, '')}>Remove</button>
				</li>
			{/each}
		</ul>
	{/if}
	<AddField {placeholder} onAdd={(text) => onChange([...items, text])} />
</div>
