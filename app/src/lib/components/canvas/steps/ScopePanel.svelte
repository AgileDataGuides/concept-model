<script lang="ts">
	// Step 1 - Identify the Scope: the boundary, how it is sliced, and the
	// Domains it covers. Concepts are placed in a Domain in Step 4.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { moveId, patchNode, setModelFields, setOrder } from '$lib/model/graph-actions';
	import { SCOPE_SLICES } from '$lib/canon/steps';
	import { colorOf } from '$lib/constants/context-types';
	import type { ScopeSlice } from '$lib/types';
	import { CARD, DRAG_REORDER, EMPTY_HINT, INPUT, ROW_ACTIONS, SEARCH_FILTER, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import SearchFilter from '../../ui/SearchFilter.svelte';
	import { createReorder } from '../../ui/reorder.svelte';

	let { cm, onDetails }: { cm: CmView; onDetails: (nodeId: string) => void } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	let search = $state('');
	const query = $derived(search.trim().toLowerCase());
	const shownDomains = $derived(query ? cm.domains.filter((d) => d.name.toLowerCase().includes(query)) : cm.domains);

	// Drag a Domain by its grip to change the order the Map and the lists use
	const reorder = createReorder((dragId, targetId, position) =>
		setOrder(adapter, cm.domains, moveId(cm.domains.map((d) => d.id), dragId, targetId, position))
	);

	const sliceOptions = SCOPE_SLICES.map((s) => ({ id: s.id, label: s.label, title: s.example ? `For example "${s.example}"` : undefined }));

	function conceptsIn(domainId: string): number {
		return cm.concepts.filter((c) => c.domainId === domainId).length;
	}

	async function saveScope(patch: { statement?: string; slicedBy?: ScopeSlice }) {
		const next = { statement: cm.scope?.statement ?? '', slicedBy: cm.scope?.slicedBy, ...patch };
		await setModelFields(adapter, cm, { scope: next.statement || next.slicedBy ? next : undefined });
	}

	// Adding clears the search, so the new Domain is in view
	function addDomain(name: string) {
		search = '';
		return adapter.createNode({ label: 'global_domain', name });
	}

	async function removeDomain(domainId: string, name: string) {
		const held = conceptsIn(domainId);
		if (held > 0 && !confirm(`Remove the Domain "${name}"? Its ${held} Concepts stay, outside any Domain.`)) return;
		await adapter.deleteNode(domainId);
	}
</script>

<div class="space-y-6 max-w-3xl">
	<section class="space-y-2">
		<h3 class={TYPE.sectionHeader}>Scope statement</h3>
		<div class="{CARD} p-3">
			<EditableText
				value={cm.scope?.statement ?? ''}
				label="Scope statement"
				placeholder="The slice of the organisation we are modeling, in words everyone understands"
				multiline
				onSave={(statement) => saveScope({ statement })}
			/>
		</div>
		<p class={INPUT.label}>How is it sliced?</p>
		<ChoiceChips
			options={sliceOptions}
			value={cm.scope?.slicedBy}
			label="How the Scope is sliced"
			allowClear
			onChange={(slicedBy) => saveScope({ slicedBy })}
		/>
	</section>

	<section class="space-y-2">
		<h3 class={TYPE.sectionHeader}>Domains</h3>
		<AddField placeholder="Add a Domain, press Enter" onAdd={addDomain} />
		<!-- Stays while a search is on, so a list that shrinks below 5 can still be cleared -->
		{#if cm.domains.length >= SEARCH_FILTER.threshold || search}
			<SearchFilter bind:value={search} color={colorOf('global_domain')} label="Search the Domains" />
		{/if}
		{#if cm.domains.length === 0}
			<p class={EMPTY_HINT}>No Domains yet. A Domain is an area of the organisation centred on one important topic.</p>
		{:else if shownDomains.length === 0}
			<p class={EMPTY_HINT}>No Domain matches.</p>
		{:else}
			<ul class="space-y-2">
				{#each shownDomains as domain (domain.id)}
					<li
						class="{CARD} p-3 flex items-start gap-3 {reorder.rowClass(domain.id)}"
						ondragover={(e) => reorder.over(e, domain.id)}
						ondrop={reorder.drop}
					>
						{#if shownDomains.length > 1}
							<span
								class={DRAG_REORDER.grip}
								draggable="true"
								role="img"
								aria-label="Drag to reorder"
								ondragstart={(e) => reorder.start(e, domain.id)}
								ondragend={reorder.end}>⠿</span
							>
						{/if}
						<div class="min-w-0 flex-1 space-y-1">
							<EditableText
								value={domain.name}
								label="Domain name"
								textClass="text-sm font-semibold text-slate-800"
								onSave={(name) => name && patchNode(adapter, domain.node, {}, { name })}
							/>
							<EditableText
								value={domain.description}
								label="Domain description"
								placeholder="What this Domain covers"
								textClass="text-xs text-slate-500"
								onSave={(description) => patchNode(adapter, domain.node, {}, { description })}
							/>
						</div>
						<span class="text-[10px] text-slate-400 shrink-0 pt-1">{conceptsIn(domain.id)} Concepts</span>
						<div class="flex items-center gap-3 shrink-0 pt-0.5">
							<button type="button" class={ROW_ACTIONS.neutral} onclick={() => onDetails(domain.id)}>Details</button>
							<button type="button" class={ROW_ACTIONS.danger} onclick={() => removeDomain(domain.id, domain.name)}>Remove</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
