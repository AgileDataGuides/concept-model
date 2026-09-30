<script lang="ts">
	// The parked list: attributes that wait for the DESIGN stage, things ruled
	// out of scope, questions for a future Map. Each keeps a note on where it
	// came from.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { park, setModelFields } from '$lib/model/graph-actions';
	import { PARKED_KINDS, PARKED_LIST_NAME } from '$lib/canon/steps';
	import type { ParkedItem } from '$lib/types';
	import { CARD, EMPTY_HINT, ROW_ACTIONS, STEP_PANEL, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	function update(id: string, patch: Partial<ParkedItem>) {
		return setModelFields(adapter, cm, { parked: cm.parked.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
	}

	function remove(id: string) {
		return setModelFields(adapter, cm, { parked: cm.parked.filter((p) => p.id !== id) });
	}
</script>

<header class="pb-3 mb-4 border-b border-slate-200 space-y-1">
	<h2 class={STEP_PANEL.question}>{PARKED_LIST_NAME}</h2>
	<p class={STEP_PANEL.description}>Things that came up and belong somewhere else: information about a Concept for the DESIGN stage, a boundary drawn on purpose, a question for a future Map.</p>
</header>

<div class="space-y-3 max-w-3xl">
	<h3 class={TYPE.sectionHeader}>{PARKED_LIST_NAME} ({cm.parked.length})</h3>
	<AddField placeholder="Park something, press Enter" buttonLabel="Park" onAdd={(text) => park(adapter, cm, { text, kind: 'other', note: 'Parked directly' })} />
	{#if cm.parked.length === 0}
		<p class={EMPTY_HINT}>Nothing parked yet.</p>
	{:else}
		<ul class="space-y-2">
			{#each cm.parked as item (item.id)}
				<li class="{CARD} p-3 space-y-2">
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1">
							<EditableText
								value={item.text}
								label="Parked item"
								textClass="text-sm font-semibold text-slate-800"
								onSave={(text) => text && update(item.id, { text })}
							/>
						</div>
						<button type="button" class="{ROW_ACTIONS.danger} shrink-0 pt-0.5" onclick={() => remove(item.id)}>Remove</button>
					</div>
					<ChoiceChips options={PARKED_KINDS} value={item.kind} label="Kind of parked item" onChange={(kind) => kind && update(item.id, { kind })} />
					<EditableText
						value={item.note ?? ''}
						label="Where it came from"
						placeholder="Where it came from"
						textClass="text-xs text-slate-500"
						onSave={(note) => update(item.id, { note: note || undefined })}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>
