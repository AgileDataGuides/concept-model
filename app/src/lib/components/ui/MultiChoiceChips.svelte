<script lang="ts" generics="T extends string">
	// Pick values from a short closed list. `max` caps how many of the `limited`
	// values can be on at once (all values when `limited` is not given). At the
	// limit those chips are disabled, never silently swapped.
	import { CHOICE_CHIPS } from '$lib/ui/tokens';

	let {
		options,
		values,
		label,
		onChange,
		max = Infinity,
		limited,
		limitTitle
	}: {
		options: { id: T; label: string }[];
		values: T[];
		label: string;
		onChange: (values: T[]) => void;
		max?: number;
		limited?: T[];
		limitTitle?: string;
	} = $props();

	const counts = (id: T) => !limited || limited.includes(id);
	const used = $derived(values.filter(counts).length);

	function toggle(id: T) {
		if (values.includes(id)) onChange(values.filter((v) => v !== id));
		else if (!counts(id) || used < max) onChange([...values, id]);
	}
</script>

<div class={CHOICE_CHIPS.wrapper} role="group" aria-label={label}>
	{#each options as option (option.id)}
		{@const active = values.includes(option.id)}
		{@const atLimit = !active && counts(option.id) && used >= max}
		<button
			type="button"
			aria-pressed={active}
			disabled={atLimit}
			title={atLimit ? limitTitle : undefined}
			class="{CHOICE_CHIPS.base} {active ? CHOICE_CHIPS.active : atLimit ? CHOICE_CHIPS.disabled : CHOICE_CHIPS.inactive}"
			onclick={() => toggle(option.id)}
		>{option.label}</button>
	{/each}
</div>
