<script lang="ts">
	// Step 6 - Identify the Relationships: the verbs from the stories. Every
	// line carries its reason, and the verb goes on straight away. Two verbs
	// between the same two Concepts are two lines.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmRelationship, CmView } from '$lib/model/graph-view';
	import { addConcept, addRelationship, patchLink } from '$lib/model/graph-actions';
	import { BUTTON, CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, TYPE } from '$lib/ui/tokens';
	import ConceptPicker from '../../ui/ConceptPicker.svelte';
	import EditableText from '../../ui/EditableText.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	let sourceId = $state<string | null>(null);
	let targetId = $state<string | null>(null);
	let verb = $state('');
	let inverseVerb = $state('');
	let verbEl = $state<HTMLInputElement | null>(null);

	const ready = $derived(!!sourceId && !!targetId && verb.trim().length > 0);

	const sorted = $derived(
		[...cm.relationships].sort(
			(a, b) =>
				(cm.conceptById.get(a.sourceId)?.name ?? '').localeCompare(cm.conceptById.get(b.sourceId)?.name ?? '') ||
				a.verb.localeCompare(b.verb)
		)
	);

	async function createConcept(name: string): Promise<string | null> {
		const node = await addConcept(adapter, name);
		return node.id;
	}

	async function submit() {
		if (!ready || !sourceId || !targetId) return;
		await addRelationship(adapter, sourceId, targetId, verb.trim(), inverseVerb.trim());
		// Keep the source: the book works Concept by Concept
		targetId = null;
		verb = '';
		inverseVerb = '';
		verbEl?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		}
	}

	async function remove(rel: CmRelationship) {
		const sitting = cm.events.filter((e) => e.relationshipId === rel.id).length;
		if (sitting > 0 && !confirm(`Remove this Relationship? ${sitting} Events sit on it and will no longer say so.`)) return;
		await adapter.deleteLink(rel.id);
	}
</script>

<div class="space-y-4 max-w-4xl">
	<section class="{CARD} p-3 space-y-2">
		<h3 class={TYPE.sectionHeader}>Add a Relationship</h3>
		<div class="flex flex-wrap items-center gap-2">
			<ConceptPicker concepts={cm.concepts} value={sourceId} label="From Concept" placeholder="From Concept" onPick={(id) => (sourceId = id)} onCreate={createConcept} />
			<div class="w-44">
				<input bind:this={verbEl} bind:value={verb} type="text" placeholder="verb, like places" aria-label="Verb" class={INPUT.text} onkeydown={handleKeydown} />
			</div>
			<ConceptPicker
				concepts={cm.concepts}
				value={targetId}
				label="To Concept"
				placeholder="To Concept"
				onPick={(id) => (targetId = id)}
				onCreate={createConcept}
			/>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<div class="w-72">
				<input bind:value={inverseVerb} type="text" placeholder="the other way, like is placed by" aria-label="Inverse verb" class={INPUT.text} onkeydown={handleKeydown} />
			</div>
			<button type="button" class={ready ? BUTTON.add : BUTTON.disabled} disabled={!ready} onclick={submit}>Add</button>
			<p class={INPUT.label}>Pick two Concepts and the verb that connects them in real life.</p>
		</div>
	</section>

	<section class="space-y-2">
		<h3 class={TYPE.sectionHeader}>Relationships ({cm.relationships.length})</h3>
		{#if sorted.length === 0}
			<p class={EMPTY_HINT}>No Relationships yet. Go back to the stories for the verbs.</p>
		{:else}
			<ul class="space-y-1.5">
				{#each sorted as rel (rel.id)}
					{@const source = cm.conceptById.get(rel.sourceId)}
					{@const target = cm.conceptById.get(rel.targetId)}
					<li class="{CARD} px-3 py-2 flex items-center gap-3">
						<div class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
							<div class="flex items-center gap-1.5 min-w-0 text-sm text-slate-700">
								<span class="font-semibold text-slate-800 shrink-0">{source?.name ?? '?'}</span>
								<div class="min-w-0 flex-1">
									<EditableText value={rel.verb} label="Verb" textClass="text-sm italic text-slate-700" onSave={(v) => v && patchLink(adapter, rel.link, {}, v)} />
								</div>
								<span class="font-semibold text-slate-800 shrink-0">{target?.name ?? '?'}</span>
							</div>
							<div class="flex items-center gap-1.5 min-w-0 text-xs text-slate-500">
								<span class="shrink-0">{target?.name ?? '?'}</span>
								<div class="min-w-0 flex-1">
									<EditableText
										value={rel.inverseVerb}
										label="Inverse verb"
										placeholder="add the other way"
										textClass="text-xs text-slate-600"
										onSave={(v) => patchLink(adapter, rel.link, { inverseLabel: v })}
									/>
								</div>
								<span class="shrink-0">{source?.name ?? '?'}</span>
							</div>
						</div>
						<button type="button" class="{ROW_ACTIONS.danger} shrink-0" onclick={() => remove(rel)}>Remove</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
