# The Concept Model Goes Public with a Live Browser Demo

**30 September 2026**

AgileDataGuides today published the Concept Model as a free, open-source app with a live demo that runs in the browser, so data teams can define the core concepts of their business, and how those concepts relate, without installing anything.

## The Problem

Before a team can agree on a metric or design a data model, it has to agree on the things the business is made of. What is a Customer? How does a Subscription relate to an Invoice? Which domain owns a Plan? That conversation usually happens on a whiteboard, and the whiteboard gets wiped. The Concept Model app captured the answers well, but it only lived inside the private Context Plane monorepo, so nobody outside AgileDataGuides could try it. Data leaders who wanted to see what a good concept model looks like had nothing to open.

## The Solution

The Concept Model now has its own public repo at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model), under the MIT licence, and a live demo at [agiledataguides.github.io/concept-model](https://agiledataguides.github.io/concept-model/). The demo opens on the SaaS Revenue Concept Model. It holds 16 concepts, from Prospect and Customer through Subscription, Invoice, and Recurring Revenue, joined by 17 relationships that each carry a cardinality. It adds 7 core business events, from "Prospect Clicks on Ad" to "Customer Renews their Subscription", and 5 domains. It tells the same SaaS revenue story as the Information Product Canvas, Business Event Matrix, Business Glossary, and Data Contract demos, so a visitor who moves between the apps sees one business, not five.

## How It Works

The demo is a static site on GitHub Pages. When a visitor clicks Save, the model is written to their browser's localStorage, and nothing is sent to a server. Teams who want their models as files can clone the repo and run `./start-concept-model.sh`. The installed app saves each model as JSON in the `data/` folder, where Claude Code can read it. Every push to `main` rebuilds the demo, and every pull request runs a typecheck, a production build, and a demo build.

## Key Benefits

- **Zero-install trial** — share a link and the recipient is modelling concepts in seconds
- **A worked example on first open** — a complete SaaS revenue concept model, not a blank canvas
- **Precise definitions** — genus-differentia definitions ("a Customer is a Person that has purchased at least one Subscription") with `@`-mentions that link concepts to each other
- **Private by design** — the demo keeps every model in the visitor's own browser
- **Claude-ready when installed** — models save as plain JSON that an AI assistant can read and reason over

The Concept Model is available now at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model), with a live browser demo at [agiledataguides.github.io/concept-model](https://agiledataguides.github.io/concept-model/).
