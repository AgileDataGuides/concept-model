<script lang="ts">
	// The Details popup on every tab: the shared editor (ConceptCardEditModal),
	// in its three-part layout so a Concept's Definition reads as it does in
	// Step 5 and on the Definitions tab, with this app's parts two and three
	// and the status. Then, for a Concept, the details Step 4 shows: its
	// Domain and the stories it came from. They sit where DESIGN_SYSTEM § 10 puts type-specific fields,
	// save with the popup's Save through placeConcept (the write Step 4 makes),
	// and Cancel drops them, like every other field.
	import { getContext, untrack } from 'svelte';
	import type { ContextNode, DataAdapter } from '$lib/cp-shared';
	import ConceptCardEditModal from '$lib/components/canvas/ConceptCardEditModal.svelte';
	import type { CmView } from '$lib/model/graph-view';
	import { patchNode, placeConcept } from '$lib/model/graph-actions';
	import { definitionSentence } from '$lib/model/definition';
	import { DEFINITION_PARTS, DEFINITION_STATUSES } from '$lib/canon/steps';
	import type { DefinitionStatus } from '$lib/types';
	import { INPUT } from '$lib/ui/tokens';
	import ChoiceChips from './ChoiceChips.svelte';
	import ListEditor from './ListEditor.svelte';
	import MultiChoiceChips from './MultiChoiceChips.svelte';

	let { node, nodes, cm, onClose }: { node: ContextNode; nodes: ContextNode[]; cm: CmView; onClose: () => void } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	// A Concept of this Model has a place in it: a Domain and its stories
	const concept = $derived(cm.conceptById.get(node.id));

	// The popup opens fresh each time, so the fields start, once, from the place the Concept has now
	let domainId = $state(untrack(() => (concept?.domainId && cm.domainById.has(concept.domainId) ? concept.domainId : '')));
	let storyIds = $state<string[]>(untrack(() => concept?.storyIds.filter((id) => cm.storyById.has(id)) ?? []));

	// Parts two and three and the status, held here until Save, like every other field
	let examples = $state<string[]>(untrack(() => [...(concept?.examples ?? [])]));
	let specialCases = $state<string[]>(untrack(() => [...(concept?.specialCases ?? [])]));
	let status = $state<DefinitionStatus>(untrack(() => concept?.status ?? 'draft'));

	const threePart = $derived({
		partOne: DEFINITION_PARTS.partOne,
		partOnePlaceholder: DEFINITION_PARTS.partOnePlaceholder(node.name),
		helper: DEFINITION_PARTS.helper,
		useSentence: DEFINITION_PARTS.useSentence,
		sentence: definitionSentence
	});

	const storyOptions = $derived(cm.stories.map((s) => ({ id: s.id, label: s.name })));

	/** The same stories, in any order. */
	function sameStories(a: string[], b: string[]): boolean {
		return a.length === b.length && a.every((id) => b.includes(id));
	}

	async function saveConcept() {
		if (!concept) return;
		// The popup closes while this saves, and node goes with it, so read the name now
		const name = node.name;
		const parts: Record<string, unknown> = {};
		if (!sameLines(concept.examples, examples)) parts.examples = examples;
		if (!sameLines(concept.specialCases, specialCases)) parts.specialCases = specialCases;
		if (concept.status !== status) parts.definitionStatus = status;
		const place: { domainId?: string; storyIds?: string[] } = {};
		if ((concept.domainId ?? '') !== domainId) place.domainId = domainId || undefined;
		if (!sameStories(concept.storyIds, storyIds)) place.storyIds = storyIds;
		try {
			// patchNode merges into the node as it is now, after the popup's own Save
			if (Object.keys(parts).length > 0) await patchNode(adapter, concept.node, parts);
			if ('domainId' in place || 'storyIds' in place) await placeConcept(adapter, concept, place);
		} catch (e) {
			// The popup has closed by now, so say so rather than lose the change quietly
			console.error('Could not save the Definition parts, Domain and stories:', e);
			alert(`Could not save all the details of ${name}. Open its Details and try again.`);
		}
	}

	/** The same lines, in the same order. */
	function sameLines(a: string[], b: string[]): boolean {
		return a.length === b.length && a.every((line, i) => line === b[i]);
	}
</script>

<ConceptCardEditModal
	{node}
	allNodes={nodes}
	{onClose}
	onSaved={concept ? saveConcept : undefined}
	threePart={concept ? threePart : undefined}
	wOptional
>
	{#snippet definitionParts()}
		<div class="mt-3 space-y-3">
			<ListEditor items={examples} label={DEFINITION_PARTS.partTwo} placeholder={DEFINITION_PARTS.partTwoPlaceholder} onChange={(lines) => (examples = lines)} />
			<ListEditor
				items={specialCases}
				label={DEFINITION_PARTS.partThree}
				placeholder={DEFINITION_PARTS.partThreePlaceholder}
				onChange={(lines) => (specialCases = lines)}
			/>
			<div>
				<span class={INPUT.label}>{DEFINITION_PARTS.status}</span>
				<ChoiceChips options={DEFINITION_STATUSES} value={status} label="Definition status for {node.name}" onChange={(s) => s && (status = s)} />
			</div>
		</div>
	{/snippet}
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
