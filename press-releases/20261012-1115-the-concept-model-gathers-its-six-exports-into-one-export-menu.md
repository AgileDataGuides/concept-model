# The Concept Model Gathers Its Six Exports Into One Export Menu

**12 October 2026**

AgileDataGuides today released an Export menu in the Concept Model app, so the toolbar gives its space back to the model's name and description, and every export format says what its file is for.

## The Problem

The Concept Model had grown six export buttons in one row: Export JSON, Export CSV, Export Excel, Export SVG, Export Turtle and Export RDF. Together they took most of the toolbar, and the model's name and description were squeezed into the space left over. The buttons also gave little help in choosing. Only SVG, Turtle and RDF explained themselves, in a tooltip that appeared when someone rested the pointer on the button, and most people never did. Nothing said what the CSV file or the Excel workbook holds.

## The Solution

The six buttons are now one **Export** button. It opens a menu with the formats in four groups: Model (JSON), Spreadsheet (CSV and Excel), Picture (SVG) and Standards (Turtle and RDF). Under each format is one line on what the file is for, such as "The whole Concept Map, with the layers the Map shows" for SVG. Choose a format and the file downloads, the same file as before.

## How It Works

Click Export to open the menu. Click anywhere else, or press Escape, to close it. From the keyboard, Arrow Down on the Export button opens the menu, and the arrow keys move through the formats. The Concept Model view in the Context Plane uses the same menu for its JSON, Turtle and RDF exports, so the app looks the same in both places. The Data Contract app uses the same menu too.

## Key Benefits

- **Room for the model**: the name and description get the toolbar back
- **The right file first time**: each format says what its file is for, without a hover
- **Formats in groups**: the model, spreadsheets, the picture and the standards each have their own heading
- **One look everywhere**: the standalone app and the Context Plane show the same menu

The Export menu is available now in the Concept Model app in the Context Plane monorepo, and it reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
