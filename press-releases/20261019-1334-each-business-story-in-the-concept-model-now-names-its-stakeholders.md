# Each Business Story in the Concept Model Now Names Its Stakeholders

**19 October 2026**

AgileDataGuides today released Stakeholders on every Business Story in the Concept Model app, so a team records who a story matters to as well as who told it.

## The Problem

Step 3, Capture Business Stories, records each story in the expert's words, and one person who told it. A story rarely matters to one person only. In the SaaS example, the Chief Revenue Officer told the story of a customer cancelling at renewal, and the Finance Analyst and the RevOps Analyst would care about that story too. A reviewer who worked through the app liked that the main person was recorded, and asked to capture the other interested people too, from the people already named in Step 2. Without that, the people a story touches lived only in someone's head.

## The Solution

Each story now has a Stakeholders row under Told by. It shows a chip for every person from Step 2 except the one who told the story. Tick the people the story matters to.

## How It Works

The list is the Step 2 list, so a person is named once and picked anywhere. When the person who told a story changes, the new teller leaves the Stakeholders, so nobody is listed twice. Removing a person in Step 2 takes them off every story, and the confirm message says how many stories list them. The Excel export's Business Stories sheet has a Stakeholders column, and the Turtle and RDF exports carry each Stakeholder and read them back.

## Key Benefits

- **Who a story matters to, on the story**: the teller and the Stakeholders sit together, under the story's title
- **One list of people**: Stakeholders come from Step 2, so names never drift between steps
- **Nothing dangles**: removing a person takes them off every story, after a warning that says how many
- **Goes where the Model goes**: Excel, Turtle and RDF all carry the Stakeholders

Stakeholders on every story are available now in the Concept Model app in the Context Plane monorepo, and they reach the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
