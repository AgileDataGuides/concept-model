<script lang="ts" generics="T extends string">
	// Pick one value from a short closed list (tokens.md § choice_chips).
	// With `allowClear`, clicking the active chip again clears the choice.
	import { CHOICE_CHIPS } from '$lib/ui/tokens';

	let {
		options,
		value,
		label,
		onChange,
		allowClear = false
	}: {
		options: { id: T; label: string; title?: string }[];
		value: T | undefined;
		label: string;
		onChange: (value: T | undefined) => void;
		allowClear?: boolean;
	} = $props();
</script>

<div class={CHOICE_CHIPS.wrapper} role="radiogroup" aria-label={label}>
	{#each options as option (option.id)}
		{@const active = value === option.id}
		<button
			type="button"
			role="radio"
			aria-checked={active}
			title={option.title}
			class="{CHOICE_CHIPS.base} {active ? CHOICE_CHIPS.active : CHOICE_CHIPS.inactive}"
			onclick={() => onChange(active && allowClear ? undefined : option.id)}
		>{option.label}</button>
	{/each}
</div>
