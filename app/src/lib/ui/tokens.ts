// Class strings from design/tokens.md, for the Steps, Map and Definitions views.
//
// tokens.md is the authority: if this file and tokens.md ever disagree,
// tokens.md wins and this file is stale. The app keeps its own copy because
// the public repo does not bundle @context-plane/shared/design-tokens.

export const BUTTON = {
	/** buttons.secondary_slate */
	secondary: 'px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors',
	/** buttons.success_create_outlined */
	add: 'px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 transition-colors',
	/** buttons.primary_save.class_clean, the Disabled Buttons pattern */
	disabled: 'px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-slate-300 border border-slate-200 cursor-not-allowed'
};

export const INPUT = {
	/** form_inputs.text */
	text: 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none',
	/** form_inputs.select */
	select: 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white',
	/** form_inputs.textarea */
	textarea: 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none',
	/** form_inputs.label_small */
	label: 'block text-[10px] font-medium text-slate-500 mb-1',
	/** form_inputs.edit_inline_input */
	inline: 'text-sm text-slate-700 px-1 border border-blue-400 rounded outline-none'
};

export const TYPE = {
	/** typography.label_table_header */
	sectionHeader: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500',
	/** typography.placeholder_italic_unset */
	placeholder: 'text-slate-300 italic',
	/** typography.card_title */
	cardTitle: 'text-xs font-medium text-slate-800 leading-tight'
};

/** cards.default */
export const CARD = 'bg-white rounded-lg shadow-sm border border-slate-200';

/** cards.list_divider, added to a card that holds a list of rows */
export const CARD_LIST_DIVIDER = 'divide-y divide-slate-100';

/** interactions.click_to_edit_hover */
export const CLICK_TO_EDIT = 'hover:bg-slate-50';

export const STEP_RAIL = {
	container: 'w-72 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto',
	row: 'w-full text-left flex items-start gap-2 px-3 py-2 border-l-2 transition-colors',
	rowActive: 'bg-white border-blue-600',
	rowInactive: 'border-transparent hover:bg-slate-100',
	labelActive: 'text-xs font-semibold text-slate-800',
	labelInactive: 'text-xs font-medium text-slate-600',
	status: 'text-[10px] text-slate-400 leading-tight',
	statusSkipped: 'text-[10px] text-slate-400 italic leading-tight',
	dotStarted: 'mt-1 w-2 h-2 shrink-0 rounded-full bg-slate-600',
	dotEmpty: 'mt-1 w-2 h-2 shrink-0 rounded-full border border-slate-300',
	dotSkipped: 'mt-1.5 w-2 h-0.5 shrink-0 rounded bg-slate-400',
	/** The same rows as a list picker inside a panel (Step 5). */
	listContainer: 'rounded-lg border border-slate-200 bg-slate-50 overflow-hidden'
};

export const STEP_PANEL = {
	label: 'text-xs font-semibold text-slate-500',
	question: 'text-base font-semibold text-slate-800',
	description: 'text-xs text-slate-500 leading-relaxed',
	readMore: 'text-xs text-blue-600 hover:underline',
	body: 'px-6 py-5',
	/** The header over the Map in Step 9. */
	bodyTop: 'px-6 pt-5'
};

export const CHOICE_CHIPS = {
	wrapper: 'inline-flex flex-wrap gap-1',
	base: 'px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors',
	active: 'bg-blue-50 text-blue-700 border-blue-300',
	inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50',
	/** A multi-pick at its limit (the Disabled Buttons pattern). */
	disabled: 'bg-white text-slate-300 border-slate-200 cursor-not-allowed',
	/** Added to base + active for a chip that can be taken off. */
	removable: 'inline-flex items-center gap-1',
	removeButton: 'rounded text-blue-400 hover:text-blue-700 transition-colors',
	/** Heroicons outline x-mark, sized to the chip text. */
	removeIcon: 'w-3 h-3'
};

export const STATE_CHIPS = {
	base: 'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border',
	neutral: 'bg-slate-50 text-slate-600 border-slate-200',
	positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
	warning: 'bg-amber-50 text-amber-700 border-amber-200'
};

