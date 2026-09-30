<script lang="ts">
	// A read-only state pill (tokens.md § state_chips).
	import { STATE_CHIPS, type StateTone } from '$lib/ui/tokens';

	let { tone, label }: { tone: StateTone; label: string } = $props();
</script>

<span class="{STATE_CHIPS.base} {STATE_CHIPS[tone]}">{label}</span>
