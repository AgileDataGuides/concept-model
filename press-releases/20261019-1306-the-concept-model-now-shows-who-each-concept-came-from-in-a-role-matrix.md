# The Concept Model Now Shows Who Each Concept Came From in a Role Matrix

**19 October 2026**

AgileDataGuides today released the Role Matrix in the Concept Model app, a grid that shows which Subject Matter Experts and Stakeholders each Concept came from.

## The Problem

A Concept Model comes from people. Step 2 names the people in the session and their roles, Step 3 records who told each story and who it matters to, and Step 4 records the stories each Concept came from. So the app knew who stood behind every Concept, but it never showed it in one place. To answer "who do we ask about Invoice?" or "has our Customer Success Manager said anything yet?", you had to open each Concept, read its stories, then open each story to see its teller and its Stakeholders. A Concept that no one had spoken about, or an expert who had told no story yet, stayed out of sight.

## The Solution

The Role Matrix is a new page under the Other menu. Each row is a Concept, under its Domain, and each column is a person, headed by their name or role title, such as Chief Revenue Officer. A cell shows T when the person told a story the Concept came from, and S when they are a Stakeholder of one. Hover a cell to see the stories behind the letters. A People count on each Concept and a Concept Count for each person turn amber at zero, so a Concept no one has spoken about, or a person not linked to any Concept yet, stands out.

## How It Works

The cells only read. Every mark comes from the stories, so to change one you change who told a story or its Stakeholders in Step 3, or the stories a Concept came from in Step 4, and the matrix follows. The columns are everyone with the Subject Matter Expert or Stakeholder role in Step 2, plus anyone else who told a story or is a story Stakeholder. A story's teller is never also counted as its Stakeholder. Click a Concept or a Domain to open its details, and fold a Domain away with its arrow. The SaaS example now gives each story its Stakeholders, including a Customer Success Manager, so the page opens with T, S and both on show.

## Key Benefits

- **Who to ask, at a glance**: every Concept shows the people who told its stories and the people they matter to
- **Gaps stand out**: an amber zero marks a Concept no one has spoken about, or a person not linked to any Concept yet
- **Always true**: the marks come from the stories, so they never drift from Steps 3 and 4
- **One page for the whole session**: Subject Matter Experts and Stakeholders side by side, in the Step 2 order

The Role Matrix is available now in the Concept Model app in the Context Plane monorepo, and it reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
