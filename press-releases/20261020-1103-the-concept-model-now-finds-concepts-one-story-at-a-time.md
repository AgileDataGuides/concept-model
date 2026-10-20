# The Concept Model Now Finds Concepts One Story at a Time

**20 October 2026**

AgileDataGuides today released a By story view for Step 4 of the Concept Model app, so a team reads one Business Story at a time, picks its nouns straight from the text, and sees which Concepts each story already names.

## The Problem

Step 4, Identify the Concepts, showed a story drop-down on one side and every Concept, grouped by Domain, on the other. A reviewer who worked through the app asked to be guided through it: choose the story being modelled, run through that one, then move to another story, with a way to add new Concepts or add existing ones. In a real session the nouns are in the story text, but the only way to add one was to read it and type it again into a field, and nothing on screen showed which nouns had already been captured.

## The Solution

Step 4 now opens on By story. One story shows at a time, with Previous story, Next story and a story picker. Every Concept the story names is marked in the text: solid blue when it is already in this story, and a light box when it is a Concept that is not in this story yet. Select a noun in the story to add it as a Concept, linked to that story and placed in the chosen Domain. Beside the story sits the list of its Concepts, with a search that finds an existing Concept or creates a new one, each Concept's Domain, and Remove, which takes it out of the story and keeps the Concept.

## How It Works

The marks match a Concept's name, its aliases and a simple plural, the same way the Definitions tab links Concepts. Selecting words that name an existing Concept offers Link to story instead of a new Concept. Clicking a boxed word opens the Concept's Details with Link to story at the top, which links it straight away. The old grouped list stays one click away as All Concepts, and the app remembers which view each browser last used.

## Key Benefits

- **One story at a time**: the page walks the stories the way the Blue Book reads them
- **Underline the nouns on screen**: select a word in the story to add it, with no retyping
- **See what is left**: a light box marks each Concept the story names that is not in the story yet
- **New or existing, one search**: find a Concept by name, or type a new one to create it
- **Nothing lost**: All Concepts keeps the grouped list for a view of the whole Model

The By story view is available now in the Concept Model app in the Context Plane monorepo, and it reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