export type StateTone = 'neutral' | 'positive' | 'warning';

export const HINT = {
	quiet: 'flex items-start gap-1.5 text-[11px] text-slate-500 leading-snug',
	icon: 'w-3.5 h-3.5 shrink-0 mt-px text-slate-400'
};

export const ROW_ACTIONS = {
	neutral: 'text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors',
	danger: 'text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors'
};

export const TIER3_TABS = {
	wrapper: 'flex items-center px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
	active: 'text-blue-600 border-blue-600',
	inactive: 'text-slate-400 border-transparent hover:text-slate-600'
};

export const TOGGLE_SWITCH = {
	wrapper: 'relative inline-flex items-center gap-1.5 shrink-0 pl-1 pr-2 py-0.5 rounded-md hover:bg-slate-50 transition-colors',
	track: 'relative inline-block h-4 w-7 rounded-full transition-colors',
	trackActive: 'bg-blue-600',
	trackInactive: 'bg-slate-300',
	knob: 'absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
	knobActive: 'translate-x-3',
	knobInactive: 'translate-x-0',
	label: 'text-[11px] text-slate-600 select-none'
};

/** The empty state for a list the user fills (DESIGN_SYSTEM.md § 15, with its hint exception). */
export const EMPTY_HINT = 'text-[10px] text-slate-300 italic';

/** tokens.md search_filter (DESIGN_SYSTEM.md § 14), shown at 5 or more items and while a query is typed. */
export const SEARCH_FILTER = {
	wrapper: 'mt-1 relative',
	icon: 'absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none',
	input: 'w-full pl-6 pr-6 py-1 text-[11px] border rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none',
	clear: 'absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]',
	/** The list shows a search field from this many items. */
	threshold: 5
};

/** tokens.md drag_reorder (DESIGN_SYSTEM.md § Drag-and-Drop Reordering). */
export const DRAG_REORDER = {
	grip: 'inline-flex items-center justify-center w-5 shrink-0 text-[10px] text-slate-400 hover:text-slate-600 cursor-grab select-none',
	row: 'relative group/drag',
	dragging: 'opacity-30',
	dropBefore: 'border-t-2 border-t-blue-500',
	dropAfter: 'border-b-2 border-b-blue-500'
};

/**
 * tokens.md concept_map: the Map in the Blue Book's style. The hex values
 * are the book's own, not entity colours (DESIGN_SYSTEM.md § 18).
 */
export const CONCEPT_MAP = {
	canvas: 'bg-white',
	note: { size: 88, fill: '#a8d8ff', rx: 1, tiltMaxDeg: 3 },
	noteShadow: { dx: 1.5, dy: 2, blur: 2, color: '#000000', opacity: 0.25 },
	noteFold: { fill: '#9ac7eb', size: 17 },
	notePin: { fill: '#666666', r: 3 },
	noteLabel: { fontFamily: "'Caveat Brush', 'Comic Sans MS', cursive", fill: '#2a2a2a', sizeMax: 20, sizeMin: 11, maxLines: 3 },
	domainCard: { fill: '#fbf8ef', stroke: '#d8d2c4', strokeWidth: 1.2, rx: 3, opacity: 0.2, tiltMaxDeg: 0.8 },
	domainShadow: { dx: 1, dy: 3, blur: 3, color: '#3c321e', opacity: 0.3 },
	domainTape: { fill: '#e8dcb4', width: 70, height: 22 },
	domainRule: { stroke: '#4ca5dc', strokeWidth: 1.5 },
	domainTitle: { fontFamily: "'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', cursive", fontWeight: 700, size: 22, fill: '#33302a', opacity: 0.45 },
	relationshipLine: { stroke: '#1bb31b', strokeWidth: 1.5, bend: 0.12 },
	relationshipLabel: { fontFamily: "'Caveat Brush', 'Comic Sans MS', cursive", size: 13, fill: '#2a2a2a', backing: '#ffffff', backingOpacity: 0.85, rx: 3 },
	selected: { noteStroke: '#4ca5dc', noteStrokeWidth: 2, diamondStrokeWidth: 2.5, sheetStroke: '#4ca5dc', sheetStrokeWidth: 2 }
};
