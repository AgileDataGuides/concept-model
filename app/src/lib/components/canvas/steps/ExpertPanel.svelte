<script lang="ts">
	// Step 2 - Find a Subject Matter Expert: the people in the session and
	// their roles. Of the three modeling roles, one person can hold two at a
	// pinch, never all three. Stakeholder sits outside that limit. Roles are
	// picked on the line above the add field before the person is added, and stay
	// editable on the card.
	import { getContext } from 'svelte';
	import type { DataAdapter } from '$lib/cp-shared';
	import type { CmView } from '$lib/model/graph-view';
	import { setModelFields, uniqueSlug } from '$lib/model/graph-actions';
	import { MAX_MODELING_ROLES_PER_PERSON, MODELING_ROLES, PARTICIPANT_ROLES } from '$lib/canon/steps';
	import type { Participant, ParticipantRole } from '$lib/types';
	import { CARD, EMPTY_HINT, INPUT, ROW_ACTIONS, TYPE } from '$lib/ui/tokens';
	import AddField from '../../ui/AddField.svelte';
	import EditableText from '../../ui/EditableText.svelte';
	import MultiChoiceChips from '../../ui/MultiChoiceChips.svelte';

	let { cm }: { cm: CmView } = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	function save(participants: Participant[]) {
		return setModelFields(adapter, cm, { participants });
	}

	function update(id: string, patch: Partial<Participant>) {
		return save(cm.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)));
	}

	// The roles for the next person, picked before Enter or Add, then cleared
	let newRoles = $state<ParticipantRole[]>([]);

	function add(name: string) {
		const id = uniqueSlug(name, cm.participants.map((p) => p.id));
		const roles = [...newRoles];
		newRoles = [];
		return save([...cm.participants, { id, name, roles }]);
	}

	function remove(person: Participant) {
		const told = cm.stories.filter((s) => s.toldBy === person.id).length;
		if (told > 0 && !confirm(`Remove ${person.name}? ${told} stories will no longer say who told them.`)) return;
		return save(cm.participants.filter((p) => p.id !== person.id));
	}
</script>

<div class="space-y-3 max-w-3xl">
	<h3 class={TYPE.sectionHeader}>In the session</h3>
	<AddField placeholder="Add a person, a name or a role title, press Enter" onAdd={add}>
		<div>
			<span class={INPUT.label}>Their roles, picked before you add them</span>
			<MultiChoiceChips
				options={PARTICIPANT_ROLES}
				values={newRoles}
				max={MAX_MODELING_ROLES_PER_PERSON}
				limited={MODELING_ROLES}
				label="Roles for the person you are adding"
				limitTitle="Two roles at a pinch, never all three"
				onChange={(roles) => (newRoles = roles)}
			/>
		</div>
	</AddField>
	{#if cm.participants.length === 0}
		<p class={EMPTY_HINT}>No one yet. Start with the Subject Matter Expert.</p>
	{:else}
		<ul class="space-y-2">
			{#each cm.participants as person (person.id)}
				<li class="{CARD} p-3 space-y-2">
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1">
							<EditableText
								value={person.name}
								label="Name or role"
								textClass="text-sm font-semibold text-slate-800"
								onSave={(name) => name && update(person.id, { name })}
							/>
						</div>
						<button type="button" class="{ROW_ACTIONS.danger} shrink-0 pt-0.5" onclick={() => remove(person)}>Remove</button>
					</div>
					<MultiChoiceChips
						options={PARTICIPANT_ROLES}
						values={person.roles}
						max={MAX_MODELING_ROLES_PER_PERSON}
						limited={MODELING_ROLES}
						label="Roles for {person.name}"
						limitTitle="Two roles at a pinch, never all three"
						onChange={(roles) => update(person.id, { roles })}
					/>
					<EditableText
						value={person.notes ?? ''}
						label="Note on {person.name}"
						placeholder="Add a note"
						textClass="text-xs text-slate-500"
						onSave={(notes) => update(person.id, { notes: notes || undefined })}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>
