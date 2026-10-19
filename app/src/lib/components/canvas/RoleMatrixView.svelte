<script lang="ts">
	// The Role Matrix tab: the Concepts as rows under their Domain rows, the
	// Subject Matter Experts and Stakeholders as columns, and how each person
	// links to each Concept through a story (DESIGN_SYSTEM.md § 18 Role Matrix).
	//   - T: the person told a story the Concept came from.
	//   - S: the person is a Stakeholder of a story the Concept came from.
	// The cells are read only, because the link lives on the story. One click
	// on a Concept or Domain name opens the Details editor, as in every view.
	import { SvelteSet } from 'svelte/reactivity';
	import type { ContextNode } from '$lib/cp-shared';
	import type { CmConcept, CmDomain, CmView } from '$lib/model/graph-view';
	import { linkKey, roleMatrix, type RoleLink } from '$lib/model/role-matrix';
	import { nameList } from '$lib/model/status';
	import { DEFINITION_PARTS, sevenWLabel } from '$lib/canon/steps';
	import { partOneText } from '$lib/model/definition';
	import { EMPTY_HINT, EVENT_MATRIX, INPUT, ROLE_MATRIX } from '$lib/ui/tokens';
	import DetailsPopup from '../ui/DetailsPopup.svelte';

	let { cm, nodes }: { cm: CmView; nodes: ContextNode[] } = $props();

	const matrix = $derived(roleMatrix(cm));

	function linkOf(personId: string, conceptId: string): RoleLink | undefined {
		return matrix.links.get(linkKey(personId, conceptId));
	}

	/** How many people link to the Concept, for the People column. */
	function peopleCount(conceptId: string): number {
		return matrix.people.filter((p) => linkOf(p.id, conceptId)).length;
	}

	/** How many Concepts the person links to, for the Concept Count row. */
	function conceptCount(personId: string): number {
		return cm.concepts.filter((c) => linkOf(personId, c.id)).length;
	}

	/** The hover on a cell: the stories behind each letter. */
	function linkWords(link: RoleLink): string {
		const names = (stories: { name: string }[]) => nameList(stories.map((s) => `"${s.name}"`));
		return [
			...(link.told.length > 0 ? [`Told ${names(link.told)}`] : []),
			...(link.stakeholderOf.length > 0 ? [`Stakeholder of ${names(link.stakeholderOf)}`] : [])
		].join('. ');
	}

	// ── Bands: Domains in the Step 1 order, each over its Concepts in the Step 4 order ──

	interface Band {
		key: string;
		name: string;
		domain?: CmDomain;
		concepts: CmConcept[];
	}

	const bands = $derived.by((): Band[] => {
		const all: Band[] = [
			...cm.domains.map((d) => ({ key: d.id, name: d.name, domain: d, concepts: cm.concepts.filter((c) => c.domainId === d.id) })),
			{ key: 'no-domain', name: 'No Domain yet', concepts: cm.concepts.filter((c) => !c.domainId || !cm.domainById.has(c.domainId)) }
		];
		return all.filter((b) => b.concepts.length > 0);
	});

	const collapsed = new SvelteSet<string>();

	function toggleBand(key: string) {
		// The row under the mouse is redrawn, so its mouseleave never comes
		card = null;
		if (collapsed.has(key)) collapsed.delete(key);
		else collapsed.add(key);
	}

	// ── One click on a name opens the Details popup, the same one the Steps open ──

	let detailsId = $state<string | null>(null);
	const detailsNode = $derived(detailsId ? nodes.find((n) => n.id === detailsId) : undefined);

	// ── A hover card on a Concept's name or a Domain's row, as on the Business Event Matrix page ──

	interface Card {
		x: number;
		y: number;
		title: string;
		lines: { label: string; text: string }[];
	}

	let card = $state<Card | null>(null);
	const CARD_WIDTH = 240;

	function showCard(e: MouseEvent, title: string, lines: { label: string; text: string }[]) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = Math.max(8, Math.min(r.left + 16, window.innerWidth - CARD_WIDTH - 8));
		card = { x, y: r.bottom + 4, title, lines: lines.filter((l) => l.text) };
	}

	function definitionOf(c: CmConcept): string {
		return partOneText(c) || DEFINITION_PARTS.empty;
	}

	function conceptLines(c: CmConcept) {
		const stories = c.storyIds.map((id) => cm.storyById.get(id)?.name).filter((n): n is string => !!n);
		return [
			{ label: 'Definition', text: definitionOf(c) },
			{ label: 'Also called', text: c.aliases.join(', ') },
			{ label: 'Domain', text: c.domainId ? (cm.domainById.get(c.domainId)?.name ?? '') : '' },
			{ label: '7W', text: c.w ? sevenWLabel(c.w) : '' },
			{ label: 'Stories', text: stories.length > 0 ? stories.join(', ') : 'No story yet' }
		];
	}

	function domainLines(d: CmDomain) {
		return [
			{ label: 'Description', text: d.description || 'No description yet.' },
			{ label: 'Concepts', text: String(cm.concepts.filter((c) => c.domainId === d.id).length) }
		];
	}

	// ── Empty states ──

	const emptyLine = $derived(cm.concepts.length === 0 ? 'No Concepts yet. Add them in Step 4, from the stories in Step 3.' : '');

	const noPeopleLine = $derived(
		matrix.people.length === 0
			? 'No Subject Matter Experts or Stakeholders yet. Add people and their roles in Step 2, then name who told each story in Step 3.'
			: ''
	);

	/** Every column after the Concept name: the People count, then one per person. */
	const fillSpan = $derived(matrix.people.length + 1);
