# Concepts Are Now Glossary Terms by Default

**FOR IMMEDIATE RELEASE**
**Date: 2026-03-28**

## Every concept automatically appears in the Business Glossary through symbolic dual-labelling

**Wellington, New Zealand** — Concepts defined in the Concept Model are now automatically treated as glossary terms when imported into the Context Plane. This is achieved through dual-labelling — a single node carries both `global_concept` and `global_glossary_term` labels — with zero data replication.

### Symbolic Linking, Not Duplication

Rather than creating separate glossary term nodes for each concept, the Concept Model's converter now exports concepts with a comma-separated label: `global_concept,global_glossary_term`. The shared `getNodeLabels()` utility splits on commas, so each node appears in both the Concept Model canvas and the Business Glossary canvas simultaneously.

### Automatic Label Upgrade on Import

When importing a concept model into the Context Plane, the dedup logic checks whether a matching node already exists by any of its global labels. If a `global_concept` node named "Customer" already exists, the import upgrades its label to include `global_glossary_term` rather than creating a duplicate. Existing definitions and properties are preserved.

### Backfilled Across All Models

All existing concept and dimension nodes across every model in the Context Plane were backfilled via API to include the `global_glossary_term` label, ensuring full backward compatibility.

---

**Contact:** Context Plane Team
