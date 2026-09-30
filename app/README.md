# Concept Model

Model your core business concepts, the relationships between them, the core business events they take part in, and the domains that own them. The Concept Model captures the fundamental building blocks of your business and how they relate to each other.

An [AgileDataGuides](https://agiledataguides.com/agiledata-templates/) Pattern Template app.

## What It Does

The Concept Model defines the core elements of your business domain:

| Section | Purpose |
|---------|---------|
| **Concepts & Definitions** | Core business concepts (e.g. Customer, Subscription, Invoice), each with a genus-differentia definition |
| **Relationships & Cardinality** | How concepts connect (e.g. Customer *subscribes to* Subscription, 1 : 1..*) |
| **Core Business Events** | Things that happen to concepts (e.g. Customer Subscribes to a Paid Plan) |
| **Domains** | Business domains that group related concepts (e.g. Finance, Sales) |

## Try It Online

**[Launch the Live Demo](https://agiledataguides.github.io/concept-model)** — no install required. The demo runs entirely in your browser. Your data is saved in localStorage and never leaves your device.

The demo includes the *SaaS Revenue Concept Model* example so you can explore the app straight away.

## Install and Run Locally

For full functionality including file-based storage and Claude Code integration, run it locally.

Run `./start-concept-model.sh` from the terminal.

The app starts at [http://localhost:5116](http://localhost:5116).

**Requires**: [Node.js](https://nodejs.org/) 20.19+, 22.12+, or 24+ (not 21 or 23).

## Features

- **Concept canvas** — concepts and definitions on the left, relationships, core business events, and domains on the right
- **Genus-differentia definitions** — "*Customer* is a *Person* that *has purchased at least one Subscription*", with `@`-mentions that link to other concepts
- **Multiple models** — create, switch between, and delete concept models
- **Editing** — double-click a card to open its edit modal; drag the handle to reorder cards
- **Search** — filter the Concepts, Core Business Events, and Domains lists by name once a list holds 5 or more items
- **Save** — writes the model as JSON to `data/` for direct access by Claude or other tools
- **Export JSON / CSV / Excel** — download the model to share. Only the JSON export can be imported back
- **Import JSON** — load a previously exported model as a new model, never overwriting the current one

## Works With Claude

Export your model as JSON and use it with [Claude Code](https://claude.ai/claude-code) or [Claude Chat](https://claude.ai):

- *"Are there any concepts that should be broken down further?"*
- *"Suggest business events I might be missing"*
- *"Which concepts don't belong to a domain yet?"*
- *"Draft a business event matrix based on this concept model"*
- *"Review my concept definitions for overlaps or gaps"*

## Data Storage

**Save** writes concept model files to the `data/` folder as JSON. This only works in dev mode (`npm run dev`) where the server can write to disk. Claude Code can then read these files directly. Unsaved changes are lost when you switch models or reload, so save before you move on.

**Export** downloads files to your browser's downloads folder for sharing or backup.

**Demo mode** (live demo at GitHub Pages): **Save** writes to your browser's localStorage instead of `data/`. Nothing is sent to any server. Your models persist between visits but are private to your browser.

## Security

This app is designed to run locally on your own machine. Do not expose it to the internet or deploy it on a public server. The Save feature writes files directly to your filesystem. There is no user authentication, so anyone who can reach the server can read and overwrite your data.

**Demo mode**: The [live demo](https://agiledataguides.github.io/concept-model) is a static site with no server or backend. All data stays in your browser's localStorage and never leaves your device. There is nothing to attack — no API, no database, no file system access.

If you need to share your work, use the **Export** buttons to download files and share them manually.

## Tech Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) with Svelte 5 runes
- [Tailwind CSS 4](https://tailwindcss.com/)
- TypeScript

## Licensing

- **Code**: [MIT](./LICENSE)
- **Documentation**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
