# Concept Model Standalone App

**FOR IMMEDIATE RELEASE**
**Date: 2026-03-27**

## A dedicated canvas for modelling business concepts, relationships, and cardinality

**Wellington, New Zealand** — The Concept Model app ships as a standalone tool for defining business concepts and the relationships between them. Running on port 5116, it can be used independently or embedded into the Context Plane as the `canvas_concept_model` view.

### Three-Column Canvas Layout

The canvas organises conceptual domain modelling into three clear zones:

**Concepts & Definitions** (left column, full height) — Each concept displays its name, Aristotelian definition, and description. Hover tooltips surface the full details without requiring a click. Double-click to edit names inline, or use the edit modal for richer updates including aliases.

**Relationships & Cardinality** (top right) — A structured table showing From, Relationship, To, and Cardinality columns. At a glance you can see how concepts connect — for example, "Customer places Order (1:M)".

**Core Business Events, Core Business Processes & Domains** (bottom right, 3 columns) — Captures the events, processes, and domains that concepts participate in. All are global entity types shared across the monorepo.

### Aristotelian Definitions

Every concept supports a structured definition following the genus-differentia pattern: "[Concept] is a [broader category] that [distinguishing feature]". The definition category field offers typeahead suggestions from other concepts, while the differentiator field supports @mention linking to glossary terms rendered as orange pills.

### Drag-and-Drop Reordering

All four entity lists — concepts, events, processes, and domains — support drag-and-drop reordering with order persistence. Grab the drag handle and drop to reorder items within each section.

### Full CRUD with Inline Editing

Every entity supports create, read, update, and delete. Names can be edited inline with a double-click. The concept edit modal provides richer editing: name, definition (category + differentiator with @mention), description, and comma-separated aliases.

### Model Switcher and JSON Import/Export

The model switcher lets you maintain multiple concept models and switch between them. Export any model to JSON for backup or sharing. Import auto-detects the file format.

### Entity Types

- `global_concept` — Business concepts with definitions and aliases
- `global_core_business_event` — Core business events (Subject Verb Object pattern)
- `global_core_business_process` — Core business processes
- `global_domain` — Business domains

All global types are deduplicated by name (case-insensitive) when imported into the Context Plane.

---

**Contact:** Context Plane Team
