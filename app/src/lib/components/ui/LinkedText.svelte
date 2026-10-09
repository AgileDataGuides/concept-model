<script lang="ts">
	// A Definition's text with the other Concepts it names as links
	// (tokens.md cards.concept_link). One click opens that Concept.
	import type { CmView } from '$lib/model/graph-view';
	import { linkConcepts } from '$lib/model/definition';
	import { CONCEPT_LINK } from '$lib/ui/tokens';

	let { text, cm, selfId, onOpen }: { text: string; cm: CmView; selfId: string; onOpen: (conceptId: string) => void } = $props();

	const parts = $derived(linkConcepts(text, cm.concepts, selfId));
</script>

{#each parts as part, i (i)}{#if part.conceptId}<button
			type="button"
			class={CONCEPT_LINK}
			title="Open {cm.conceptById.get(part.conceptId)?.name}"
			onclick={() => part.conceptId && onOpen(part.conceptId)}>{part.text}</button
		>{:else}{part.text}{/if}{/each}
