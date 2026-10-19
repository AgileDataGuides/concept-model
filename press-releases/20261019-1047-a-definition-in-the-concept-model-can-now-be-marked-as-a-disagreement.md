# A Definition in the Concept Model Can Now Be Marked as a Disagreement

**19 October 2026**

AgileDataGuides today released a Disagreement status for Definitions in the Concept Model app, so a team can record that people use the same word for different things, and write down what the disagreement is.

## The Problem

A Definition in the Concept Model had three statuses: Draft, Agreed and Flagged. Flagged meant "this one is hard, come back to it". But the hardest Definitions are not hard because nobody knows the answer. They are hard because two groups each know a different answer. Finance and RevOps can both say "Recurring Revenue" and mean two different numbers. Flagged hid that. The team had to write the disagreement into a special case or a note, where it read like any other detail and was easy to miss.

## The Solution

Disagreement is now the fourth status, with a red chip so it stands apart from Flagged. When a Definition is set to Disagreement, a "What is the disagreement?" field opens under the status, in Step 5 and in the Details popup. The team writes who means what, and where they differ. The Definitions tab shows the disagreement on the Concept's card, under the three parts, and the Step 5 status line counts how many Definitions are in disagreement.

## How It Works

The disagreement text shows only while the status is Disagreement. When the team settles it and moves the Definition to Agreed, the text leaves the screen and the CSV and Excel exports, but it stays in the file, so it can come back if the disagreement opens again. The CSV and Excel exports gain a Disagreement column. The JSON, Turtle and RDF/XML exports carry the whole Model, so they keep the text whatever the status, and Turtle and RDF/XML write it as `cm:definitionDisagreement`, so it round-trips through ontology tools. Both examples now show one. In the Blue Book retail example it is Delivery, where dispatch staff say it happens when the van leaves with the Products and the Retail Operations Manager says it happens when the Products reach the Customer. In the SaaS example it is Recurring Revenue, where Finance and RevOps count it at different moments.

## Key Benefits

- **A disagreement is visible, not buried**: a red chip on the rail and on the Definitions tab shows which words still split the room
- **The reason travels with the Definition**: what each side means is written next to the status, not lost in a note
- **Flagged keeps its meaning**: hard-but-unknown stays amber, two-answers-in-the-room is red, so the team knows which kind of conversation each one needs
- **Nothing is lost when it is settled**: the text is kept if the status moves on

The Disagreement status is available now in the Concept Model app in the Context Plane monorepo, and it reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
