<script lang="ts">
	// Type, press Enter, keep going. The field keeps the cursor after each add,
	// so a Facilitator can capture a run of names on a shared screen.
	import { BUTTON, INPUT } from '$lib/ui/tokens';

	let {
		placeholder,
		onAdd,
		buttonLabel = 'Add'
	}: {
		placeholder: string;
		onAdd: (text: string) => unknown;
		buttonLabel?: string;
	} = $props();

	let value = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);

	async function submit() {
		const text = value.trim();
		if (!text) return;
		value = '';
		await onAdd(text);
		inputEl?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		} else if (e.key === 'Escape') {
			value = '';
		}
	}
</script>

<div class="flex items-center gap-2">
	<input
		bind:this={inputEl}
		bind:value
		type="text"
		{placeholder}
		aria-label={placeholder}
		class={INPUT.text}
		onkeydown={handleKeydown}
	/>
	<button type="button" class="{BUTTON.add} shrink-0" onclick={submit}>{buttonLabel}</button>
</div>
