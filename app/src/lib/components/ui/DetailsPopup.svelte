<script lang="ts">
	// The Details popup on every tab: the shared editor (ConceptCardEditModal),
	// plus, for a Concept, the details Step 4 shows: its Domain and the stories
	// it came from. They sit where DESIGN_SYSTEM § 10 puts type-specific fields,
	// save with the popup's Save through placeConcept (the write Step 4 makes),
	// and Cancel drops them, like every other field.
	import { getContext, untrack } from 'svelte';
	import type { ContextNode, DataAdapter } from '$lib/cp-shared';
	import ConceptCardEditModal from '$lib/components/canvas/ConceptCardEditModal.svelte';
	import type { CmView } from '$lib/model/graph-view';
	import { placeConcept } from '$lib/model/graph-actions';
	import { INPUT } from '$lib/ui/tokens';
	import MultiChoiceChips from './MultiChoiceChips.svelte';

	let { node, nodes, cm, onClose }: { node: ContextNode; nodes: ContextNode[]; cm: CmView; onClose: () => void } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	// A Concept of this Model has a place in it: a Domain and its stories
	const concept = $derived(cm.conceptById.get(node.id));

	// The popup opens fresh each time, so the fields start, once, from the place the Concept has now
	let domainId = $state(untrack(() => (concept?.domainId && cm.domainById.has(concept.domainId) ? concept.domainId : '')));
	let storyIds = $state<string[]>(untrack(() => concept?.storyIds.filter((id) => cm.storyById.has(id)) ?? []));

	const storyOptions = $derived(cm.stories.map((s) => ({ id: s.id, label: s.name })));

	/** The same stories, in any order. */
	function sameStories(a: string[], b: string[]): boolean {
		return a.length === b.length && a.every((id) => b.includes(id));
	}

	async function savePlace() {
		if (!concept) return;
		// The popup closes while this saves, and node goes with it, so read the name now
		const name = node.name;
		const patch: { domainId?: string; storyIds?: string[] } = {};
		if ((concept.domainId ?? '') !== domainId) patch.domainId = domainId || undefined;
		if (!sameStories(concept.storyIds, storyIds)) patch.storyIds = storyIds;
		if (!('domainId' in patch) && !('storyIds' in patch)) return;
		try {
			await placeConcept(adapter, concept, patch);
		} catch (e) {
			// The popup has closed by now, so say so rather than lose the change quietly
			console.error('Could not save the Domain and stories:', e);
			alert(`Could not save the Domain and stories of ${name}. Open its Details and try again.`);
		}
	}
</script>

<ConceptCardEditModal {node} allNodes={nodes} {onClose} onSaved={concept ? savePlace : undefined} wOptional>
	{#snippet extraFields()}
		{#if concept}
			{#if cm.domains.length > 0}
				<label class="block text-xs font-medium text-slate-500 mb-1 mt-3" for="cm-details-domain">Domain</label>
				<select id="cm-details-domain" class={INPUT.select} bind:value={domainId}>
					<option value="">No Domain</option>
					{#each cm.domains as d (d.id)}
						<option value={d.id}>{d.name}</option>
					{/each}
				</select>
			{/if}
			{#if storyOptions.length > 0}
				<span class="block text-xs font-medium text-slate-500 mb-1 mt-3">Stories it came from</span>
				<MultiChoiceChips options={storyOptions} values={storyIds} label="Stories {node.name} came from" onChange={(ids) => (storyIds = ids)} />
			{/if}
		{/if}
	{/snippet}
</ConceptCardEditModal>
