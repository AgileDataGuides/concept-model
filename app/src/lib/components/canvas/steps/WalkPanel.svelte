<script lang="ts">
	// Step 10 - Walk the Map: read each story, then each question, across the
	// Map, out loud. When the finger gets stuck, decide in the room: draw it,
	// rule it out of scope, or park it for a future Map.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { park, parkedIdForWalk, setWalk, walkFor } from '$lib/model/graph-actions';
	import { NOT_WALKED_LABEL, WALK_RESOLUTIONS, WALK_RESULTS } from '$lib/canon/steps';
	import type { Walk, WalkResolution } from '$lib/types';
	import { CARD, EMPTY_HINT, INPUT, TYPE } from '$lib/ui/tokens';
	import ChoiceChips from '../../ui/ChoiceChips.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import StateChip from '../../ui/StateChip.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	const subjects = $derived([
		{ heading: 'Business Stories', type: 'story' as const, items: cm.stories.map((s) => ({ id: s.id, name: s.name })) },
		{ heading: 'Business Questions', type: 'question' as const, items: cm.questions.map((q) => ({ id: q.id, name: q.name })) }
	]);

	function tone(walk: Walk | undefined) {
		if (!walk) return 'neutral' as const;
		return walk.result === 'holds' ? ('positive' as const) : ('warning' as const);
	}

	function label(walk: Walk | undefined): string {
		return walk ? (WALK_RESULTS.find((r) => r.id === walk.result)?.label ?? NOT_WALKED_LABEL) : NOT_WALKED_LABEL;
	}

	/**
	 * Out of scope and parked also go on the parked list, once, with where they
	 * came from. setWalk takes the item off again when the walk stops calling for it.
	 */
	async function resolve(subject: Walk['subject'], name: string, walk: Walk, resolution: WalkResolution | undefined) {
		await setWalk(adapter, cm, subject, { resolution });
		if (resolution === 'out-of-scope' || resolution === 'parked') {
			await park(adapter, cm, {
				id: parkedIdForWalk(walk),
				text: walk.finding || name,
				kind: resolution === 'out-of-scope' ? 'out-of-scope' : 'future-map',
				note: `Step 10, walking "${name}"`
			});
		}
	}
</script>

<div class="space-y-6 max-w-3xl">
	{#if cm.stories.length === 0 && cm.questions.length === 0}
		<p class={EMPTY_HINT}>Nothing to walk yet. Capture stories in Step 3 and questions in Step 9.</p>
	{/if}
	{#each subjects as group (group.type)}
		{#if group.items.length > 0}
			<section class="space-y-2">
				<h3 class={TYPE.sectionHeader}>{group.heading}</h3>
				<ul class="space-y-2">
					{#each group.items as item (item.id)}
						{@const subject = { type: group.type, id: item.id }}
						{@const walk = walkFor(cm, group.type, item.id)}
						<li class="{CARD} p-3 space-y-2">
							<div class="flex items-start justify-between gap-3">
								<p class="text-sm font-semibold text-slate-800">{item.name}</p>
								<StateChip tone={tone(walk)} label={label(walk)} />
							</div>
							<ChoiceChips
								options={WALK_RESULTS}
								value={walk?.result}
								label="Walk result for {item.name}"
								allowClear
								onChange={(result) => setWalk(adapter, cm, subject, result ? { result } : null)}
							/>
							{#if walk?.result === 'stuck'}
								<div class="space-y-2 pl-3 border-l-2 border-slate-200">
									<EditableText
										value={walk.finding ?? ''}
										label="Finding"
										placeholder="Where did the finger get stuck?"
										textClass="text-xs text-slate-600"
										onSave={(finding) => setWalk(adapter, cm, subject, { finding: finding || undefined })}
									/>
									<div>
										<span class={INPUT.label}>What we did</span>
										<ChoiceChips
											options={WALK_RESOLUTIONS}
											value={walk.resolution}
											label="What we did about {item.name}"
											allowClear
											onChange={(resolution) => resolve(subject, item.name, walk, resolution)}
										/>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</div>
