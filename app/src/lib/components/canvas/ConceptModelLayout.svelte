<script lang="ts">
	// THE Concept Model canvas: one Concept Model, three views.
	//   - steps:       the eleven Modeling Business Concepts steps, the way in
	//   - map:         the Concept Map pattern template
	//   - definitions: the Definitions pattern template
	//
	// Mode-agnostic: it reads the { nodes, links } it is given and writes only
	// through the DataAdapter from context, so the same component works in the
	// standalone app and embedded in the Context Plane. The host picks the view
	// (the standalone app from its Toolbar tabs).
	import type { ContextNode, ContextLink } from '$lib/cp-shared';
	import { readView } from '$lib/model/graph-view';
	import StepsView from './StepsView.svelte';
	import MapView from './MapView.svelte';
	import DefinitionsView from './DefinitionsView.svelte';

	let {
		nodes,
		links = [],
		view = 'steps'
	}: {
		nodes: ContextNode[];
		links?: ContextLink[];
		view?: 'steps' | 'map' | 'definitions';
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
	<DefinitionsView {cm} />
{:else}
	<StepsView {cm} {nodes} />
{/if}
