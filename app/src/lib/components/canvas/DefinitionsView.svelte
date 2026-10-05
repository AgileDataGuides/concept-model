<script lang="ts">
	// The Definitions: the second pattern template, one thing at a time.
	// Concepts by Domain with the three parts of each Definition, then every
	// Relationship as its two sentences, then every Core Business Event.
	// A read view: editing stays in Step 5.
	import type { CmConcept, CmView } from '$lib/model/graph-view';
	import { relationshipSentences, relationshipTriple } from '$lib/model/rules';
	import { DEFINITION_STATUSES } from '$lib/canon/steps';
	import type { DefinitionStatus } from '$lib/types';
	import { CARD, CARD_LIST_DIVIDER, EMPTY_HINT, INPUT, STEP_PANEL, TYPE } from '$lib/ui/tokens';
	import StateChip from '../ui/StateChip.svelte';

	let { cm }: { cm: CmView } = $props();

	const TONE = { draft: 'neutral', agreed: 'positive', flagged: 'warning' } as const;
	const statusLabel = (status: DefinitionStatus) => DEFINITION_STATUSES.find((s) => s.id === status)?.label ?? 'Draft';

	const groups = $derived.by(() => {
		const out: { key: string; name: string; concepts: CmConcept[] }[] = cm.domains.map((d) => ({
			key: d.id,
			name: d.name,
			concepts: cm.concepts.filter((c) => c.domainId === d.id)
		}));
		const loose = cm.concepts.filter((c) => !c.domainId || !cm.domainById.has(c.domainId));
		if (loose.length > 0) out.push({ key: 'no-domain', name: cm.domains.length > 0 ? 'No Domain yet' : 'Concepts', concepts: loose });
		return out.filter((g) => g.concepts.length > 0);
	});

	function nameOf(conceptId: string): string {
		return cm.conceptById.get(conceptId)?.name ?? '?';
	}

	function storyNames(concept: CmConcept): string {
		return concept.storyIds.map((id) => cm.storyById.get(id)?.name).filter(Boolean).join(', ');
	}
</script>

<div class="h-full overflow-y-auto bg-slate-50">
	<div class="max-w-4xl mx-auto p-6 space-y-8">
		{#if cm.scope?.statement}
			<section class="space-y-1">
				<h2 class={TYPE.sectionHeader}>Scope</h2>
				<p class="text-sm text-slate-700 whitespace-pre-wrap">{cm.scope.statement}</p>
			</section>
		{/if}

		<section class="space-y-4">
			<h2 class={TYPE.sectionHeader}>Concepts ({cm.concepts.length})</h2>
			{#if cm.concepts.length === 0}
				<p class={EMPTY_HINT}>No Concepts yet.</p>
			{/if}
			{#each groups as group (group.key)}
				<div class="space-y-2">
					<h3 class={STEP_PANEL.label}>{group.name}</h3>
					{#each group.concepts as concept (concept.id)}
						<article class="{CARD} p-4 space-y-2">
							<header class="flex items-start justify-between gap-3">
								<h4 class="text-sm font-semibold text-slate-800">{concept.name}</h4>
								<StateChip tone={TONE[concept.status]} label={statusLabel(concept.status)} />
							</header>
							{#if concept.description}
								<p class="text-sm text-slate-700 whitespace-pre-wrap">{concept.description}</p>
							{:else}
								<p class={EMPTY_HINT}>No Definition yet.</p>
							{/if}
							{#if concept.examples.length > 0}
								<div>
									<span class={INPUT.label}>For example</span>
									<ul class="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
										{#each concept.examples as example, i (i)}<li>{example}</li>{/each}
									</ul>
								</div>
							{/if}
							{#if concept.specialCases.length > 0}
								<div>
									<span class={INPUT.label}>Special cases</span>
									<ul class="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
										{#each concept.specialCases as special, i (i)}<li>{special}</li>{/each}
									</ul>
								</div>
							{/if}
							{#if concept.aliases.length > 0 || concept.storyIds.length > 0}
								<p class="text-[11px] text-slate-500">
									{#if concept.aliases.length > 0}Also called {concept.aliases.join(', ')}.{/if}
									{#if concept.storyIds.length > 0}From {storyNames(concept)}.{/if}
								</p>
							{/if}
						</article>
					{/each}
				</div>
			{/each}
		</section>

		{#if cm.relationships.length > 0}
			<section class="space-y-2">
				<h2 class={TYPE.sectionHeader}>Relationships ({cm.relationships.length})</h2>
				<ul class="{CARD} {CARD_LIST_DIVIDER}">
					{#each cm.relationships as rel (rel.id)}
						{@const s = relationshipSentences({ label: rel.verb, inverseLabel: rel.inverseVerb, rule: rel.rule }, nameOf(rel.sourceId), nameOf(rel.targetId))}
						<li class="px-4 py-2 text-sm text-slate-700">
							<p>{s.forward ?? relationshipTriple(nameOf(rel.sourceId), rel.verb, nameOf(rel.targetId))}</p>
							{#if s.inverse}<p class="text-slate-500">{s.inverse}</p>{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if cm.events.length > 0}
			<section class="space-y-2">
				<h2 class={TYPE.sectionHeader}>Core Business Events ({cm.events.length})</h2>
				<ul class="{CARD} {CARD_LIST_DIVIDER}">
					{#each cm.events as ev (ev.id)}
						<li class="px-4 py-2 text-sm text-slate-700">
							<p class="font-medium text-slate-800">{ev.name}</p>
							{#if ev.conceptIds.length > 0}
								<p class="text-[11px] text-slate-500">Involves {ev.conceptIds.map(nameOf).join(', ')}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
