<script lang="ts">
	import type { DataAdapter, ContextNode, ContextLink } from '$lib/cp-shared';
	import { getContext } from 'svelte';
	import { getNodeLabels } from '$lib/cp-shared';
	import ConceptCardEditModal from '$lib/components/canvas/ConceptCardEditModal.svelte';

	let {
		nodes,
		links = [],
		onSelectNode,
		onAddNode,
		onAddExisting
	}: {
		nodes: ContextNode[];
		links?: ContextLink[];
		onSelectNode: (id: string) => void;
		onAddNode: (entityLabel: string, name: string) => void;
		onAddExisting?: (entityLabel: string) => void;
	} = $props();

	const adapter = getContext<DataAdapter>('dataAdapter');

	// ── Derived: group by label ──
	const byLabel = $derived.by(() => {
		const map: Record<string, ContextNode[]> = {};
		for (const node of nodes) {
			for (const label of getNodeLabels(node)) {
				if (!map[label]) map[label] = [];
				map[label].push(node);
			}
		}
		return map;
	});

	const get = (label: string) => byLabel[label] || [];

	// Node lookup for resolving link endpoints
	const nodeMap = $derived.by(() => {
		const map: Record<string, ContextNode> = {};
		for (const node of nodes) map[node.id] = node;
		return map;
	});

	// Links between conceptual model nodes only
	const conceptualLinks = $derived.by(() => {
		const conceptLabels = ['global_concept', 'global_core_business_event', 'global_core_business_process'];
		const conceptNodeIds = new Set(
			nodes.filter((n) => getNodeLabels(n).some((l) => conceptLabels.includes(l))).map((n) => n.id)
		);
		return links.filter((l) => conceptNodeIds.has(l.source_id) && conceptNodeIds.has(l.destination_id));
	});

	// ── Inline add state ──
	let addingConcept = $state(false);
	let newConceptName = $state('');
	let addingEvent = $state(false);
	let newEventName = $state('');
	let addingDomain = $state(false);
	let newDomainName = $state('');

	// ── Inline edit state ──
	let editingNodeId = $state<string | null>(null);
	let editingNodeName = $state('');

	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function submitAdd(label: string, name: string, resetFn: () => void) {
		const trimmed = name.trim();
		if (!trimmed) { resetFn(); return; }
		onAddNode(label, trimmed);
		resetFn();
	}

	async function handleNameChange(nodeId: string, newName: string) {
		const trimmed = newName.trim();
		if (!trimmed) { editingNodeId = null; return; }
		await adapter.updateNode(nodeId, { name: trimmed });
		editingNodeId = null;
	}

	async function handleRemoveNode(nodeId: string) {
		await adapter.deleteNode(nodeId);
	}

	// ── Tooltip state ──
	let tooltipNodeId = $state<string | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;

	function showTooltip(id: string, el: HTMLElement) {
		if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
		const r = el.getBoundingClientRect();
		tooltipX = r.left + r.width / 2;
		tooltipY = r.bottom;
		tooltipNodeId = id;
	}
	function scheduleHide() { hideTimeout = setTimeout(() => { tooltipNodeId = null; }, 200); }
	function cancelHide() { if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; } }

	const tooltipNode = $derived(tooltipNodeId ? nodes.find((n) => n.id === tooltipNodeId) : null);

	// ── Edit modal — delegated to the shared ConceptCardEditModal. This
	// layout only tracks which node is open; field state, autocomplete +
	// save/delete all live inside the shared component.
	let editModalId = $state<string | null>(null);
	const editModalNode = $derived(editModalId ? nodes.find((n) => n.id === editModalId) : null);

	function openEditModal(id: string) {
		editModalId = id;
		tooltipNodeId = null;
	}

	// ── Drag-and-drop reordering ──
	let dragType = $state<'concept' | 'event' | 'process' | 'domain' | null>(null);
	let dragId = $state<string | null>(null);
	let dropTargetId = $state<string | null>(null);
	let dropPosition = $state<'before' | 'after'>('before');

	function clearDragState() {
		dragType = null;
		dragId = null;
		dropTargetId = null;
		dropPosition = 'before';
	}

	function handleDragStart(e: DragEvent, type: 'concept' | 'event' | 'process' | 'domain', id: string) {
		dragType = type;
		dragId = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
		}
	}

	function handleDragOverRow(e: DragEvent, targetId: string, allowedType: 'concept' | 'event' | 'process' | 'domain') {
		if (dragType !== allowedType || dragId === targetId) return;
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		dropPosition = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
		dropTargetId = targetId;
	}

	async function handleDrop(e: DragEvent, items: ContextNode[]) {
		e.preventDefault();
		if (!dragId || !dropTargetId || dragId === dropTargetId) { clearDragState(); return; }
		const sorted = [...items];
		const dragIdx = sorted.findIndex((n) => n.id === dragId);
		let dropIdx = sorted.findIndex((n) => n.id === dropTargetId);
		if (dragIdx === -1 || dropIdx === -1) { clearDragState(); return; }
		const [moved] = sorted.splice(dragIdx, 1);
		dropIdx = sorted.findIndex((n) => n.id === dropTargetId);
		const insertIdx = dropPosition === 'after' ? dropIdx + 1 : dropIdx;
		sorted.splice(insertIdx, 0, moved);
		for (let i = 0; i < sorted.length; i++) {
			const node = sorted[i];
			const newOrder = i + 1;
			if ((node.properties?.order as number) !== newOrder) {
				await adapter.updateNode(node.id, { properties: { ...node.properties, order: newOrder } });
			}
		}
		clearDragState();
	}

	const sortedConcepts = $derived(
		[...get('global_concept')].sort((a, b) => ((a.properties?.order as number) || 0) - ((b.properties?.order as number) || 0))
	);
	const sortedEvents = $derived(
		[...get('global_core_business_event')].sort((a, b) => ((a.properties?.order as number) || 0) - ((b.properties?.order as number) || 0))
	);
	const sortedDomains = $derived(
		[...get('global_domain')].sort((a, b) => ((a.properties?.order as number) || 0) - ((b.properties?.order as number) || 0))
	);

	// ── Search filters ──
	let conceptSearchQuery = $state('');
	let eventSearchQuery = $state('');
	let domainSearchQuery = $state('');

	const filteredConcepts = $derived.by(() => {
		const q = conceptSearchQuery.toLowerCase().trim();
		if (!q) return sortedConcepts;
		return sortedConcepts.filter((n) => n.name.toLowerCase().includes(q));
	});
	const filteredEvents = $derived.by(() => {
		const q = eventSearchQuery.toLowerCase().trim();
		if (!q) return sortedEvents;
		return sortedEvents.filter((n) => n.name.toLowerCase().includes(q));
	});
	const filteredDomains = $derived.by(() => {
		const q = domainSearchQuery.toLowerCase().trim();
		if (!q) return sortedDomains;
		return sortedDomains.filter((n) => n.name.toLowerCase().includes(q));
	});

