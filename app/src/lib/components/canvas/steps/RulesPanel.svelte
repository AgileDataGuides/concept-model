<script lang="ts">
	// Step 7 - Describe the Relationship Rules: how many, and could there be
	// none, read aloud in both directions. Words win over notation: an expert
	// can confirm a sentence and cannot confirm a crow's foot.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmRelationship, CmView } from '$lib/model/graph-view';
	import { patchLink } from '$lib/model/graph-actions';
	import { RULE_CHOICES, choiceToRuleEnd, hasBothEnds, pluralise, relationshipSentences, ruleEndToChoice, type RuleChoice } from '$lib/model/rules';
	import { toRestate } from '$lib/model/status';
	import { RULE_WORDS } from '$lib/canon/steps';
	import type { RuleEnd } from '$lib/types';
	import { CARD, EMPTY_HINT, TYPE } from '$lib/ui/tokens';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import StateChip from '../../ui/StateChip.svelte';
	import ToggleSwitch from '../../ui/ToggleSwitch.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	const options = RULE_CHOICES.map((id) => ({ id, label: RULE_WORDS[id] }));

	function nameOf(conceptId: string): string {
		return cm.conceptById.get(conceptId)?.name ?? '?';
	}

	/** The object noun, plural once the maximum is many. */
	function object(name: string, end: RuleEnd | undefined): string {
		return end?.max === 'many' ? pluralise(name) : name;
	}

	function setEnd(rel: CmRelationship, direction: 'forward' | 'inverse', choice: RuleChoice | undefined) {
		if (!choice) return;
		return patchLink(adapter, rel.link, { rule: { ...(rel.rule ?? {}), [direction]: choiceToRuleEnd(choice) } });
	}
</script>

{#if cm.relationships.length === 0}
	<p class={EMPTY_HINT}>No Relationships yet. Add them in Step 6, then come back for the rules.</p>
{:else}
	<ul class="space-y-2 max-w-4xl">
		{#each cm.relationships as rel (rel.id)}
			{@const source = nameOf(rel.sourceId)}
			{@const target = nameOf(rel.targetId)}
			{@const sentences = relationshipSentences({ label: rel.verb, inverseLabel: rel.inverseVerb, rule: rel.rule }, source, target)}
			<li class="{CARD} p-3 space-y-2">
				<div class="flex items-center justify-between gap-3">
					<p class={TYPE.cardTitle}>{source} {rel.verb} {target}</p>
					<div class="flex items-center gap-2 shrink-0">
						{#if toRestate(rel)}
							<StateChip tone="warning" label="To restate: {rel.cardinality}" />
						{/if}
						<ToggleSwitch checked={rel.flagged} label="Flag this rule" onChange={(flagged) => patchLink(adapter, rel.link, { flagged })} />
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
					<span>Each <span class="font-semibold">{source}</span> <span class="italic">{rel.verb}</span></span>
					<ChoiceChips
						{options}
						value={rel.rule?.forward ? ruleEndToChoice(rel.rule.forward) : undefined}
						label="How many {target} for each {source}"
						onChange={(choice) => setEnd(rel, 'forward', choice)}
					/>
					<span class="font-semibold">{object(target, rel.rule?.forward)}</span>
				</div>

				<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
					<span>Each <span class="font-semibold">{target}</span></span>
					<div class="w-44">
						<EditableText
							value={rel.inverseVerb}
							label="Inverse verb"
							placeholder="add the verb"
							textClass="text-sm italic text-slate-700"
							onSave={(v) => patchLink(adapter, rel.link, { inverseLabel: v })}
						/>
					</div>
					<ChoiceChips
						{options}
						value={rel.rule?.inverse ? ruleEndToChoice(rel.rule.inverse) : undefined}
						label="How many {source} for each {target}"
						onChange={(choice) => setEnd(rel, 'inverse', choice)}
					/>
					<span class="font-semibold">{object(source, rel.rule?.inverse)}</span>
				</div>

				{#if hasBothEnds(rel.rule)}
					<p class="text-xs text-slate-500">{sentences.forward} {sentences.inverse}</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
