<script lang="ts">
	// THE Concept Model canvas: one Concept Model, five views.
	//   - steps:       the eleven Modeling Business Concepts steps, the way in
	//   - map:         the Concept Map pattern template
	//   - definitions: the Definitions pattern template
	//   - parked:      the parked detailed attributes, waiting for the DESIGN stage
	//   - matrix:      the Core Business Events and Concepts as a Business Event Matrix
	//
	// Mode-agnostic: it reads the { nodes, links } it is given and writes only
	// through the DataAdapter from context, so the same component works in the
	// standalone app and embedded in the Context Plane. The host picks the view
	// (the standalone app from its Toolbar tabs, or from a link).
	import type { ContextNode, ContextLink } from '$lib/cp-shared';
	import { readView } from '$lib/model/graph-view';
	import StepsView from './StepsView.svelte';
	import MapView from './MapView.svelte';
	import DefinitionsView from './DefinitionsView.svelte';
	import MatrixView from './MatrixView.svelte';
	import ParkedPanel from './steps/ParkedPanel.svelte';
	import { STEP_PANEL } from '$lib/ui/tokens';

	let {
		nodes,
		links = [],
		view = 'steps',
		step = $bindable()
	}: {
		nodes: ContextNode[];
		links?: ContextLink[];
		view?: 'steps' | 'map' | 'definitions' | 'parked' | 'matrix';
		/** The selected step on the Steps view. The standalone app binds it to put the step in the page link. */
		step?: string;
	} = $props();

	const cm = $derived(readView(nodes, links));
</script>

{#if !cm.modelNode}
	<div class="flex items-center justify-center h-full">
		<span class="text-[10px] text-slate-300 italic">Empty</span>
	</div>
{:else if view === 'map'}
	<MapView {cm} />
{:else if view === 'definitions'}
	<DefinitionsView {cm} {nodes} />
{:else if view === 'parked'}
	<div class="h-full overflow-y-auto bg-slate-50 {STEP_PANEL.body}">
		<ParkedPanel {cm} details />
	</div>
{:else if view === 'matrix'}
	<MatrixView {cm} {nodes} />
{:else}
	<StepsView {cm} {nodes} bind:selected={step} />
{/if}