</script>

<div class="w-full h-full p-3 overflow-auto bg-slate-50">
	<div class="grid grid-cols-3 grid-rows-[1fr_auto] gap-2 h-[calc(100%-0.5rem)]">
		<!-- Left: Concepts with definitions (1 col, full height) -->
		<div class="row-span-2 flex flex-col h-full rounded-lg border overflow-hidden" style="border-color: #e11d4830;">
			<div class="px-3 py-1.5 shrink-0" style="background-color: #e11d4812;">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold uppercase tracking-wider" style="color: #e11d48">
						Concepts &amp; Definitions
					</span>
					<div class="flex items-center gap-1.5">
						<span class="text-[10px] text-slate-400">{get('global_concept').length}</span>
						{#if onAddExisting}
							<button
								onclick={() => onAddExisting('global_concept')}
								class="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
								style="color: #e11d48"
								title="Add existing concept"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
									<path d="M1 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4ZM10 1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V1ZM6.5 3.5a2.5 2.5 0 0 0-5 0v.006c0 .07.003.14.009.209l2.86 2.86a2.5 2.5 0 0 0 2.122-2.404L6.5 3.5ZM9.5 12.5a2.5 2.5 0 0 0 5 0v-.006a2.52 2.52 0 0 0-.009-.209l-2.86-2.86a2.5 2.5 0 0 0-2.122 2.404l-.009.671Z" />
								</svg>
							</button>
						{/if}
						<button
							onclick={() => { addingConcept = true; newConceptName = ''; }}
							class="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
							style="color: #e11d48"
							title="Add Concept"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
								<path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
							</svg>
						</button>
					</div>
				</div>

				{#if addingConcept}
					<div class="mt-1">
						<input
							use:autofocus
							bind:value={newConceptName}
							onkeydown={(e) => { if (e.key === 'Enter') submitAdd('global_concept', newConceptName, () => { addingConcept = false; newConceptName = ''; }); if (e.key === 'Escape') { addingConcept = false; } }}
							onblur={() => submitAdd('global_concept', newConceptName, () => { addingConcept = false; newConceptName = ''; })}
							type="text"
							placeholder="Concept name..."
							class="w-full px-2 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none"
							style="border-color: #e11d4840;"
						/>
					</div>
				{/if}
				{#if get('global_concept').length >= 5}
					<div class="mt-1 relative">
						<svg class="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
						<input bind:value={conceptSearchQuery} type="text" placeholder="Search concepts..." class="w-full pl-6 pr-6 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none" style="border-color: #e11d4830;" />
						{#if conceptSearchQuery}
							<button onclick={() => (conceptSearchQuery = '')} class="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]">✕</button>
						{/if}
					</div>
				{/if}
			</div>
			<div class="flex-1 overflow-y-auto p-2 space-y-2" style="background-color: #e11d4804;">
				{#each filteredConcepts as node (node.id)}
					<div
						class="flex items-stretch {dragId === node.id && dragType === 'concept' ? 'opacity-30' : ''} {dropTargetId === node.id && dragType === 'concept' ? (dropPosition === 'before' ? 'border-t-2 border-t-blue-500' : 'border-b-2 border-b-blue-500') : ''}"
						onmouseenter={(e) => showTooltip(node.id, e.currentTarget as HTMLElement)}
						onmouseleave={() => scheduleHide()}
						ondragover={(e) => handleDragOverRow(e, node.id, 'concept')}
						ondrop={(e) => handleDrop(e, sortedConcepts)}
					>
						{#if filteredConcepts.length > 1}
							<span
								class="inline-flex items-center justify-center w-5 shrink-0 text-[10px] text-slate-400 hover:text-slate-600 cursor-grab select-none"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, 'concept', node.id)}
								ondragend={clearDragState}
								role="img"
								aria-label="Drag to reorder"
							>⠿</span>
						{/if}
						<div class="flex-1 min-w-0 p-2.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50/30 transition-colors relative group">
						{#if editingNodeId === node.id}
							<input
								use:autofocus
								type="text"
								bind:value={editingNodeName}
								onblur={() => handleNameChange(node.id, editingNodeName)}
								onkeydown={(e) => { if (e.key === 'Enter') handleNameChange(node.id, editingNodeName); if (e.key === 'Escape') { editingNodeId = null; } }}
								class="text-xs font-semibold px-1 py-0.5 border border-rose-400 rounded outline-none w-full"
							/>
						{:else}
							<button
								type="button"
								class="w-full text-left cursor-pointer bg-transparent border-0 p-0"
								onclick={() => onSelectNode(node.id)}
								ondblclick={() => openEditModal(node.id)}
							>
								<div class="text-xs font-semibold text-slate-800">{node.name}</div>
								{#if node.properties?.definitionCategory || node.properties?.definitionDifferentiator}
									<div class="text-[11px] text-slate-600 mt-1 leading-relaxed">
										<span class="font-medium">{node.name}</span> is a <span class="text-orange-700 font-medium">{node.properties.definitionCategory || '…'}</span> that {#each ((node.properties.definitionDifferentiator as string) || '…').split(/(@\{[^}]+\})/) as segment}{#if segment.startsWith('@{') && segment.endsWith('}')}<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 border border-orange-200">{segment.slice(2, -1)}</span>{:else}<span class="text-orange-700 font-medium">{segment}</span>{/if}{/each}
									</div>
								{:else}
									<div class="text-[11px] text-slate-300 italic mt-1">No definition yet — double-click to add</div>
								{/if}
							</button>
						{/if}
						<button
							class="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-4 h-4 text-[10px] text-red-400 hover:text-white hover:bg-red-500 rounded"
							title="Remove concept"
							onclick={() => handleRemoveNode(node.id)}
						>x</button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center h-full">
						<span class="text-[10px] text-slate-300 italic">No concepts yet</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Right top: Relationships between concepts (2 cols) -->
		<div class="col-span-2 flex flex-col h-full rounded-lg border overflow-hidden" style="border-color: #6366f130;">
			<div class="px-3 py-1.5 shrink-0" style="background-color: #6366f112;">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold uppercase tracking-wider" style="color: #6366f1">
						Relationships &amp; Cardinality
					</span>
					<span class="text-[10px] text-slate-400">{conceptualLinks.length}</span>
				</div>
			</div>
			<div class="flex-1 overflow-y-auto p-2" style="background-color: #6366f104;">
				{#if conceptualLinks.length > 0}
					<table class="w-full">
						<thead>
							<tr class="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
								<th class="text-left py-1.5 px-2 font-medium">From</th>
								<th class="text-left py-1.5 px-2 font-medium">Relationship</th>
								<th class="text-left py-1.5 px-2 font-medium">To</th>
								<th class="text-left py-1.5 px-2 font-medium">Cardinality</th>
							</tr>
						</thead>
						<tbody>
							{#each conceptualLinks as link (link.id)}
								{@const source = nodeMap[link.source_id]}
								{@const target = nodeMap[link.destination_id]}
								<tr class="border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-colors"
									onclick={() => onSelectNode(link.id)}
								>
									<td class="py-1.5 px-2 text-[11px] font-medium text-slate-700">{source?.name ?? '?'}</td>
									<td class="py-1.5 px-2 text-[11px] text-indigo-600 font-medium">{link.label}</td>
									<td class="py-1.5 px-2 text-[11px] font-medium text-slate-700">{target?.name ?? '?'}</td>
									<td class="py-1.5 px-2 text-[11px] text-slate-500">
										{#if link.properties?.cardinality}
											{link.properties.cardinality}
										{:else}
											<span class="text-slate-300 italic">not set</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<div class="flex items-center justify-center h-full">
						<span class="text-[10px] text-slate-300 italic">No relationships yet — add links between concepts</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Bottom: Core Business Events + Domains (2 cols, spanning the right two columns).
		     Core Business Processes panel was removed — the data model field remains
		     (ConceptModel.coreBusinessProcesses) so existing imports don't break, but
		     the UI surface for editing them is gone. -->
		<div class="col-span-2 grid grid-cols-2 gap-2">
			<!-- Core Business Events -->
			<div class="flex flex-col rounded-lg border overflow-hidden" style="border-color: #be123c30;">
				<div class="px-3 py-1.5 shrink-0" style="background-color: #be123c12;">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-bold uppercase tracking-wider" style="color: #be123c">Core Business Events</span>
						<div class="flex items-center gap-1.5">
							<span class="text-[10px] text-slate-400">{get('global_core_business_event').length}</span>
							<button
								onclick={() => { addingEvent = true; newEventName = ''; }}
								class="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
								style="color: #be123c"
								title="Add Core Business Event"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
									<path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
								</svg>
							</button>
						</div>
					</div>
					{#if addingEvent}
						<div class="mt-1">
							<input
								use:autofocus
								bind:value={newEventName}
								onkeydown={(e) => { if (e.key === 'Enter') submitAdd('global_core_business_event', newEventName, () => { addingEvent = false; newEventName = ''; }); if (e.key === 'Escape') { addingEvent = false; } }}
								onblur={() => submitAdd('global_core_business_event', newEventName, () => { addingEvent = false; newEventName = ''; })}
								type="text"
								placeholder="e.g. Customer Orders Product"
								class="w-full px-2 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none"
								style="border-color: #be123c40;"
							/>
						</div>
					{/if}
					{#if get('global_core_business_event').length >= 5}
						<div class="mt-1 relative">
							<svg class="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
							<input bind:value={eventSearchQuery} type="text" placeholder="Search..." class="w-full pl-6 pr-6 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none" style="border-color: #be123c30;" />
							{#if eventSearchQuery}
								<button onclick={() => (eventSearchQuery = '')} class="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]">✕</button>
							{/if}
						</div>
					{/if}
				</div>
				<div class="flex-1 overflow-y-auto p-2 space-y-1.5" style="background-color: #be123c04;">
					{#each filteredEvents as node (node.id)}
						<div
							class="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50/30 transition-colors group relative {dragId === node.id && dragType === 'event' ? 'opacity-30' : ''} {dropTargetId === node.id && dragType === 'event' ? (dropPosition === 'before' ? 'border-t-2 border-t-blue-500' : 'border-b-2 border-b-blue-500') : ''}"
							ondragover={(e) => handleDragOverRow(e, node.id, 'event')}
							ondrop={(e) => handleDrop(e, sortedEvents)}
						>
							<span
								class="inline-flex items-center justify-center w-5 shrink-0 text-[10px] text-slate-400 hover:text-slate-600 cursor-grab select-none"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, 'event', node.id)}
								ondragend={clearDragState}
								role="img"
								aria-label="Drag to reorder"
							>⠿</span>
							<span class="w-2 h-2 rounded-sm shrink-0" style="background-color: #be123c;"></span>
							{#if editingNodeId === node.id}
								<input
									use:autofocus
									type="text"
									bind:value={editingNodeName}
									onblur={() => handleNameChange(node.id, editingNodeName)}
									onkeydown={(e) => { if (e.key === 'Enter') handleNameChange(node.id, editingNodeName); if (e.key === 'Escape') { editingNodeId = null; } }}
									class="text-[11px] font-medium px-1 py-0.5 border border-rose-400 rounded outline-none flex-1"
								/>
							{:else}
								<button type="button" class="text-[11px] font-medium text-slate-700 cursor-default bg-transparent border-0 p-0 text-left flex-1"
									ondblclick={() => openEditModal(node.id)}
								>{node.name}</button>
							{/if}
							<button
								class="hidden group-hover:flex items-center justify-center w-4 h-4 text-[10px] text-red-400 hover:text-white hover:bg-red-500 rounded shrink-0"
								title="Remove"
								onclick={() => handleRemoveNode(node.id)}
							>x</button>
						</div>
					{:else}
						<div class="flex items-center justify-center h-full py-4">
							<span class="text-[10px] text-slate-300 italic">No core events yet</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Domains -->
			<div class="flex flex-col rounded-lg border overflow-hidden" style="border-color: #7c3aed30;">
				<div class="px-3 py-1.5 shrink-0" style="background-color: #7c3aed12;">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-bold uppercase tracking-wider" style="color: #7c3aed">Domains</span>
						<div class="flex items-center gap-1.5">
							<span class="text-[10px] text-slate-400">{get('global_domain').length}</span>
							{#if onAddExisting}
								<button
									onclick={() => onAddExisting('global_domain')}
									class="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
									style="color: #7c3aed"
									title="Add existing domain"
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
										<path d="M1 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4ZM10 1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V1ZM6.5 3.5a2.5 2.5 0 0 0-5 0v.006c0 .07.003.14.009.209l2.86 2.86a2.5 2.5 0 0 0 2.122-2.404L6.5 3.5ZM9.5 12.5a2.5 2.5 0 0 0 5 0v-.006a2.52 2.52 0 0 0-.009-.209l-2.86-2.86a2.5 2.5 0 0 0-2.122 2.404l-.009.671Z" />
									</svg>
								</button>
							{/if}
							<button
								onclick={() => { addingDomain = true; newDomainName = ''; }}
								class="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
								style="color: #7c3aed"
								title="Add Domain"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
									<path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
								</svg>
							</button>
						</div>
					</div>
					{#if addingDomain}
						<div class="mt-1">
							<input
								use:autofocus
								bind:value={newDomainName}
								onkeydown={(e) => { if (e.key === 'Enter') submitAdd('global_domain', newDomainName, () => { addingDomain = false; newDomainName = ''; }); if (e.key === 'Escape') { addingDomain = false; } }}
								onblur={() => submitAdd('global_domain', newDomainName, () => { addingDomain = false; newDomainName = ''; })}
								type="text"
								placeholder="e.g. Sales, Finance"
								class="w-full px-2 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none"
								style="border-color: #7c3aed40;"
							/>
						</div>
					{/if}
					{#if get('global_domain').length >= 5}
						<div class="mt-1 relative">
							<svg class="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
							<input bind:value={domainSearchQuery} type="text" placeholder="Search..." class="w-full pl-6 pr-6 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none" style="border-color: #7c3aed30;" />
							{#if domainSearchQuery}
								<button onclick={() => (domainSearchQuery = '')} class="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]">✕</button>
							{/if}
						</div>
					{/if}
				</div>
				<div class="flex-1 overflow-y-auto p-2 space-y-1.5" style="background-color: #7c3aed04;">
					{#each filteredDomains as node (node.id)}
						<div
							class="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 hover:border-violet-300 bg-white hover:bg-violet-50/30 transition-colors group relative {dragId === node.id && dragType === 'domain' ? 'opacity-30' : ''} {dropTargetId === node.id && dragType === 'domain' ? (dropPosition === 'before' ? 'border-t-2 border-t-blue-500' : 'border-b-2 border-b-blue-500') : ''}"
							ondragover={(e) => handleDragOverRow(e, node.id, 'domain')}
							ondrop={(e) => handleDrop(e, sortedDomains)}
						>
							<span
								class="inline-flex items-center justify-center w-5 shrink-0 text-[10px] text-slate-400 hover:text-slate-600 cursor-grab select-none"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, 'domain', node.id)}
								ondragend={clearDragState}
								role="img"
								aria-label="Drag to reorder"
							>⠿</span>
							<span class="w-2 h-2 rounded-sm shrink-0" style="background-color: #7c3aed;"></span>
							{#if editingNodeId === node.id}
								<input
									use:autofocus
									type="text"
									bind:value={editingNodeName}
									onblur={() => handleNameChange(node.id, editingNodeName)}
									onkeydown={(e) => { if (e.key === 'Enter') handleNameChange(node.id, editingNodeName); if (e.key === 'Escape') { editingNodeId = null; } }}
									class="text-[11px] font-medium px-1 py-0.5 border border-violet-400 rounded outline-none flex-1"
								/>
							{:else}
								<button type="button" class="text-[11px] font-medium text-slate-700 cursor-default bg-transparent border-0 p-0 text-left flex-1"
									ondblclick={() => openEditModal(node.id)}
								>{node.name}</button>
							{/if}
							<button
								class="hidden group-hover:flex items-center justify-center w-4 h-4 text-[10px] text-red-400 hover:text-white hover:bg-red-500 rounded shrink-0"
								title="Remove"
								onclick={() => handleRemoveNode(node.id)}
							>x</button>
						</div>
					{:else}
						<div class="flex items-center justify-center h-full py-4">
							<span class="text-[10px] text-slate-300 italic">No domains yet</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Hover tooltip -->
{#if tooltipNodeId && tooltipNode}
	<div
		class="fixed z-50 w-60"
		style="top: {tooltipY + 4}px; left: {tooltipX - 120}px;"
		onmouseenter={() => cancelHide()}
		onmouseleave={() => scheduleHide()}
	>
		<div class="bg-white border border-rose-200 text-slate-700 text-[11px] font-normal leading-relaxed rounded-lg shadow-lg px-3 py-2.5">
			<div class="font-semibold mb-1 text-rose-600">{tooltipNode.name}</div>
			{#if tooltipNode.properties?.definitionCategory || tooltipNode.properties?.definitionDifferentiator}
				<p class="text-slate-600">
					<span class="font-medium">{tooltipNode.name}</span> is a
					<span class="text-orange-700 font-medium">{tooltipNode.properties.definitionCategory || '...'}</span>
					that <span class="text-orange-700 font-medium">{tooltipNode.properties.definitionDifferentiator || '...'}</span>
				</p>
			{:else if tooltipNode.description}
				<p class="text-slate-600">{tooltipNode.description}</p>
			{:else}
				<p class="text-slate-400 italic">No definition yet — double-click to add.</p>
			{/if}
			{#if (tooltipNode.properties?.aliases as string[] || []).length > 0}
				<div class="mt-1.5 flex flex-wrap gap-1">
					<span class="text-[10px] text-slate-400 uppercase tracking-wider">Aliases:</span>
					{#each (tooltipNode.properties?.aliases as string[]) as alias}
						<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{alias}</span>
					{/each}
				</div>
			{/if}
			<button
				class="mt-2 text-[10px] underline cursor-pointer text-rose-600"
				onclick={() => openEditModal(tooltipNodeId!)}
			>Edit details</button>
		</div>
	</div>
{/if}

<!-- Edit details modal — shared rich popup. Same fields used across BEM Matrix
     + Canvas tabs. Save / delete handled inside the component via the
     DataAdapter from context. -->
{#if editModalNode}
	<ConceptCardEditModal
		node={editModalNode}
		allNodes={nodes}
		onClose={() => (editModalId = null)}
	/>
{/if}
