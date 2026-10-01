# Concept Model

The companion app for the Blue Book, an Agile Data Guide to Modeling Business Concepts. Capture a Concept Model with a Subject Matter Expert, eleven steps at a time, then read it as a Concept Map and as Definitions.

A Concept Model describes what we understand about the organisation: the things it cares about (Concepts), how they relate (Relationships) and the moments that matter (Core Business Events), in its own language, written down and agreed.

An [AgileDataGuides](https://agiledataguides.com/agiledata-templates/) Pattern Template app.

## What It Does

| Tab | What it is for |
|---------|---------|
| **Steps** | The eleven Modeling Business Concepts steps, down the left with a status for each. Pick any step to capture what it produces. The steps are a checklist, not a wizard |
| **Map** | The Concept Map, drawn the way the Blue Book draws it: Concepts as blue sticky notes, Domains as pinned sheets of paper, Core Business Events as diamonds, and each Relationship a green curve carrying its verbs, one read from each end once the inverse verb is in. Drag to arrange, turn layers on and off, and click **Export SVG** to save the whole Map as one file |
| **Definitions** | The Definitions: every Concept's Definition in three parts, every Relationship as two sentences, every Core Business Event |
| **Instructions** | How to run a session, and questions to ask Claude |

The Steps tab lists the eleven steps, each with the question it asks, from identifying the Scope to walking the Map.

## Try It Online

**[Launch the Live Demo](https://agiledataguides.github.io/concept-model)**. No install required. The demo runs entirely in your browser. Your data is saved in localStorage and never leaves your device.

The demo opens on the *SaaS Revenue Concept Model*, which takes every step, so you can explore the app straight away.

## Install and Run Locally

For full functionality, including file-based storage and Claude Code integration, run it locally.

Run `./start-concept-model.sh` from the terminal.

The app starts at [http://localhost:5116](http://localhost:5116).

**Requires**: [Node.js](https://nodejs.org/) 20.19+, 22.12+, or 24+ (not 21 or 23).

## Features

- **Built for a live session**: put it on a shared screen, type a name, press Enter and keep going. Nothing has to be complete before you save
- **Every step reachable at any time**: each step shows how far it has got, and a step can be skipped on purpose, with a note on why
- **Concepts found in the stories**: read a Business Story beside the Concept list, and each new Concept remembers the story it came from and its Domain
- **Definitions in three parts**: the nature of the thing, real examples, and the special cases, each agreed or flagged
- **Relationship Rules in words**: "Each Customer places one or many Sales Orders." and "Each Sales Order is placed by one Customer." read aloud in both directions
- **Core Business Events** as who-does-what sentences, joined to the Concepts they involve
- **Walk the Map**: walk each story and Business Question across the Map, and record where it gets stuck and what you did about it
- **Parked list**: attributes for the DESIGN stage, things out of scope, questions for a future Map
- **Search and reorder**: the Domain, Concept and Event lists get a search field once they reach five, and you drag items by their grip into the order you want. The Map and the Definitions follow that order
- **Quiet hints** from the book's rules of thumb, such as ten to twenty Concepts. They never block you
- **Multiple models**: create, switch between, and delete models. Switching saves your changes first, and if that save fails the current model stays open
- **Export JSON / CSV / Excel**: JSON holds the whole model and can be imported again. The Excel workbook has a sheet for each part of the Model
- **Layers on the Map**: switches turn the Domains, Concepts, Relationships, Verbs and Events on and off, so one model draws the picture for each step of the book, from Concepts on their Domains (Step 4) to the full Map with its Events (Step 8). Nothing moves when a layer goes, and the app remembers your choice in this browser
- **Export SVG**: the whole Concept Map as one picture file, from any tab, with the layers the Map shows. The page is the same size whichever layers are on, so the pictures for each step line up. It is sharp at any size, has only the Map on a white page, and carries the handwritten font inside, so the handwriting looks the same in any browser, even on a computer without the font. Open it in a browser or put it in a slide or a document. Some slide and drawing tools ignore the font inside the file and use one of their own
- **Import JSON**: load a model as a new one, never over the current one. Files from before the eleven steps (version 1.0) still load

## Works With Claude

Save your model and open [Claude Code](https://claude.ai/claude-code) in this project. It reads the JSON in `data/`. One question per step:

- Step 1: *"Is this Scope an ocean or a puddle? Suggest a tighter boundary."*
- Step 2: *"Who else should we talk to for this slice of the organisation?"*
- Step 3: *"Read these stories. Which variations are missing?"*
- Step 4: *"Which nouns in the stories are Concepts, and which are information about a Concept?"*
- Step 5: *"Check each Definition for tautologies and for system words like table, flag or status code."*
- Step 6: *"Which Concepts have no Relationship yet? What verbs join them in real life?"*
- Step 7: *"Read each Relationship Rule aloud. Which ones look wrong for this organisation?"*
- Step 8: *"Which Core Business Events are missing, and which have nothing attached?"*
- Step 9: *"Which Concepts start the story, and which depend on others? Suggest how to arrange the Map."*
- Step 10: *"Suggest three to five Business Questions this Map should help answer."*
- Step 11: *"Walk each story across the Map. Where does it get stuck?"*

No Claude Code? Click **Export JSON** and attach the file in [Claude Chat](https://claude.ai).

## Data Storage

**Save** writes each model as JSON to the `data/` folder. This only works in dev mode (`npm run dev`) where the server can write to disk. Claude Code can then read these files directly. Unsaved changes are lost on reload, so save before you close the tab.

The model is **version 2.0** of the Concept Model JSON. A version 1.0 file loads and moves up to 2.0: a cardinality like `1 : 1..*` becomes a Relationship Rule, and anything that cannot be read without guessing shows in Step 7 as "To restate".

**Export** downloads files to your browser's downloads folder for sharing or backup.

**Demo mode** (the live demo on GitHub Pages): **Save** writes to your browser's localStorage instead of `data/`. Nothing is sent to any server. Your models persist between visits but are private to your browser.

## Security

This app is designed to run locally on your own machine. Do not expose it to the internet or deploy it on a public server. The Save feature writes files directly to your filesystem. There is no user authentication, so anyone who can reach the server can read and overwrite your data.

A model can name the people in a session. Use role titles if the file will be shared.

**Demo mode**: The [live demo](https://agiledataguides.github.io/concept-model) is a static site with no server or backend. All data stays in your browser's localStorage and never leaves your device. There is nothing to attack: no API, no database, no file system access.

If you need to share your work, use the **Export** buttons to download files and share them manually.

## Tech Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) with Svelte 5 runes
- [Tailwind CSS 4](https://tailwindcss.com/)
- TypeScript

## Licensing

- **Code**: [MIT](./LICENSE)
- **Documentation**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

The step names, questions and descriptions come from the Blue Book by Juha Korpela and Shane Gibson.
