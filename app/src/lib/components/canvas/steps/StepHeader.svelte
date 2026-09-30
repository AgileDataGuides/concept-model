<script lang="ts">
	// The same header on every step panel: the label, the book's question, the
	// one-line description, a read-more link when one exists, and the switch
	// that marks a step skipped on purpose, with a note on why.
	import { stepLabel, type StepCanon } from '$lib/canon/steps';
	import type { StepNote } from '$lib/types';
	import { STEP_PANEL } from '$lib/ui/tokens';
	import EditableText from '../../ui/EditableText.svelte';
	import ToggleSwitch from '../../ui/ToggleSwitch.svelte';

	let {
		step,
		note,
		onChange
	}: {
		step: StepCanon;
		note: StepNote | undefined;
		onChange: (note: StepNote) => void;
	} = $props();

	const skipped = $derived(!!note?.skipped);
</script>

<header class="flex items-start justify-between gap-4 pb-3 mb-4 border-b border-slate-200">
	<div class="min-w-0 space-y-1">
		<p class={STEP_PANEL.label}>{stepLabel(step)}</p>
		<h2 class={STEP_PANEL.question}>{step.question}</h2>
		<p class={STEP_PANEL.description}>
			{step.description}
			{#if step.readMoreUrl}
				<a href={step.readMoreUrl} target="_blank" rel="noopener" class={STEP_PANEL.readMore}>Read more</a>
			{/if}
		</p>
		<div class="pt-1 max-w-xl">
			<EditableText
				value={note?.note ?? ''}
				label="Note on this step"
				placeholder={skipped ? 'Why are we skipping this step?' : 'Add a note on this step'}
				textClass="text-xs text-slate-600"
				onSave={(text) => onChange({ skipped, note: text })}
			/>
		</div>
	</div>
	<ToggleSwitch checked={skipped} label="Skip on purpose" onChange={(value) => onChange({ skipped: value, note: note?.note })} />
</header>
