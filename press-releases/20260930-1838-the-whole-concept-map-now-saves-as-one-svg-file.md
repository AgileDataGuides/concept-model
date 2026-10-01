# The Whole Concept Map Now Saves as One SVG File

**30 September 2026**

AgileDataGuides today released Export SVG for the Concept Model app, which saves the whole Concept Map as one picture file with its handwritten font inside it, so a team can take the Map out of the app and into a slide, a wiki page or a printed pack.

## The Problem

The Concept Map is the picture a team shows to people who were not in the room. Until now it lived only inside the app. To share it, a Facilitator took a screenshot. A screenshot caught only the part of the Map on screen at the current zoom, went blurry when it was made bigger, and carried the app's buttons and instruction line with it. A large Map needed several screenshots, and the handwritten look was lost the moment someone redrew the Map in a drawing tool.

## The Solution

A new Export SVG button sits in the toolbar, beside Export JSON, CSV and Excel. One click saves the whole Map as a single SVG file: every Domain sheet, sticky note, green curve and diamond, with space round the edges, on a white page. The file is sharp at any size, because SVG is drawn as lines and shapes, not pixels. It carries the Map's handwritten font inside it, so in a browser the notes and verbs look the same on a computer that has never had the font. Nothing from the screen comes along: no buttons, no instruction line, no zoom, and no highlight on the note that was clicked last.

## How It Works

Export SVG draws the Map again, out of sight, from the same model the Map tab shows, and saves that drawing. So the file always matches the Map on screen, with every note where it was placed, whichever tab is open when the button is pressed. The Domain names and the Event sentences use fonts that most computers already have, as they do in the app. The file takes its name from the model, like the other exports, and ends in `.svg`. Open it in any browser, or put it in a slide or a document. Some slide and drawing tools ignore a font carried inside an SVG and draw the names in a font of their own.

## Key Benefits

- **The whole Map, not the view**: nothing is cut off by the zoom or the size of the screen
- **Sharp at any size**: fit it on a slide or print it large, and it does not blur
- **The handwritten font travels with it**: any browser draws the notes and verbs from the font inside the file
- **Only the Map**: none of the app's buttons or hints come with it
- **From any tab**: export the Map while working in the Steps or the Definitions

Export SVG is available now in the Concept Model app in the Context Plane monorepo, and reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) with the next publish.
