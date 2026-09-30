<script lang="ts">
	// Step 5 - Agree the Definitions: for each Concept, the book's three parts.
	// Part one, the nature of the thing, is the Concept's description, which
	// also feeds the Business Glossary. Agree the easy ones, flag the hard ones.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { patchNode } from '$lib/model/graph-actions';
	import { DEFINITION_STATUSES } from '$lib/canon/steps';
	import type { DefinitionStatus } from '$lib/types';
	import { BUTTON, CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, STEP_PANEL, STEP_RAIL, TYPE } from '$lib/ui/tokens';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import ListEditor from '../../ui/ListEditor.svelte';
	import StateChip from '../../ui/StateChip.svelte';

	let { cm, onDetails }: { cm: CmView; onDetails: (nodeId: string) => void } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	let chosenId = $state('');
	const current = $derived(cm.conceptById.get(chosenId) ?? cm.concepts[0]);

	const TONE = { draft: 'neutral', agreed: 'positive', flagged: 'warning' } as const;
	const statusLabel = (status: DefinitionStatus) => DEFINITION_STATUSES.find((s) => s.id === status)?.label ?? 'Draft';

	function next() {
		if (!current) return;
		const i = cm.concepts.findIndex((c) => c.id === current.id);
		chosenId = cm.concepts[(i + 1) % cm.concepts.length].id;
	}
</script>

{#if cm.concepts.length === 0}
	<p class={EMPTY_HINT}>No Concepts to define yet. Add them in Step 4.</p>
{:else if current}
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<section class="space-y-1">
			<h3 class="{TYPE.sectionHeader} pb-1">Concepts</h3>
			<ul class={STEP_RAIL.listContainer}>
				{#each cm.concepts as concept (concept.id)}
					<li>
						<button
							type="button"
							aria-current={concept.id === current.id}
							class="{STEP_RAIL.row} {concept.id === current.id ? STEP_RAIL.rowActive : STEP_RAIL.rowInactive}"
							onclick={() => (chosenId = concept.id)}
						>
							<span class="min-w-0 flex-1 flex items-center justify-between gap-2">
								<span class={TYPE.cardTitle}>{concept.name}</span>
								<StateChip tone={TONE[concept.status]} label={statusLabel(concept.status)} />
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<section class="lg:col-span-2 {CARD} p-4 space-y-4">
			<div class="flex items-start justify-between gap-3">
				<h3 class={STEP_PANEL.question}>What do we mean by {current.name}?</h3>
				<div class="flex items-center gap-3 shrink-0">
					<button type="button" class={ROW_ACTIONS.neutral} onclick={() => onDetails(current.id)}>Details</button>
					<button type="button" class={BUTTON.secondary} onclick={next}>Next Concept</button>
				</div>
			</div>

			<div class="space-y-1">
				<span class={INPUT.label}>Part one: the nature of the thing</span>
				<EditableText
					value={current.description}
					label="The nature of {current.name}"
					placeholder="One or two sentences in everyday language. What must be true for something to be a {current.name}?"
					multiline
					onSave={(description) => patchNode(adapter, current.node, {}, { description })}
				/>
				{#if current.definitionCategory || current.definitionDifferentiator}
					<p class="text-[11px] text-slate-500">
						Helper: a {current.name} is a {current.definitionCategory || '…'} that {current.definitionDifferentiator || '…'}
					</p>
				{/if}
			</div>

			<ListEditor
				items={current.examples}
				label="Part two: examples"
				placeholder="A real example, press Enter"
				onChange={(examples) => patchNode(adapter, current.node, { examples })}
			/>

			<ListEditor
				items={current.specialCases}
				label="Part three: special cases and points of confusion"
				placeholder="A special case, press Enter"
				onChange={(specialCases) => patchNode(adapter, current.node, { specialCases })}
			/>

			<div>
				<span class={INPUT.label}>Status</span>
				<ChoiceChips
					options={DEFINITION_STATUSES}
					value={current.status}
					label="Definition status for {current.name}"
					onChange={(status) => status && patchNode(adapter, current.node, { definitionStatus: status })}
				/>
			</div>
		</section>
	</div>
{/if}
