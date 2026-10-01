<script lang="ts">
	import { getContext } from 'svelte';
	import type { ContextLink, ContextNode, DataAdapter } from '$lib/cp-shared';
	import type { ConceptModelStore } from '$lib/stores/concept-model.svelte';
	import { readView } from '$lib/model/graph-view';
	import { mapSvg } from '$lib/components/canvas/map-svg';

	const store = getContext<ConceptModelStore>('cmStore');
	const adapter = getContext<DataAdapter>('dataAdapter');

	let {
		activeTab = $bindable('steps'),
		nodes,
		links
	}: {
		activeTab: string;
		/** The graph the canvas draws, which Export SVG draws too. */
		nodes: ContextNode[];
		links: ContextLink[];
	} = $props();

	// Steps is the way in. Map and Definitions are the book's two pattern templates.
	const tabs = [
		{ id: 'steps', label: 'Steps' },
		{ id: 'map', label: 'Map' },
		{ id: 'definitions', label: 'Definitions' },
		{ id: 'instructions', label: 'Instructions' }
	];

	let model = $derived(store.getModel());
	let dirty = $derived(store.isDirty());

	let saving = $state(false);

	// Name editing
	let editingName = $state(false);
	let editNameValue = $state('');
	let nameInputEl = $state<HTMLInputElement | null>(null);

	// Description editing
	let editingDesc = $state(false);
	let editDescValue = $state('');
	let descInputEl = $state<HTMLInputElement | null>(null);

	function startEditName() {
		editNameValue = model.name;
		editingName = true;
		setTimeout(() => nameInputEl?.focus(), 0);
	}

	function saveName() {
		const trimmed = editNameValue.trim();
		editingName = false;
		if (!trimmed || trimmed === model.name) return;
		store.renameModel(trimmed);
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); saveName(); }
		else if (e.key === 'Escape') { editingName = false; }
	}

	function startEditDesc() {
		editDescValue = model.description || '';
		editingDesc = true;
		setTimeout(() => descInputEl?.focus(), 0);
	}

	function saveDesc() {
		editingDesc = false;
		store.updateDescription(editDescValue.trim());
	}

	function handleDescKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); saveDesc(); }
		else if (e.key === 'Escape') { editingDesc = false; }
	}

	async function handleSave() {
		saving = true;
		try {
			await store.saveModel();
		} catch (e) {
			console.error('Save failed:', e);
			alert('Could not save the model. Your changes are still here, so try Save again.');
		} finally {
			saving = false;
		}
	}

	function exportTimestamp(): string {
		const d = new Date();
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
	}

	function slugifyName(name: string): string {
		return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') || 'export';
	}

	function download(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleExportJSON() {
		download(store.exportJSON(), `${slugifyName(model.name)}-concept-model-${exportTimestamp()}.json`, 'application/json');
	}

	function handleExportCsv() {
		download(store.exportAsCsv(), `${slugifyName(model.name)}-concept-model-${exportTimestamp()}.csv`, 'text/csv');
	}

	/** The whole Concept Map as one SVG file, drawn by the Map itself (map-svg.ts), from any tab. */
	async function handleExportSvg() {
		try {
			const svg = await mapSvg(readView(nodes, links), adapter);
			download(svg, `${slugifyName(model.name)}-concept-model-${exportTimestamp()}.svg`, 'image/svg+xml');
		} catch (e) {
			console.error('SVG export failed:', e);
			alert('Could not export the Map as SVG. Try again.');
		}
	}

	// Import handling moved to +page.svelte where it's wired to the header's
	// Import button (next to New Model). This toolbar now only handles
	// exports + save / rename / description editing.
</script>

<!-- Toolbar: Name/Desc + Save + Exports -->
<div class="bg-white border border-slate-200 rounded-lg">
	<div class="flex items-center justify-between px-4 py-2.5">
		<div class="flex items-center gap-3 min-w-0">
			<div class="min-w-0">
				{#if editingName}
					<input bind:this={nameInputEl} bind:value={editNameValue} onblur={saveName} onkeydown={handleNameKeydown} onclick={(e) => e.stopPropagation()} type="text" class="text-sm font-semibold text-slate-800 px-1 border border-blue-400 rounded outline-none w-64" />
				{:else}
					<button class="text-sm font-semibold text-slate-800 leading-tight cursor-pointer hover:text-slate-600 transition-colors text-left truncate max-w-md" onclick={startEditName} title="Click to edit name">{model.name}</button>
				{/if}
				{#if editingDesc}
					<input bind:this={descInputEl} bind:value={editDescValue} onblur={saveDesc} onkeydown={handleDescKeydown} onclick={(e) => e.stopPropagation()} type="text" placeholder="Add a description..." class="text-[10px] text-slate-500 px-1 border border-blue-400 rounded outline-none w-full mt-0.5" />
				{:else}
					<button class="block text-[10px] leading-tight mt-0.5 truncate max-w-md text-left cursor-pointer transition-colors {model.description ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 italic hover:text-slate-500'}" onclick={startEditDesc} title="Click to edit description">{model.description || 'Click to add a description'}</button>
				{/if}
			</div>

			<button onclick={handleSave} disabled={!dirty || saving}
				class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors shrink-0 {dirty ? 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50' : 'bg-white text-slate-300 border border-slate-200 cursor-not-allowed'}">
				{#if saving}Saving...{:else if dirty}Save{:else}Saved{/if}
			</button>
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<button onclick={handleExportJSON} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">Export JSON</button>
			<button onclick={handleExportCsv} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">Export CSV</button>
			<button onclick={() => store.exportAsXlsx()} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">Export Excel</button>
			<button onclick={handleExportSvg} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors" title="Save the whole Concept Map as one SVG picture">Export SVG</button>
			<!-- Import button moved to the app header (next to New Model) — see +page.svelte.
			     That location better communicates that Import creates a NEW model rather
			     than mutating the current one. -->
		</div>
	</div>
</div>

<!-- Tabs -->
<div class="flex gap-0 px-4 border-b border-slate-200">
	{#each tabs as tab}
		<button
			class="flex items-center px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors {activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}"
			onclick={() => (activeTab = tab.id)}
		>{tab.label}</button>
	{/each}
</div>
