<script lang="ts">
	// The Search Filter (DESIGN_SYSTEM.md § 14): a small search field over a
	// list of 5 or more items, filtering by name. The caller decides when to
	// show it. The border takes the list's entity colour at 40.
	import { SEARCH_FILTER } from '$lib/ui/tokens';

	let { value = $bindable(''), color, label }: { value?: string; color: string; label: string } = $props();
</script>

<div class={SEARCH_FILTER.wrapper}>
	<svg class={SEARCH_FILTER.icon} fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
		<circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
	</svg>
	<input
		type="text"
		placeholder="Search..."
		aria-label={label}
		bind:value
		class={SEARCH_FILTER.input}
		style="border-color: {color}40;"
		onkeydown={(e) => {
			if (e.key === 'Escape') value = '';
		}}
	/>
	{#if value}
		<button type="button" class={SEARCH_FILTER.clear} aria-label="Clear the search" onclick={() => (value = '')}>✕</button>
	{/if}
</div>
