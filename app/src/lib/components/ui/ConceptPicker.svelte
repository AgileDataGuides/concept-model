<script lang="ts">
	// Search-or-create typeahead for a Concept (DESIGN_SYSTEM.md § 6, Typeahead
	// Search). A new name creates the Concept on the spot, because in a real
	// session a Relationship or an Event often sparks the Concept it needs.
	import type { CmConcept } from '$lib/model/graph-view';
	import { colorOf } from '$lib/constants/context-types';

	let {
		concepts,
		value = null,
		label,
		placeholder = 'Search or create a Concept',
		exclude = [],
		onPick,
		onCreate
	}: {
		concepts: CmConcept[];
		value?: string | null;
		label: string;
		placeholder?: string;
		exclude?: string[];
		onPick: (conceptId: string | null) => void;
		onCreate?: (name: string) => Promise<string | null>;
	} = $props();

	let query = $state('');
	let open = $state(false);
	let focusIdx = $state(-1);

	const conceptColor = colorOf('global_concept');
	const selected = $derived(value ? concepts.find((c) => c.id === value) : undefined);
	const shown = $derived(selected ? selected.name : query);

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [] as CmConcept[];
		return concepts
			.filter((c) => !exclude.includes(c.id) && c.name.toLowerCase().includes(q))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 8);
	});

	const exact = $derived(concepts.find((c) => c.name.toLowerCase() === query.trim().toLowerCase()));
	const canCreate = $derived(!!onCreate && query.trim().length > 0 && !exact);
	// The Create row sits after the matches, reached with the arrow keys
	const lastIdx = $derived(canCreate ? matches.length : matches.length - 1);

	function pick(concept: CmConcept) {
		query = '';
		open = false;
		focusIdx = -1;
		onPick(concept.id);
	}

	async function create() {
		const name = query.trim();
		if (!name || !onCreate) return;
		const id = await onCreate(name);
		query = '';
		open = false;
		focusIdx = -1;
		if (id) onPick(id);
	}

	function handleInput(e: Event) {
		query = (e.currentTarget as HTMLInputElement).value;
		open = true;
		focusIdx = -1;
		if (value) onPick(null);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusIdx = Math.min(focusIdx + 1, lastIdx);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusIdx = Math.max(focusIdx - 1, -1);
		} else if (e.key === 'Enter') {
			if (selected) return; // let the form's own Enter run
			e.preventDefault();
			e.stopPropagation();
			// A partial name picks the first match. Creating a Concept is always a deliberate choice.
			if (focusIdx >= 0 && matches[focusIdx]) pick(matches[focusIdx]);
			else if (focusIdx === matches.length && canCreate) create();
			else if (exact) {
				// An exact name that is excluded is already chosen, so nothing else gets picked
				if (!exclude.includes(exact.id)) pick(exact);
			} else if (matches.length > 0) pick(matches[0]);
			else if (canCreate) create();
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="relative min-w-0 flex-1">
	<input
		type="text"
		value={shown}
		{placeholder}
		aria-label={label}
		autocomplete="off"
		class="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none {selected ? 'border-blue-400 bg-blue-50' : 'border-slate-300'}"
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
	/>
	{#if open && !selected && (matches.length > 0 || canCreate)}
		<div class="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-xl z-50 py-1 w-72 max-h-48 overflow-y-auto">
			{#each matches as concept, i (concept.id)}
				<button
					type="button"
					class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 {i === focusIdx ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}"
					onmousedown={(e) => {
						e.preventDefault();
						pick(concept);
					}}
				>
					<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {conceptColor}"></span>
					<span class="font-medium">{concept.name}</span>
				</button>
			{/each}
			{#if canCreate}
				<button
					type="button"
					class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 {focusIdx === matches.length ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}"
					onmousedown={(e) => {
						e.preventDefault();
						create();
					}}
				>
					<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {conceptColor}"></span>
					<span>Create <span class="font-medium">"{query.trim()}"</span></span>
				</button>
			{/if}
		</div>
	{/if}
</div>
