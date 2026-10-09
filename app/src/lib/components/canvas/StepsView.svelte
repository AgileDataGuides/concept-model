<script lang="ts">
	// The Steps tab: the ten Modeling Business Concepts steps as the way in.
	// A rail of steps on the left, the selected step's panel on the right.
	// A checklist, never a wizard: every step is reachable at any time and no
	// step blocks another. Each row's status is derived from the data.
	import { getContext } from 'svelte';
	import type { ContextNode, DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { setStepNote } from '$lib/model/graph-actions';
	import { stepStatus } from '$lib/model/status';
	import { PARKED_LIST_NAME, STEPS, getStep, stepLabel } from '$lib/canon/steps';
	import type { StepId } from '$lib/types';
	import { STEP_PANEL, STEP_RAIL } from '$lib/ui/tokens';
	import QuietHint from '../ui/QuietHint.svelte';
	import DetailsPopup from '../ui/DetailsPopup.svelte';
	import MapView from './MapView.svelte';
	import StepHeader from './steps/StepHeader.svelte';
	import ScopePanel from './steps/ScopePanel.svelte';
	import ExpertPanel from './steps/ExpertPanel.svelte';
	import StoriesPanel from './steps/StoriesPanel.svelte';
	import ConceptsPanel from './steps/ConceptsPanel.svelte';
	import DefinitionsPanel from './steps/DefinitionsPanel.svelte';
	import RelationshipsPanel from './steps/RelationshipsPanel.svelte';
	import RulesPanel from './steps/RulesPanel.svelte';
	import QuestionsPanel from './steps/QuestionsPanel.svelte';
	import WalkPanel from './steps/WalkPanel.svelte';
	import ParkedPanel from './steps/ParkedPanel.svelte';

	type Selection = StepId | 'parked';

	let {
		cm,
		nodes,
		selected = $bindable()
	}: {
		cm: CmView;
		nodes: ContextNode[];
		/** The selected step. A host binds it to put the step in a link; an unknown value falls back to the remembered step. */
		selected?: string;
	} = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	// Without a step from the host, the selected step is a per-viewer convenience, remembered in this browser
	const STORAGE_KEY = 'cm-active-step';

	function isSelection(value: string | null | undefined): value is Selection {
		return value === 'parked' || STEPS.some((s) => s.id === value);
	}

	function remembered(): Selection {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (isSelection(saved)) return saved;
		} catch {
			// no storage: start at Step 1
		}
		return 'scope';
	}

	if (!isSelection(selected)) selected = remembered();
	const active = $derived<Selection>(isSelection(selected) ? selected : 'scope');

	function select(selection: Selection) {
		selected = selection;
		try {
			localStorage.setItem(STORAGE_KEY, selection);
		} catch {
			// no storage: the choice lasts until reload
		}
	}

	const statuses = $derived(new Map(STEPS.map((s) => [s.id, stepStatus(cm, s.id)])));
	const step = $derived(active === 'parked' ? null : getStep(active));
	const status = $derived(step ? statuses.get(step.id) : undefined);

	// Details opens the app's Details popup: the shared editor (aliases, the
	// three parts of a Definition with the Aristotle helper, the status, W's,
	// notes) plus a Concept's Domain and stories
	let detailsId = $state<string | null>(null);
	const detailsNode = $derived(detailsId ? nodes.find((n) => n.id === detailsId) : undefined);

	function openDetails(nodeId: string) {
		detailsId = nodeId;
	}
</script>

<div class="flex h-full min-h-0">
	<nav class={STEP_RAIL.container} aria-label="The ten steps">
		<ul class="py-2">
			{#each STEPS as s (s.id)}
				{@const rowStatus = statuses.get(s.id)}
				{@const skipped = !!cm.stepNotes[s.id]?.skipped}
				<li>
					<button
						type="button"
						aria-current={active === s.id ? 'step' : undefined}
						class="{STEP_RAIL.row} {active === s.id ? STEP_RAIL.rowActive : STEP_RAIL.rowInactive}"
						onclick={() => select(s.id)}
					>
						<span class={skipped ? STEP_RAIL.dotSkipped : rowStatus?.started ? STEP_RAIL.dotStarted : STEP_RAIL.dotEmpty}></span>
						<span class="min-w-0">
							<span class="block {active === s.id ? STEP_RAIL.labelActive : STEP_RAIL.labelInactive}">{stepLabel(s)}</span>
							<span class="block {skipped ? STEP_RAIL.statusSkipped : STEP_RAIL.status}">{skipped ? 'Skipped on purpose' : rowStatus?.line}</span>
						</span>
					</button>
				</li>
			{/each}
			<li class={STEP_RAIL.divider}>
				<button
					type="button"
					aria-current={active === 'parked' ? 'step' : undefined}
					class="{STEP_RAIL.row} {active === 'parked' ? STEP_RAIL.rowActive : STEP_RAIL.rowInactive}"
					onclick={() => select('parked')}
				>
					<span class={cm.parked.length > 0 ? STEP_RAIL.dotStarted : STEP_RAIL.dotEmpty}></span>
					<span class="min-w-0">
						<span class="block {active === 'parked' ? STEP_RAIL.labelActive : STEP_RAIL.labelInactive}">{PARKED_LIST_NAME}</span>
						<span class="block {STEP_RAIL.status}">{cm.parked.length} parked</span>
					</span>
				</button>
			</li>
		</ul>
	</nav>

	<section class="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50">
		{#if step && status}
			{#if step.id === 'map'}
				<div class="{STEP_PANEL.bodyTop} shrink-0">
					<StepHeader {step} note={cm.stepNotes[step.id]} onChange={(note) => setStepNote(adapter, cm, step.id, note)} />
				</div>
				<div class="flex-1 min-h-96 border-t border-slate-200">
					<MapView {cm} />
				</div>
			{:else}
				<div class="flex-1 overflow-y-auto {STEP_PANEL.body}">
					<StepHeader {step} note={cm.stepNotes[step.id]} onChange={(note) => setStepNote(adapter, cm, step.id, note)} />
					{#if status.hints.length > 0}
						<div class="space-y-1 mb-4">
							{#each status.hints as hint, i (i)}
								<QuietHint text={hint} />
							{/each}
						</div>
					{/if}
					{#if step.id === 'scope'}
						<ScopePanel {cm} onDetails={openDetails} />
					{:else if step.id === 'subject-matter-expert'}
						<ExpertPanel {cm} />
					{:else if step.id === 'stories'}
						<StoriesPanel {cm} />
					{:else if step.id === 'concepts'}
						<ConceptsPanel {cm} onDetails={openDetails} />
					{:else if step.id === 'definitions'}
						<DefinitionsPanel {cm} onDetails={openDetails} />
					{:else if step.id === 'relationships'}
						<RelationshipsPanel {cm} />
					{:else if step.id === 'relationship-rules'}
						<RulesPanel {cm} />
					{:else if step.id === 'questions'}
						<QuestionsPanel {cm} />
					{:else if step.id === 'walk'}
						<WalkPanel {cm} />
					{/if}
				</div>
			{/if}
		{:else}
			<div class="flex-1 overflow-y-auto {STEP_PANEL.body}">
				<ParkedPanel {cm} />
			</div>
		{/if}
	</section>
</div>

{#if detailsNode}
	<DetailsPopup node={detailsNode} {nodes} {cm} onClose={() => (detailsId = null)} />
{/if}