</script>

<div class="h-full overflow-auto bg-slate-50">
	<div class="p-6 space-y-3">
		<p class={INPUT.label}>
			Each row is a Concept, under its Domain, and each column a Subject Matter Expert or Stakeholder from Step 2.
			<span class={ROLE_MATRIX.told}>T</span> the person told a story the Concept came from.
			<span class={ROLE_MATRIX.stakeholder}>S</span> the person is a Stakeholder of a story the Concept came from. Hover a cell to see
			the stories. To change a link, change the story in Step 3 or the Concept's stories in Step 4.
		</p>

		{#if emptyLine}
			<p class={EMPTY_HINT}>{emptyLine}</p>
		{:else}
			{#if noPeopleLine}
				<p class={EMPTY_HINT}>{noPeopleLine}</p>
			{/if}
			<div class={ROLE_MATRIX.wrapper}>
				<table class={ROLE_MATRIX.table}>
					<thead>
						<tr>
							<th scope="col" class={EVENT_MATRIX.cornerHeader}>Concepts</th>
							<th scope="col" class={EVENT_MATRIX.countHeader} title="How many people each Concept links to">People</th>
							{#each matrix.people as person (person.id)}
								<th scope="col" class={ROLE_MATRIX.personHeader}>{person.name}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each bands as band (band.key)}
							{@const domain = band.domain}
							{@const colours = domain ? EVENT_MATRIX.bandDomain : EVENT_MATRIX.bandNoDomain}
							<tr
								onmouseenter={domain ? (e) => showCard(e, domain.name, domainLines(domain)) : undefined}
								onmouseleave={() => (card = null)}
							>
								<th scope="rowgroup" class="{ROLE_MATRIX.bandRowLabel} {colours}">
									{#if collapsed.has(band.key)}
										<button type="button" title="Open {band.name}" onclick={() => toggleBand(band.key)}>▸ {band.name} ({band.concepts.length})</button>
									{:else}
										{#if domain}
											<button type="button" class={EVENT_MATRIX.nameButton} onclick={() => (detailsId = domain.id)}>{band.name}</button>
										{:else}
											{band.name}
										{/if}
										<button
											type="button"
											class={EVENT_MATRIX.bandToggle}
											aria-label="Collapse {band.name}"
											title="Collapse {band.name}"
											onclick={() => toggleBand(band.key)}>◂</button
										>
									{/if}
								</th>
								<td colspan={fillSpan} class="{ROLE_MATRIX.bandRowFill} {colours}"></td>
							</tr>
							{#if !collapsed.has(band.key)}
								{#each band.concepts as concept (concept.id)}
									{@const linked = peopleCount(concept.id)}
									<tr class={EVENT_MATRIX.row}>
										<th
											scope="row"
											class={EVENT_MATRIX.eventCell}
											onmouseenter={(e) => showCard(e, concept.name, conceptLines(concept))}
											onmouseleave={() => (card = null)}
										>
											<button type="button" class={EVENT_MATRIX.nameButton} onclick={() => (detailsId = concept.id)}>{concept.name}</button>
										</th>
										<td
											class="{EVENT_MATRIX.countCell} {linked > 0 ? EVENT_MATRIX.countOk : EVENT_MATRIX.countWarning}"
											title={linked > 0 ? undefined : `No one is linked to ${concept.name} yet: it has no story, or its stories name no one.`}>{linked}</td
										>
										{#each matrix.people as person (person.id)}
											{@const link = linkOf(person.id, concept.id)}
											<td class={EVENT_MATRIX.markCell}>
												{#if link}
													<span class={ROLE_MATRIX.mark} role="img" aria-label="{concept.name}, {person.name}: {linkWords(link)}" title={linkWords(link)}>
														{#if link.told.length > 0}<span class={ROLE_MATRIX.told} aria-hidden="true">T</span>{/if}
														{#if link.stakeholderOf.length > 0}<span class={ROLE_MATRIX.stakeholder} aria-hidden="true">S</span>{/if}
													</span>
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							{/if}
						{/each}
						<tr class={EVENT_MATRIX.summaryRow}>
							<th scope="row" class={EVENT_MATRIX.summaryLabel}>Concept Count</th>
							<td class={EVENT_MATRIX.summaryCell}></td>
							{#each matrix.people as person (person.id)}
								{@const count = conceptCount(person.id)}
								<!-- The amber sits on a span: summaryCell already sets a text colour -->
								<td
									class={EVENT_MATRIX.summaryCell}
									title={count > 0 ? undefined : `${person.name} is not linked to a Concept yet.`}
									><span class={count > 0 ? '' : EVENT_MATRIX.countWarning}>{count}</span></td
								>
							{/each}
						</tr>
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

{#if card}
	<div class={EVENT_MATRIX.hoverCard} style="left: {card.x}px; top: {card.y}px;" role="tooltip">
		<p class={EVENT_MATRIX.hoverCardTitle}>{card.title}</p>
		{#each card.lines as line (line.label)}
			<p><span class={EVENT_MATRIX.hoverCardLabel}>{line.label}</span> {line.text}</p>
		{/each}
	</div>
{/if}

{#if detailsNode}
	<DetailsPopup node={detailsNode} {nodes} {cm} onClose={() => (detailsId = null)} />
{/if}
