<script lang="ts">
	// Step 9 - Gather Business Questions: the first three to five questions
	// that come quickly, each walked across the Map. A question that cannot
	// walk is the finding.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmQuestion, CmView } from '$lib/model/graph-view';
	import { patchNode, setWalk, walkFor } from '$lib/model/graph-actions';
	import { WALK_RESULTS } from '$lib/canon/steps';
	import { CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	function subject(q: CmQuestion) {
		return { type: 'question' as const, id: q.id };
	}
</script>

<div class="space-y-3 max-w-3xl">
	<h3 class={TYPE.sectionHeader}>Business Questions</h3>
	<AddField
		placeholder="Add a question, like How many Sales Orders came through each Channel last month?"
		onAdd={(name) => adapter.createNode({ label: 'global_business_question', name })}
	/>
	{#if cm.questions.length === 0}
		<p class={EMPTY_HINT}>No Business Questions yet. Ask what questions they need answered about this slice of the organisation.</p>
	{:else}
		<ul class="space-y-2">
			{#each cm.questions as q (q.id)}
				{@const walk = walkFor(cm, 'question', q.id)}
				<li class="{CARD} p-3 space-y-2">
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1">
							<EditableText
								value={q.name}
								label="Business Question"
								textClass="text-sm font-semibold text-slate-800"
								onSave={(name) => name && patchNode(adapter, q.node, {}, { name })}
							/>
						</div>
						<button type="button" class="{ROW_ACTIONS.danger} shrink-0 pt-0.5" onclick={() => adapter.deleteNode(q.id)}>Remove</button>
					</div>
					<div class="flex flex-wrap items-end gap-4">
						{#if cm.participants.length > 0}
							<label class="w-56">
								<span class={INPUT.label}>Asked by</span>
								<select
									class={INPUT.select}
									value={q.askedBy ?? ''}
									onchange={(e) => patchNode(adapter, q.node, { askedBy: e.currentTarget.value || undefined })}
								>
									<option value="">Not recorded</option>
									{#each cm.participants as person (person.id)}
										<option value={person.id}>{person.name}</option>
									{/each}
								</select>
							</label>
						{/if}
						<div>
							<span class={INPUT.label}>Walked across the Map</span>
							<ChoiceChips
								options={WALK_RESULTS}
								value={walk?.result}
								label="Walk result for {q.name}"
								allowClear
								onChange={(result) => setWalk(adapter, cm, subject(q), result ? { result } : null)}
							/>
						</div>
					</div>
					{#if walk?.result === 'stuck'}
						<EditableText
							value={walk.finding ?? ''}
							label="Finding"
							placeholder="Where does it get stuck? A missing Concept, Relationship or Event, or a boundary drawn on purpose"
							textClass="text-xs text-slate-600"
							onSave={(finding) => setWalk(adapter, cm, subject(q), { finding: finding || undefined })}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
