<script lang="ts">
	// A pill-shaped on/off switch (tokens.md § toggle_switch).
	import { TOGGLE_SWITCH } from '$lib/ui/tokens';

	let { checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void } = $props();
</script>

<button type="button" role="switch" aria-checked={checked} class={TOGGLE_SWITCH.wrapper} onclick={() => onChange(!checked)}>
	<span class="{TOGGLE_SWITCH.track} {checked ? TOGGLE_SWITCH.trackActive : TOGGLE_SWITCH.trackInactive}">
		<span class="{TOGGLE_SWITCH.knob} {checked ? TOGGLE_SWITCH.knobActive : TOGGLE_SWITCH.knobInactive}"></span>
	</span>
	<span class={TOGGLE_SWITCH.label}>{label}</span>
</button>
