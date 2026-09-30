// Drag-and-Drop Reordering (DESIGN_SYSTEM.md § Drag-and-Drop Reordering) as
// one reusable piece: native HTML5 drag from a grip, a blue line where the
// item will land, and the dragged row faded. The caller writes the new order.

import { DRAG_REORDER } from '$lib/ui/tokens';

export type DropPosition = 'before' | 'after';

/**
 * `onMove` gets the dragged id, the id it was dropped on, and which side.
 * `canDrop` limits where an item may land (Step 4 keeps a Concept in its
 * own Domain group).
 */
export function createReorder(
	onMove: (dragId: string, targetId: string, position: DropPosition) => unknown,
	canDrop: (dragId: string, targetId: string) => boolean = () => true
) {
	let dragId = $state<string | null>(null);
	let dropTargetId = $state<string | null>(null);
	let dropPosition = $state<DropPosition>('before');

	function clear() {
		dragId = null;
		dropTargetId = null;
		dropPosition = 'before';
	}

	return {
		/** On the grip's dragstart. */
		start(e: DragEvent, id: string) {
			dragId = id;
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', id);
			}
		},
		/** On each row's dragover: the top half drops before it, the bottom half after. */
		over(e: DragEvent, targetId: string) {
			if (!dragId || dragId === targetId || !canDrop(dragId, targetId)) return;
			e.preventDefault();
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			dropPosition = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
			dropTargetId = targetId;
		},
		/** On each row's drop. */
		async drop(e: DragEvent) {
			e.preventDefault();
			const from = dragId;
			const to = dropTargetId;
			const position = dropPosition;
			clear();
			if (from && to && from !== to) await onMove(from, to, position);
		},
		/** On the grip's dragend, so a drop outside any row leaves nothing behind. */
		end: clear,
		/** A row's classes: faded while it is dragged, a blue line on the side the drop will land. */
		rowClass(id: string): string {
			if (dragId === id) return `${DRAG_REORDER.row} ${DRAG_REORDER.dragging}`;
			if (dropTargetId === id) return `${DRAG_REORDER.row} ${dropPosition === 'before' ? DRAG_REORDER.dropBefore : DRAG_REORDER.dropAfter}`;
			return DRAG_REORDER.row;
		}
	};
}
