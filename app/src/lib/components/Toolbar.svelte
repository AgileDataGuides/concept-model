<script module lang="ts">
	// Steps is the way in. Concept Map and Definitions are the book's two pattern templates.
	// These three are the pages a reader of the Blue Book uses, so they are the top tabs.
	// The Other menu holds the rest:
	//   Parked Details lists the detailed attributes parked for the DESIGN stage.
	//   Core Business Events lists the moments that matter, each as who-does-what.
	//   Business Event Matrix shows the same Events and Concepts as a grid.
	// The ids stay as they were, so a link copied before a rename or a move still opens its page.
	export const MAIN_TABS = [
		{ id: 'steps', label: 'Steps' },
		{ id: 'map', label: 'Concept Map' },
		{ id: 'definitions', label: 'Definitions' }
	];
	export const OTHER_TABS = [
		{ id: 'parked', label: 'Parked Details' },
		{ id: 'events', label: 'Core Business Events' },
		{ id: 'matrix', label: 'Business Event Matrix' }
	];
	const INSTRUCTIONS_TAB = { id: 'instructions', label: 'Instructions' };
	/** Every page a link can name, in the order the tab bar shows them. */
	export const TABS = [...MAIN_TABS, ...OTHER_TABS, INSTRUCTIONS_TAB];
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import type { ContextLink, ContextNode, DataAdapter } from '$lib/cp-shared';
	// By name rather than through the registry, so the bundler can leave out most of the languages this app never uses
	import { rdfXml, turtle } from '$lib/languages';
	import type { ConceptModelStore } from '$lib/stores/concept-model.svelte';
	import { readView } from '$lib/model/graph-view';
	import { mapSvg } from '$lib/components/canvas/map-svg';
	import { shownLayers } from '$lib/components/canvas/map-layers.svelte';
	import { TIER3_TABS } from '$lib/ui/tokens';

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

	let model = $derived(store.getModel());
	let dirty = $derived(store.isDirty());

	let saving = $state(false);

	// The Other menu: open or shut, and which of its pages is open, if any.
	// A disclosure, not an ARIA menu, so Tab moves through its three buttons.
	let otherOpen = $state(false);
	let otherTrigger = $state<HTMLButtonElement | null>(null);
	const activeOther = $derived(OTHER_TABS.find((t) => t.id === activeTab));

	function openTab(id: string) {
		activeTab = id;
		otherOpen = false;
	}

	function handleWindowClick(e: MouseEvent) {
		if (otherOpen && !(e.target as HTMLElement).closest('[data-other-menu]')) otherOpen = false;
	}

	// Escape closes the menu. From inside it, focus goes back on Other, so a keyboard
	// user keeps their place. From a field on the page, focus stays in the field.
	function handleWindowKeydown(e: KeyboardEvent) {
		if (!otherOpen || e.key !== 'Escape') return;
		otherOpen = false;
		if ((e.target as HTMLElement).closest?.('[data-other-menu]')) otherTrigger?.focus();
	}

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

	/** The whole Concept Map as one SVG file, drawn by the Map itself (map-svg.ts) with the layers it shows, from any tab. */
	async function handleExportSvg() {
		try {
			const svg = await mapSvg(readView(nodes, links), adapter, shownLayers());
			download(svg, `${slugifyName(model.name)}-concept-model-${exportTimestamp()}.svg`, 'image/svg+xml');
		} catch (e) {
			console.error('SVG export failed:', e);
			alert('Could not export the Map as SVG. Try again.');
		}
	}

	/**
	 * The whole model as Turtle or RDF/XML: each Concept an OWL class and a SKOS
	 * concept (design/architecture.md, Turtle and RDF). Like Export SVG, it
	 * reads the graph the canvas draws, never the store.
	 */
	function handleExportRdf(languageId: 'turtle' | 'rdf-xml') {
		const language = languageId === 'turtle' ? turtle : rdfXml;
		try {
			download(language.export({ nodes, links }), `${slugifyName(model.name)}-concept-model-${exportTimestamp()}.${language.fileExtension}`, language.mimeType);
		} catch (e) {
			console.error(`${language.name} export failed:`, e);
			alert(`Could not export the model as ${language.name}. Try again.`);
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
			<button onclick={handleExportSvg} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors" title="Save the whole Concept Map as one SVG picture, with the layers the Map shows">Export SVG</button>
			<!-- Standards exports take the teal token (tokens.md buttons.secondary_teal_export), like the Data Contract's Export ODCS -->
			<button onclick={() => handleExportRdf('turtle')} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-teal-600 border border-teal-300 hover:bg-teal-50 transition-colors" title="Save the model as Turtle (.ttl): each Concept an OWL class and a SKOS concept, for ontology and knowledge graph tools">Export Turtle</button>
			<button onclick={() => handleExportRdf('rdf-xml')} class="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-teal-600 border border-teal-300 hover:bg-teal-50 transition-colors" title="Save the model as RDF/XML (.rdf), the format Protégé opens and saves">Export RDF</button>
			<!-- Import button moved to the app header (next to New Model) — see +page.svelte.
			     That location better communicates that Import creates a NEW model rather
			     than mutating the current one. -->
		</div>
	</div>
</div>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<!-- Tabs: the book's three pages, the Other menu, then Instructions -->
{#snippet tab(t: { id: string; label: string })}
	<button class="{TIER3_TABS.wrapper} {activeTab === t.id ? TIER3_TABS.active : TIER3_TABS.inactive}" onclick={() => openTab(t.id)}>{t.label}</button>
{/snippet}
<div class="flex gap-0 px-4 border-b border-slate-200">
	{#each MAIN_TABS as t (t.id)}{@render tab(t)}{/each}
	<div class="relative" data-other-menu>
		<button
			bind:this={otherTrigger}
			class="{TIER3_TABS.wrapper} {activeOther ? TIER3_TABS.active : TIER3_TABS.inactive}"
			aria-expanded={otherOpen}
			aria-controls="other-menu"
			onclick={() => (otherOpen = !otherOpen)}
		>
			Other{#if activeOther}: {activeOther.label}{/if}
			<svg class="{TIER3_TABS.menuChevron} {otherOpen ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
		</button>
		{#if otherOpen}
			<div id="other-menu" class={TIER3_TABS.menuPanel}>
				{#each OTHER_TABS as t (t.id)}
					<button class="{TIER3_TABS.menuItem} {activeTab === t.id ? TIER3_TABS.menuItemActive : TIER3_TABS.menuItemInactive}" aria-current={activeTab === t.id ? 'page' : undefined} onclick={() => openTab(t.id)}>{t.label}</button>
				{/each}
			</div>
		{/if}
	</div>
	{@render tab(INSTRUCTIONS_TAB)}
</div>
